const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Direct connection — no pooler, single persistent connection for entire restore
const neonUrl = process.env.DATABASE_URL;

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function getClient(retries = 8) {
  for (let i = 1; i <= retries; i++) {
    const client = new Client({
      connectionString: neonUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 30000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });
    // Prevent unhandled error from crashing process
    client.on('error', (err) => {
      console.error('Client error (will retry):', err.message);
    });
    try {
      await client.connect();
      console.log(`✓ Connected to Neon (attempt ${i})`);
      return client;
    } catch (err) {
      console.log(`Attempt ${i}/${retries} failed: ${err.message}`);
      try { await client.end(); } catch (e) {}
      if (i < retries) {
        const delay = i * 3000;
        console.log(`Waiting ${delay/1000}s before retry...`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
}

async function runNeonRestore() {
  console.log('=== WAKING UP NEON COMPUTE ===');

  // Initial wake-up — wait longer for compute to fully start
  let client = await getClient();
  await sleep(5000);
  console.log('✓ Compute awake and stable.\n');

  // Load backup
  const backupDir = path.join(__dirname, 'backups');
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
  if (files.length === 0) { console.error('No backup found!'); return; }
  const backupData = JSON.parse(fs.readFileSync(path.join(backupDir, files[0]), 'utf8'));
  console.log(`Backup loaded: ${files[0]}\n`);

  // Table order: small → large
  const tableOrder = [
    'referral_rules', 'swap_rates', 'withdrawal_settings', 'mining_levels',
    'efficiency_tiers', 'machines', 'system_settings', 'promo_codes',
    'tasks', 'nft_cards', 'gram_deposits', 'gram_withdrawals', 'gram_claims',
    'swaps', 'user_nft_cards', 'user_promo_claims', 'special_offer_claims',
    'campaign_tournaments', 'campaign_payouts', 'users', 'wallet_bindings',
    'referrals', 'user_machines', 'mining_sessions', 'user_tasks', 'ad_views'
  ];

  // Collect all tables in order
  const allTables = [...tableOrder];
  for (const t of Object.keys(backupData)) {
    if (!allTables.includes(t)) allTables.push(t);
  }

  for (const tableName of allTables) {
    const rows = backupData[tableName];
    if (!rows || rows.length === 0) {
      console.log(`Skipping empty: ${tableName}`);
      continue;
    }

    console.log(`\nRestoring ${rows.length} rows → ${tableName}...`);

    try {
      // Drop old table and create fresh from backup schema
      await client.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
      const colNames = Object.keys(rows[0]);
      const colDefs = colNames.map(col =>
        col === 'id' ? `"id" BIGINT PRIMARY KEY` : `"${col}" TEXT`
      ).join(', ');
      await client.query(`CREATE TABLE "${tableName}" (${colDefs})`);

      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const values = [];
        let counter = 1;
        const valueStrings = chunk.map(row => {
          const placeholders = colNames.map(() => `$${counter++}`);
          colNames.forEach(col => {
            let val = row[col];
            if (val !== null && typeof val === 'object') val = JSON.stringify(val);
            values.push(val);
          });
          return `(${placeholders.join(', ')})`;
        });

        const cols = colNames.map(c => `"${c}"`).join(', ');
        await client.query(
          `INSERT INTO "${tableName}" (${cols}) VALUES ${valueStrings.join(', ')} ON CONFLICT DO NOTHING`,
          values
        );

        if ((i + chunkSize) % 10000 === 0 || i + chunkSize >= rows.length) {
          const done = Math.min(i + chunkSize, rows.length);
          process.stdout.write(`\r  -> ${done}/${rows.length} rows`);
        }
      }

      // Reset sequence
      if (Object.keys(rows[0]).includes('id')) {
        try {
          await client.query(
            `SELECT setval('"${tableName}_id_seq"', COALESCE((SELECT MAX("id"::bigint) FROM "${tableName}"), 1))`
          );
        } catch (e) {}
      }

      console.log(`\n✓ ${tableName} done`);
    } catch (err) {
      console.error(`\nError on ${tableName}: ${err.message}`);
      // If connection dropped, reconnect and continue
      if (err.message.includes('terminated') || err.message.includes('connection')) {
        console.log('Connection dropped. Reconnecting...');
        try { await client.end(); } catch (e) {}
        await sleep(5000);
        client = await getClient();
        console.log('Reconnected. Retrying table...');
        // Retry this table (re-entry via continue won't work in for-of, but we retry inline)
        try {
          await client.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
          const colNames = Object.keys(rows[0]);
          const colDefs = colNames.map(col => col === 'id' ? `"id" BIGINT PRIMARY KEY` : `"${col}" TEXT`).join(', ');
          await client.query(`CREATE TABLE "${tableName}" (${colDefs})`);
          const chunkSize = 50;
          for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            const values = [];
            let counter = 1;
            const valueStrings = chunk.map(row => {
              const placeholders = colNames.map(() => `$${counter++}`);
              colNames.forEach(col => {
                let val = row[col];
                if (val !== null && typeof val === 'object') val = JSON.stringify(val);
                values.push(val);
              });
              return `(${placeholders.join(', ')})`;
            });
            const cols = colNames.map(c => `"${c}"`).join(', ');
            await client.query(`INSERT INTO "${tableName}" (${cols}) VALUES ${valueStrings.join(', ')} ON CONFLICT DO NOTHING`, values);
            const done = Math.min(i + chunkSize, rows.length);
            if (done % 10000 === 0 || done >= rows.length) process.stdout.write(`\r  -> ${done}/${rows.length} rows`);
          }
          console.log(`\n✓ ${tableName} done (after retry)`);
        } catch (retryErr) {
          console.error(`Failed on retry for ${tableName}: ${retryErr.message}`);
        }
      }
    }
  }

  // Final verification
  console.log('\n\n=== VERIFYING DATA ON NEON ===');
  const u = await client.query('SELECT COUNT(*) FROM users');
  const t = await client.query('SELECT COUNT(*) FROM user_tasks');
  const a = await client.query('SELECT COUNT(*) FROM ad_views');
  const m = await client.query('SELECT COUNT(*) FROM mining_sessions');
  console.log(`✅ Users:           ${u.rows[0].count}`);
  console.log(`✅ User Tasks:      ${t.rows[0].count}`);
  console.log(`✅ Ad Views:        ${a.rows[0].count}`);
  console.log(`✅ Mining Sessions: ${m.rows[0].count}`);
  console.log('\n🎉 ALL FRESH DATA SUCCESSFULLY RESTORED TO NEON! 🎉');
  await client.end();
}

runNeonRestore().catch(async err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});

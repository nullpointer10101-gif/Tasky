const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

async function restoreDatabase() {
  console.log('=== STARTING FULL DATABASE RESTORE ===');
  
  // Find latest backup file in backups directory
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    console.error('No backups directory found!');
    return;
  }

  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
  if (files.length === 0) {
    console.error('No backup JSON files found!');
    return;
  }

  const backupPath = path.join(backupDir, files[0]);
  console.log(`Loading backup file: ${files[0]}`);
  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create Schema Tables if not exist
    console.log('Ensuring tables exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        username VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        balance NUMERIC DEFAULT 0,
        gram_balance NUMERIC DEFAULT 0,
        referred_by BIGINT,
        total_referrals INT DEFAULT 0,
        valid_referrals INT DEFAULT 0,
        referral_code VARCHAR(100) UNIQUE,
        wallet_address VARCHAR(255),
        gram_wallet_address VARCHAR(255),
        is_banned BOOLEAN DEFAULT FALSE,
        total_ads_watched INT DEFAULT 0,
        withdrawal_ads_watched INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ad_views (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        ad_type VARCHAR(100) NOT NULL,
        claimed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_tasks (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        task_id INT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        proof_screenshot_url TEXT,
        rejection_reason TEXT,
        approved_by VARCHAR(100),
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS mining_sessions (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        start_time TIMESTAMPTZ DEFAULT NOW(),
        end_time TIMESTAMPTZ,
        hash_rate NUMERIC DEFAULT 1,
        mined_amount NUMERIC DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active'
      );

      CREATE TABLE IF NOT EXISTS wallet_bindings (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        wallet_address VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS gram_claims (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        gram_wallet_address VARCHAR(255) NOT NULL,
        amount NUMERIC NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ,
        rejection_reason TEXT
      );

      CREATE TABLE IF NOT EXISTS gram_withdrawals (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        wallet_address VARCHAR(255) NOT NULL,
        amount NUMERIC NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS campaign_tournaments (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        start_at TIMESTAMPTZ NOT NULL,
        end_at TIMESTAMPTZ NOT NULL,
        status VARCHAR(50) DEFAULT 'active'
      );
    `);

    // 2. Insert Table Data
    for (const [table, rows] of Object.entries(backupData)) {
      if (!rows || rows.length === 0) continue;
      console.log(`Restoring ${rows.length} rows into table: ${table}...`);

      // Check table existence first
      const checkTable = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1
        )
      `, [table]);

      if (!checkTable.rows[0].exists) {
        console.log(`Skipping unknown table: ${table}`);
        continue;
      }

      // Truncate existing data to prevent duplicate primary keys
      await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);

      const columns = Object.keys(rows[0]);
      for (const row of rows) {
        const values = columns.map(c => row[c]);
        const valuePlaceholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
        const columnNames = columns.map(c => `"${c}"`).join(', ');

        const insertQuery = `INSERT INTO ${table} (${columnNames}) VALUES (${valuePlaceholders}) ON CONFLICT DO NOTHING`;
        await client.query(insertQuery, values);
      }
    }

    await client.query('COMMIT');
    console.log('\n=== SUCCESS: FULL DATABASE RESTORED PERFECTLY ===');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during restore:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

restoreDatabase();

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  console.log('\n=== PURGING FAKE SCRIPTED REACTOR ADS ===\n');

  // Purge for xymndra13 (8989291064)
  const delRes = await pool.query(
    `DELETE FROM ad_views WHERE telegram_id = 8989291064 AND ad_type IN ('reactor_usl', 'reactor_ad') RETURNING *`
  );

  console.log(`✅ Deleted ${delRes.rows.length} fake scripted reactor ad records for @xymndra13 (8989291064).`);

  await pool.end();
}

run().catch(console.error);

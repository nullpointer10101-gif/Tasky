require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  console.log('\n=== AUDITING ALL REACTOR AD VIEWS IN DB ===\n');

  const res = await pool.query(
    `SELECT telegram_id, COUNT(*) as ad_count, MIN(created_at) as first_ad, MAX(created_at) as last_ad
     FROM ad_views
     WHERE ad_type IN ('reactor_usl', 'reactor_ad')
     GROUP BY telegram_id
     ORDER BY ad_count DESC`
  );

  console.table(res.rows);

  // Also check if any users submitted reactor_claims
  const claimsRes = await pool.query(`SELECT * FROM reactor_claims ORDER BY id DESC`);
  console.log('\n⚡ ALL REACTOR CLAIMS IN DB:');
  console.table(claimsRes.rows);

  await pool.end();
}

run().catch(console.error);

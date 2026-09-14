require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  console.log('\n=== AUDITING USER: Pixlands Milo ===\n');

  const res = await pool.query(
    `SELECT id, telegram_id, first_name, username, created_at, balance 
     FROM users 
     WHERE LOWER(first_name) LIKE '%milo%' OR LOWER(first_name) LIKE '%pixlands%' OR LOWER(username) LIKE '%milo%'`
  );

  console.log('User Profile:');
  console.table(res.rows);

  if (res.rows.length > 0) {
    const tid = res.rows[0].telegram_id;
    const adsRes = await pool.query(
      `SELECT ad_type, COUNT(*) as count FROM ad_views WHERE telegram_id = $1 GROUP BY ad_type`,
      [tid]
    );
    console.log('\nAd Views Breakdown:');
    console.table(adsRes.rows);
  }

  await pool.end();
}

run().catch(console.error);

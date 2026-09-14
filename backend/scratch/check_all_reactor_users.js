require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  console.log('\n=== CHECKING ALL USERS REACTOR AD VIEWS IN DB ===\n');

  const res = await pool.query(
    `SELECT telegram_id, COUNT(*) as count, MIN(created_at) as first_ad, MAX(created_at) as last_ad
     FROM ad_views
     WHERE ad_type IN ('reactor_usl', 'reactor_ad')
     GROUP BY telegram_id
     ORDER BY count DESC
     LIMIT 20`
  );

  console.log('Top 20 users by reactor ad count in DB:');
  console.table(res.rows);

  const totalUsersRes = await pool.query(
    `SELECT COUNT(DISTINCT telegram_id) as total_users, COUNT(*) as total_reactor_ads
     FROM ad_views
     WHERE ad_type IN ('reactor_usl', 'reactor_ad')`
  );
  console.log('\nTotal Users with Reactor Ads:', totalUsersRes.rows[0].total_users);
  console.log('Total Reactor Ads in DB:', totalUsersRes.rows[0].total_reactor_ads);

  await pool.end();
}

run().catch(console.error);

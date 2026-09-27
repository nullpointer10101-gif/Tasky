const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const users = await pool.query("SELECT id, telegram_id, username, first_name, is_banned, total_ads_watched, created_at FROM users WHERE username ILIKE '%vinkey%' OR username ILIKE '%giabao%' OR username ILIKE '%ba_noi%'");
  console.log('Matching Users:');
  console.table(users.rows);

  const tournaments = await pool.query("SELECT * FROM campaign_tournaments ORDER BY id DESC");
  console.log('All Tournaments in DB:');
  console.table(tournaments.rows);

  const topAdUsersAllTime = await pool.query(`
    SELECT u.username, u.telegram_id, u.is_banned, COUNT(a.id) as cnt 
    FROM ad_views a 
    JOIN users u ON u.telegram_id::text = a.telegram_id::text 
    GROUP BY u.username, u.telegram_id, u.is_banned 
    ORDER BY cnt DESC 
    LIMIT 15
  `);
  console.log('Top all-time ad views in DB:');
  console.table(topAdUsersAllTime.rows);

  await pool.end();
}
check();

const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkUser(tid) {
  try {
    const userRes = await pool.query(
      'SELECT * FROM users WHERE telegram_id::text = $1',
      [tid]
    );
    console.log('--- USER PROFILE ---');
    console.log(userRes.rows[0]);

    const adViewsRes = await pool.query(
      'SELECT COUNT(*) as total_ads, MIN(created_at) as first_ad, MAX(created_at) as last_ad FROM ad_views WHERE telegram_id::text = $1',
      [tid]
    );
    console.log('--- AD STATS ---');
    console.log(adViewsRes.rows[0]);

    const sampleAds = await pool.query(
      'SELECT id, ad_type, created_at FROM ad_views WHERE telegram_id::text = $1 ORDER BY created_at ASC LIMIT 10',
      [tid]
    );
    console.log('--- FIRST 10 AD TIMESTAMPS ---');
    console.log(sampleAds.rows);

    const burstAds = await pool.query(
      'SELECT created_at, COUNT(*) FROM ad_views WHERE telegram_id::text = $1 GROUP BY created_at HAVING COUNT(*) > 1 ORDER BY COUNT(*) DESC LIMIT 10',
      [tid]
    );
    console.log('--- SAME-SECOND BURST AD VIEWS ---');
    console.log(burstAds.rows);

    await pool.end();
  } catch(e) {
    console.error(e);
  }
}

checkUser('8932907056');

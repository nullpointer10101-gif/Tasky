const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_hdzlyY4E8Dmu@ep-floral-block-ao1exyu8.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function checkNeon() {
  console.log('--- Connecting to Neon Database ---');
  try {
    const tourney = await neonPool.query("SELECT * FROM campaign_tournaments WHERE status = 'active' ORDER BY id DESC LIMIT 1");
    console.log('Tournament in Neon:', tourney.rows[0]);

    const users = await neonPool.query(`
      SELECT 
        u.telegram_id, u.username, u.first_name, u.is_banned, count(a.id) as ads_watched
      FROM ad_views a
      JOIN users u ON u.telegram_id::text = a.telegram_id::text
      GROUP BY u.telegram_id, u.username, u.first_name, u.is_banned
      ORDER BY ads_watched DESC
      LIMIT 15
    `);
    console.log('Top Users in Neon:');
    console.table(users.rows);
  } catch (err) {
    console.error('Error in Neon check:', err);
  } finally {
    await neonPool.end();
  }
}

checkNeon();

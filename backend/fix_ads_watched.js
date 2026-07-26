const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    console.log('Backfilling withdrawal_ads_watched...');
    
    // Find how many auto_ad tasks each user has completed and approved
    // Tasks with verification_type = 'auto_ad'
    
    const query = `
      UPDATE users u
      SET withdrawal_ads_watched = COALESCE(u.withdrawal_ads_watched, 0) + ad_counts.count
      FROM (
        SELECT ut.telegram_id, COUNT(*) as count
        FROM user_tasks ut
        JOIN tasks t ON ut.task_id = t.id
        WHERE t.verification_type = 'auto_ad' AND ut.status = 'approved'
        GROUP BY ut.telegram_id
      ) as ad_counts
      WHERE u.telegram_id = ad_counts.telegram_id;
    `;
    
    const res = await pool.query(query);
    console.log(`Updated ${res.rowCount} users with their correct ad watch counts.`);
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();

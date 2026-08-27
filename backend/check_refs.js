const { pool } = require('./db');
async function run() {
  try {
    const r = await pool.query(`
      SELECT r.referred_telegram_id, 
      (SELECT COUNT(*) FROM user_tasks ut WHERE ut.telegram_id = r.referred_telegram_id AND ut.status = 'approved') as completed_tasks 
      FROM referrals r 
      WHERE r.reward_paid = FALSE 
      AND (SELECT COUNT(*) FROM user_tasks ut WHERE ut.telegram_id = r.referred_telegram_id AND ut.status = 'approved') >= 3
    `);
    console.log(r.rows);
  } catch (e) { console.error(e); } finally { pool.end(); }
}
run();

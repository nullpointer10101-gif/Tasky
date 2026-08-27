const { pool } = require('./db');
async function run() {
  try {
    // Check data types
    const r1 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('telegram_id', 'referred_by')");
    console.log('users table:', r1.rows);
    
    const r2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'referrals'");
    console.log('referrals table:', r2.rows);
    
    // Check if the join would work for an unpaid referral
    const r3 = await pool.query(`
      SELECT r.id, r.referrer_telegram_id, r.referred_telegram_id, r.reward_paid,
             u.referred_by
      FROM referrals r
      JOIN users u ON r.referred_telegram_id::text = u.telegram_id
      WHERE r.reward_paid = FALSE LIMIT 5
    `);
    console.log('join test:', r3.rows);
    
    // test the exact query that runs in tasks.js
    const r4 = await pool.query(`
      UPDATE referrals SET reward_paid = TRUE 
      WHERE referrer_telegram_id = $1 AND referred_telegram_id = $2 AND reward_paid = FALSE 
      RETURNING *
    `, ['7503089268', '8476357541']);
    console.log('update test result (rowCount):', r4.rowCount, r4.rows);
  } catch(e) { console.error(e); } finally { pool.end(); }
}
run();

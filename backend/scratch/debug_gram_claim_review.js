require('dotenv').config();
const { pool } = require('../db');

async function checkPendingClaim() {
  try {
    const u = await pool.query("SELECT * FROM users WHERE username ILIKE '%Legendboy%'");
    console.log('User found:', u.rows);
    if (u.rows.length > 0) {
      const tid = u.rows[0].telegram_id;
      const gc = await pool.query('SELECT * FROM gram_claims WHERE telegram_id = $1 ORDER BY id DESC', [tid]);
      console.log('gram_claims for user:', gc.rows);
      try {
        const gcw = await pool.query('SELECT * FROM gram_currency_withdrawals WHERE telegram_id = $1 ORDER BY id DESC', [tid]);
        console.log('gram_currency_withdrawals for user:', gcw.rows);
      } catch (e) {
        console.log('gram_currency_withdrawals table error:', e.message);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}
checkPendingClaim();

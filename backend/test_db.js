const { pool } = require('./db');
async function run() {
  try {
    await pool.query("UPDATE users SET wallet_address = 'EQmockwallet', onchain_tasky_balance = 5000 WHERE telegram_id = 987654321");
    console.log('Updated user wallet and balance');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();

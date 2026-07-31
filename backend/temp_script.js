require('dotenv').config();
const { pool } = require('./db.js');
async function run() {
  try {
    await pool.query("DELETE FROM swap_rates WHERE token_name = 'DOGS'");
    await pool.query("DELETE FROM swap_rates WHERE token_name = 'USDT'");
    await pool.query("INSERT INTO swap_rates (token_name, tasky_per_unit, min_tasky, is_active) VALUES ('USDT', 20000, 3000, true)");
    console.log('Database updated successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();

const { pool } = require('./db.js');
async function run() {
    await pool.query("UPDATE swap_rates SET chain = 'BSC' WHERE token_name = 'USDT'");
    await pool.query("UPDATE swaps SET chain = 'BSC' WHERE receive_token = 'USDT'");
    process.exit();
}
run();

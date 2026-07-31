const { pool } = require('./db');

async function run() {
    try {
        const user = await pool.query("SELECT * FROM users WHERE telegram_id = '5738897062'");
        console.log('User:', user.rows[0]);
        const w = await pool.query("SELECT * FROM withdrawals WHERE telegram_id = '5738897062'");
        console.log('Withdrawals:', w.rows);
        const s = await pool.query('SELECT * FROM withdrawal_settings LIMIT 1');
        console.log('Settings:', s.rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();

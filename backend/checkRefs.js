const { pool } = require('./db');
async function test() {
    const user = await pool.query('SELECT referral_code FROM users WHERE telegram_id = $1', ['1117992896']);
    console.log(user.rows[0]);
    pool.end();
}
test();

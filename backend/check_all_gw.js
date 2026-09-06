require('dotenv').config();
const { pool } = require('./db.js');

async function checkAllGw() {
    const res = await pool.query(`SELECT id, telegram_id, amount, status, requested_at FROM gram_withdrawals ORDER BY id ASC`);
    console.table(res.rows);
    await pool.end();
}

checkAllGw();

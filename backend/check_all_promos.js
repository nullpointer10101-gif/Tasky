require('dotenv').config();
const { pool } = require('./db.js');

async function checkAllPromoCodes() {
    const res = await pool.query(`SELECT * FROM promo_codes`);
    console.table(res.rows);
    await pool.end();
}

checkAllPromoCodes();

require('dotenv').config();
const { pool } = require('./db.js');

async function updateRate() {
    await pool.query("UPDATE swap_rates SET tasky_per_unit = 1 WHERE token_name = 'DOGS'");
    console.log('Updated DOGS rate to 1');
    process.exit(0);
}

updateRate();

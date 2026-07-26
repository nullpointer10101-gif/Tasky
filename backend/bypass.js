const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query("UPDATE users SET withdrawal_ads_watched = 50, balance = balance + 1000 WHERE telegram_id = 6909180225 RETURNING *");
    console.log('User updated:', res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();

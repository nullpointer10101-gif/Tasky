require('dotenv').config();
const { pool } = require('./db');

async function run() {
  const res = await pool.query("SELECT * FROM tasks WHERE verification_type = 'gram_ad'");
  console.log(res.rows[0]);
  await pool.end();
}
run();

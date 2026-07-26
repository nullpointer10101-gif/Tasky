const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query(
      `UPDATE tasks SET verification_type = 'timer_10s' WHERE title = 'Say GM in Community' RETURNING *`
    );
    console.log('Task updated:', res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    await pool.query(
      `UPDATE tasks SET action_url = 'https://t.me/TaskyOfficialCommunity' WHERE title = 'Say GM in Community'`
    );
    console.log('Task updated');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();

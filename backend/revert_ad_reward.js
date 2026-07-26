const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query("UPDATE tasks SET reward_tasky = 30 WHERE title = 'Watch an Ad'");
    console.log(`Updated ${res.rowCount} tasks back to 30 TASKY`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();

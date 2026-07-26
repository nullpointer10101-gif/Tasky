const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const subtitle = "Watch a quick 15-second ad to earn TASKY.";
    const res = await pool.query("UPDATE tasks SET subtitle = $1 WHERE verification_type = 'auto_ad'", [subtitle]);
    console.log(`Reverted ${res.rowCount} tasks with new subtitle: ${subtitle}`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();

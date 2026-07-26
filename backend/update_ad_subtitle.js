const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const subtitle = "Watch the ad for 15s AND click on it! No click = No Reward.";
    const res = await pool.query("UPDATE tasks SET subtitle = $1 WHERE verification_type = 'auto_ad'", [subtitle]);
    console.log(`Updated ${res.rowCount} tasks with new subtitle: ${subtitle}`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();

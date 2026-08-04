const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query(
      "UPDATE tasks SET action_url = 'https://t.me/GramMiner1_Bot?start=8823265955' WHERE id = 24 OR title = 'Launch GramMiner Bot' RETURNING id, title, action_url, category, is_active"
    );
    console.log('Successfully updated GramMiner task referral link:', res.rows);
  } catch (e) {
    console.error('Error updating task:', e);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();

const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query(`
      INSERT INTO tasks 
      (title, subtitle, type, reward_tasky, action_url, is_active, is_featured, verification_type, icon) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      'Join SleepyMineNews', 
      'Join the SleepyMineNews channel to earn Tasky!', 
      'once', 
      30, 
      'https://t.me/SleepyMineNews', 
      true, 
      true, 
      'timer_10s', 
      'Telegram'
    ]);
    console.log('Task added successfully!');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();

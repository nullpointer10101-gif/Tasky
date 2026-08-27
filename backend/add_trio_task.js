const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function addTask() {
  try {
    await pool.query(`
      INSERT INTO tasks 
      (title, subtitle, type, reward_tasky, action_url, is_active, is_featured, verification_type, icon, category) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      'Start TRIONetworkdrop Bot', 
      'Start the TRIONetworkdrop bot to earn Tasky!', 
      'once', 
      30, 
      'https://t.me/TRIONetworkdrop_bot', 
      true, 
      true, 
      'timer_10s', 
      'Telegram',
      'partner'
    ]);
    console.log('Task added successfully!');
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
addTask();

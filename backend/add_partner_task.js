const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    // Make sure column exists first
    await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS admin_only BOOLEAN DEFAULT FALSE;');

    await pool.query(`
      INSERT INTO tasks 
      (title, subtitle, type, reward_tasky, action_url, is_active, is_featured, verification_type, icon, admin_only) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      'Join CryptoTradingMasterX', 
      'Join our 1st partner channel to earn Tasky!', 
      'once', 
      30, 
      'https://t.me/CryptoTradingMasterX', 
      true, 
      true, 
      'timer_10s', 
      'Telegram',
      true
    ]);
    console.log('Task added successfully!');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();

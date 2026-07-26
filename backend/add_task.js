const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query("UPDATE tasks SET is_active = false WHERE title = 'React to our Latest Post!'");
    
    await pool.query(`
      INSERT INTO tasks 
      (title, subtitle, type, reward_tasky, action_url, is_active, is_featured, verification_type, icon) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      'React to our Latest Post!', 
      'Go to our channel, react to the post, and claim your reward!', 
      'daily', 
      30, 
      'https://t.me/Tasky_Official/latest', 
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

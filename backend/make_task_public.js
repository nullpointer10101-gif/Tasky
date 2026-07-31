require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    // Update the task to be visible to all users
    await pool.query("UPDATE tasks SET admin_only = false WHERE title = 'Join CryptoTradingMasterX'");
    
    console.log('Task is now visible to all users!');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();

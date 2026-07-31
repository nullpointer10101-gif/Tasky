require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    // Add category column if it doesn't exist
    await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'internal';");
    
    // Update the task to partner category
    await pool.query("UPDATE tasks SET category = 'partner' WHERE title = 'Join CryptoTradingMasterX'");
    
    console.log('Task updated to partner promo successfully!');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();

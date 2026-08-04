const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query(`
      UPDATE tasks 
      SET is_active = false 
      WHERE id IN (20, 22) OR title IN ('Join CryptoTradingMasterX', 'Join CryptoXMaster')
      RETURNING id, title, is_active, category
    `);
    
    console.log('Removed/Deactivated tasks from promotion section:', res.rows);
  } catch (e) {
    console.error('Error deactivating tasks:', e);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();

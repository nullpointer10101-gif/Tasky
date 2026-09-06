require('dotenv').config();
const { pool } = require('../db');

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_audience VARCHAR(50) DEFAULT 'all';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_user_ids TEXT;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS new_user_days INT DEFAULT 7;
    `);
    console.log('✅ Tasks table successfully updated with target_audience, target_user_ids, and new_user_days columns!');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    process.exit(0);
  }
}
migrate();

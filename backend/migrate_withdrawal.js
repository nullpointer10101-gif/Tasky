const { pool } = require('./db.js');
async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE withdrawal_settings 
      ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS unlock_message TEXT DEFAULT 'Withdrawals unlock when TASKY launches on-chain',
      ADD COLUMN IF NOT EXISTS target_users_milestone INT
    `);
    console.log('Migration done');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
migrate();

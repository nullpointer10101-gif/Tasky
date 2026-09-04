require('dotenv').config({ path: './backend/.env' });
const { pool } = require('./backend/db');

(async () => {
  try {
    console.log('Running database migration for team commission claim system...');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS unclaimed_commission NUMERIC(14, 4) DEFAULT 0.0000;');
    console.log('Added unclaimed_commission column to users table.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS nft_commission_claims (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        amount_gram NUMERIC(14, 4) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        wallet_address TEXT,
        requested_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP
      );
    `);
    console.log('Created nft_commission_claims table successfully.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    process.exit();
  }
})();

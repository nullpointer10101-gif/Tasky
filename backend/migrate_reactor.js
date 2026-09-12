const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool } = require('./db');

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reactor_claims (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        total_ads_watched INT NOT NULL DEFAULT 0,
        stage_reached INT NOT NULL DEFAULT 1,
        reward_usdt NUMERIC(10, 2) DEFAULT 1.00,
        reward_grams NUMERIC(10, 4) DEFAULT 5.0000,
        reward_tasky BIGINT DEFAULT 100000,
        wallet_address VARCHAR(150),
        status VARCHAR(20) DEFAULT 'pending',
        claimed_at TIMESTAMPTZ DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        reviewed_by VARCHAR(100),
        payout_tx_hash VARCHAR(200),
        rejection_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_reactor_claims_status ON reactor_claims(status);
      CREATE INDEX IF NOT EXISTS idx_reactor_claims_telegram_id ON reactor_claims(telegram_id);
    `);
    console.log('✅ reactor_claims table migrated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();

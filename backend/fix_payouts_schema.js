const { pool } = require('./db');
require('dotenv').config();

async function fixCampaignPayoutsTable() {
  console.log('--- Ensuring campaign_payouts table structure ---');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaign_payouts (
      id SERIAL PRIMARY KEY,
      tournament_id INT,
      telegram_id VARCHAR(100),
      rank INT,
      gram_amount NUMERIC(10, 4) DEFAULT 0,
      tasky_amount BIGINT DEFAULT 0,
      wallet_address VARCHAR(255),
      tx_hash VARCHAR(255),
      status VARCHAR(50) DEFAULT 'pending',
      paid_at TIMESTAMPTZ,
      approved_by VARCHAR(100),
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (tournament_id, telegram_id)
    );
    ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS gram_amount NUMERIC(10, 4) DEFAULT 0;
    ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS tasky_amount BIGINT DEFAULT 0;
    ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS rank INT;
    ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(255);
    ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(255);
    ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
    ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
    ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);
    ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
  `);

  console.log('✅ campaign_payouts table schema verified and updated successfully!');
  await pool.end();
}

fixCampaignPayoutsTable().catch(console.error);

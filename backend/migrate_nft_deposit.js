require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  console.log('Starting NFT & Deposit migration...');

  // 1. Table: nft_cards
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nft_cards (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price_gram NUMERIC NOT NULL,
      daily_yield_gram NUMERIC NOT NULL,
      duration_days INT NOT NULL DEFAULT 10,
      total_yield_gram NUMERIC NOT NULL,
      rarity VARCHAR(50) DEFAULT 'common',
      icon_key VARCHAR(100) DEFAULT 'bolt',
      max_supply INT DEFAULT 1000,
      sold_count INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Insert or update 2 NFT Cards
  await pool.query(`
    INSERT INTO nft_cards (id, name, description, price_gram, daily_yield_gram, duration_days, total_yield_gram, rarity, icon_key, max_supply, is_active)
    VALUES 
      (1, 'Gram Mini Miner #01', 'Entry-level digital miner. Earn 0.07 GRAM daily for 10 days.', 0.5, 0.07, 10, 0.70, 'rare', 'bolt', 1000, true),
      (2, 'Gram Turbo Miner #02', 'High-speed digital miner. Earn 0.15 GRAM daily for 10 days.', 1.0, 0.15, 10, 1.5, 'legendary', 'rocket', 1000, true)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      price_gram = EXCLUDED.price_gram,
      daily_yield_gram = EXCLUDED.daily_yield_gram,
      duration_days = EXCLUDED.duration_days,
      total_yield_gram = EXCLUDED.total_yield_gram,
      rarity = EXCLUDED.rarity,
      icon_key = EXCLUDED.icon_key,
      is_active = EXCLUDED.is_active;
  `);

  // 2. Table: user_nft_cards
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_nft_cards (
      id SERIAL PRIMARY KEY,
      telegram_id BIGINT NOT NULL,
      nft_id INT NOT NULL REFERENCES nft_cards(id),
      purchased_at TIMESTAMP DEFAULT NOW(),
      last_claimed_at TIMESTAMP,
      claims_done INT DEFAULT 0,
      total_earned_gram NUMERIC DEFAULT 0,
      is_completed BOOLEAN DEFAULT FALSE
    );
  `);

  // 3. Table: gram_deposits
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gram_deposits (
      id SERIAL PRIMARY KEY,
      telegram_id BIGINT NOT NULL,
      amount_gram NUMERIC NOT NULL,
      tx_hash VARCHAR(255) UNIQUE NOT NULL,
      auto_verified BOOLEAN DEFAULT TRUE,
      status VARCHAR(50) DEFAULT 'approved',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('✅ NFT & Deposit Migration Completed Successfully!');
  await pool.end();
  process.exit(0);
}

migrate().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});

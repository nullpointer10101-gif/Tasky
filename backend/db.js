const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB Pool] Idle client warning (auto-recovering):', err.message);
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const initScript = `
      -- ORIGINAL TABLES --
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        username VARCHAR(64),
        first_name VARCHAR(64),
        referral_code VARCHAR(20) UNIQUE,
        referred_by BIGINT,
        total_referrals INT DEFAULT 0,
        balance NUMERIC DEFAULT 0,
        streak_days INT DEFAULT 0,
        last_checkin TIMESTAMPTZ,
        genesis_member BOOLEAN DEFAULT FALSE,
        is_banned BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS valid_referrals INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS spins_available INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS spins_used_today INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_spin_date DATE;
      ALTER TABLE users DROP COLUMN IF EXISTS notify_dogs_unlock;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_usdt_unlock BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS onchain_tasky_balance NUMERIC DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mining_level INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS efficiency_percent NUMERIC DEFAULT 100;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS holding_stable_since TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_known_balance NUMERIC DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_ads_watched INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS has_unseen_approved_withdrawal BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_popup_views INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS total_ads_watched INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS special_offer_seen_at TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS gram_wallet_address VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS referrals_paused BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS has_verified_channels BOOLEAN DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS gram_claims (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
        gram_wallet_address VARCHAR(100) NOT NULL,
        amount NUMERIC DEFAULT 0.02,
        status VARCHAR(20) DEFAULT 'pending',
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ,
        rejection_reason TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_gram_claims_telegram_id ON gram_claims(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_gram_claims_status ON gram_claims(status);

      CREATE TABLE IF NOT EXISTS special_offer_claims (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        offer_id VARCHAR(50) NOT NULL DEFAULT 'invite_20_get_20k',
        status VARCHAR(20) DEFAULT 'pending',
        valid_referrals_at_claim INT DEFAULT 0,
        seen_at TIMESTAMPTZ DEFAULT NOW(),
        claimed_at TIMESTAMPTZ,
        reviewed_at TIMESTAMPTZ,
        rejection_reason TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_special_offer_claims_status ON special_offer_claims(status);

      CREATE TABLE IF NOT EXISTS ad_views (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT,
        ad_type VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ad_views_telegram_id ON ad_views(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_ad_views_created_at ON ad_views(created_at);

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200),
        subtitle VARCHAR(200),
        type VARCHAR(20),
        reward_tasky NUMERIC,
        action_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        is_featured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS pending_broadcasts (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE tasks DROP COLUMN IF EXISTS proof_required;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS verification_type VARCHAR(20) DEFAULT 'proof_screenshot';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'Default';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(100);
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS x_subtype VARCHAR(20);
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS admin_only BOOLEAN DEFAULT FALSE;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'internal';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_audience VARCHAR(50) DEFAULT 'all';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_user_ids TEXT;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS new_user_days INT DEFAULT 7;

      CREATE TABLE IF NOT EXISTS user_tasks (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT,
        task_id INT REFERENCES tasks(id),
        completed_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE user_tasks ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
      ALTER TABLE user_tasks ADD COLUMN IF NOT EXISTS proof_screenshot_url TEXT;
      ALTER TABLE user_tasks ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE user_tasks ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
      ALTER TABLE user_tasks ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        referrer_telegram_id BIGINT,
        referred_telegram_id BIGINT,
        reward_paid BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reward_paid BOOLEAN DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS swaps (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT,
        tasky_amount NUMERIC,
        receive_token VARCHAR(10),
        receive_amount NUMERIC,
        wallet_address VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        tx_hash VARCHAR(100),
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ
      );

      ALTER TABLE swaps ADD COLUMN IF NOT EXISTS fee_percent NUMERIC DEFAULT 2;
      ALTER TABLE swaps ADD COLUMN IF NOT EXISTS chain VARCHAR(20) DEFAULT 'TON';
      ALTER TABLE swaps ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

      DROP TABLE IF EXISTS swap_rates CASCADE;
      CREATE TABLE IF NOT EXISTS swap_rates (
        id SERIAL PRIMARY KEY,
        token_name VARCHAR(10),
        tasky_per_unit NUMERIC,
        min_tasky NUMERIC,
        is_active BOOLEAN DEFAULT TRUE,
        chain VARCHAR(20) DEFAULT 'TON',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS referral_rules (
        id SERIAL PRIMARY KEY,
        reward_per_referral NUMERIC DEFAULT 200,
        tasks_required_for_valid INT DEFAULT 3,
        spin_reward_per_referral INT DEFAULT 1
      );

      ALTER TABLE referral_rules ADD COLUMN IF NOT EXISTS spin_reward_per_referral INT DEFAULT 1;

      INSERT INTO referral_rules (reward_per_referral, tasks_required_for_valid, spin_reward_per_referral)
      SELECT 200, 3, 1
      WHERE NOT EXISTS (SELECT 1 FROM referral_rules);

      CREATE TABLE IF NOT EXISTS withdrawal_settings (
        id SERIAL PRIMARY KEY,
        min_withdrawal_tasky NUMERIC DEFAULT 2250,
        fee_percent NUMERIC DEFAULT 35,
        usdt_rate NUMERIC DEFAULT 0.00003,
        is_locked BOOLEAN DEFAULT TRUE,
        unlock_message TEXT DEFAULT 'Withdrawals unlock when TASKY launches on-chain',
        target_users_milestone INT
      );

      INSERT INTO withdrawal_settings (min_withdrawal_tasky, fee_percent, usdt_rate, is_locked, unlock_message, target_users_milestone)
      SELECT 1000, 35, 0.00003, TRUE, 'Withdrawals unlock when TASKY launches on-chain', 500000
      WHERE NOT EXISTS (SELECT 1 FROM withdrawal_settings);

      CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT,
        tasky_amount NUMERIC,
        fee_amount NUMERIC,
        usdt_amount NUMERIC,
        wallet_address VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        rejection_reason TEXT,
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(50) PRIMARY KEY,
        value JSONB
      );

      INSERT INTO system_settings (key, value)
      VALUES ('maintenance', '{"active": false}')
      ON CONFLICT (key) DO NOTHING;

      CREATE TABLE IF NOT EXISTS wallet_bindings (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(100) UNIQUE NOT NULL,
        telegram_id BIGINT UNIQUE NOT NULL,
        bound_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS mining_sessions (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT,
        wallet_address VARCHAR(100),
        started_at TIMESTAMPTZ DEFAULT NOW(),
        session_duration_hours INT DEFAULT 4,
        expected_claim_at TIMESTAMPTZ,
        rate_used NUMERIC,
        level_used INT,
        efficiency_used NUMERIC,
        claimed BOOLEAN DEFAULT FALSE,
        claimed_at TIMESTAMPTZ,
        tasky_earned NUMERIC DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active'
      );

      ALTER TABLE mining_sessions ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(100);
      ALTER TABLE mining_sessions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
      UPDATE mining_sessions SET status = 'claimed' WHERE claimed = TRUE AND status = 'active';

      CREATE TABLE IF NOT EXISTS mining_levels (
        id SERIAL PRIMARY KEY,
        level INT,
        min_holding NUMERIC,
        base_speed_per_hour NUMERIC,
        name VARCHAR(50)
      );

      INSERT INTO mining_levels (level, min_holding, base_speed_per_hour, name)
      SELECT 0, 0, 5, 'No Vault' WHERE NOT EXISTS (SELECT 1 FROM mining_levels WHERE level = 0);
      INSERT INTO mining_levels (level, min_holding, base_speed_per_hour, name)
      SELECT 1, 500, 8, 'Bronze Vault' WHERE NOT EXISTS (SELECT 1 FROM mining_levels WHERE level = 1);
      INSERT INTO mining_levels (level, min_holding, base_speed_per_hour, name)
      SELECT 2, 2000, 14, 'Silver Vault' WHERE NOT EXISTS (SELECT 1 FROM mining_levels WHERE level = 2);
      INSERT INTO mining_levels (level, min_holding, base_speed_per_hour, name)
      SELECT 3, 5000, 25, 'Gold Vault' WHERE NOT EXISTS (SELECT 1 FROM mining_levels WHERE level = 3);
      INSERT INTO mining_levels (level, min_holding, base_speed_per_hour, name)
      SELECT 4, 15000, 45, 'Diamond Vault' WHERE NOT EXISTS (SELECT 1 FROM mining_levels WHERE level = 4);

      CREATE TABLE IF NOT EXISTS efficiency_tiers (
        id SERIAL PRIMARY KEY,
        min_days INT,
        multiplier NUMERIC
      );

      INSERT INTO efficiency_tiers (min_days, multiplier)
      SELECT 0, 1.0 WHERE NOT EXISTS (SELECT 1 FROM efficiency_tiers WHERE min_days = 0);
      INSERT INTO efficiency_tiers (min_days, multiplier)
      SELECT 4, 1.10 WHERE NOT EXISTS (SELECT 1 FROM efficiency_tiers WHERE min_days = 4);
      INSERT INTO efficiency_tiers (min_days, multiplier)
      SELECT 8, 1.25 WHERE NOT EXISTS (SELECT 1 FROM efficiency_tiers WHERE min_days = 8);
      INSERT INTO efficiency_tiers (min_days, multiplier)
      SELECT 15, 1.50 WHERE NOT EXISTS (SELECT 1 FROM efficiency_tiers WHERE min_days = 15);
      INSERT INTO efficiency_tiers (min_days, multiplier)
      SELECT 30, 2.0 WHERE NOT EXISTS (SELECT 1 FROM efficiency_tiers WHERE min_days = 30);

      CREATE TABLE IF NOT EXISTS machines (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50),
        rarity VARCHAR(20),
        min_holding NUMERIC,
        speed_bonus_percent NUMERIC,
        icon_key VARCHAR(50),
        reveal_at_holding NUMERIC,
        sort_order INT
      );

      INSERT INTO machines (name, rarity, min_holding, speed_bonus_percent, icon_key, reveal_at_holding, sort_order)
      SELECT 'Starter Rig', 'common', 500, 5, 'starter_rig', 0, 1 WHERE NOT EXISTS (SELECT 1 FROM machines WHERE name = 'Starter Rig');
      INSERT INTO machines (name, rarity, min_holding, speed_bonus_percent, icon_key, reveal_at_holding, sort_order)
      SELECT 'Copper Frame', 'common', 1500, 5, 'copper_frame', 500, 2 WHERE NOT EXISTS (SELECT 1 FROM machines WHERE name = 'Copper Frame');
      INSERT INTO machines (name, rarity, min_holding, speed_bonus_percent, icon_key, reveal_at_holding, sort_order)
      SELECT 'Ion Core', 'rare', 4000, 10, 'ion_core', 1500, 3 WHERE NOT EXISTS (SELECT 1 FROM machines WHERE name = 'Ion Core');
      INSERT INTO machines (name, rarity, min_holding, speed_bonus_percent, icon_key, reveal_at_holding, sort_order)
      SELECT 'Plasma Drive', 'rare', 8000, 10, 'plasma_drive', 4000, 4 WHERE NOT EXISTS (SELECT 1 FROM machines WHERE name = 'Plasma Drive');
      INSERT INTO machines (name, rarity, min_holding, speed_bonus_percent, icon_key, reveal_at_holding, sort_order)
      SELECT 'Quantum Engine', 'epic', 20000, 20, 'quantum_engine', 15000, 5 WHERE NOT EXISTS (SELECT 1 FROM machines WHERE name = 'Quantum Engine');
      INSERT INTO machines (name, rarity, min_holding, speed_bonus_percent, icon_key, reveal_at_holding, sort_order)
      SELECT 'Genesis Core', 'legendary', 50000, 35, 'genesis_core', 20000, 6 WHERE NOT EXISTS (SELECT 1 FROM machines WHERE name = 'Genesis Core');

      CREATE TABLE IF NOT EXISTS user_machines (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT,
        machine_id INT REFERENCES machines(id),
        unlocked_at TIMESTAMPTZ DEFAULT NOW(),
        reveal_seen BOOLEAN DEFAULT FALSE,
        UNIQUE(telegram_id, machine_id)
      );

      CREATE TABLE IF NOT EXISTS promo_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        reward_amount NUMERIC NOT NULL,
        max_uses INT NOT NULL,
        current_uses INT DEFAULT 0,
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_promo_claims (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT,
        promo_id INT REFERENCES promo_codes(id),
        claimed_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(telegram_id, promo_id)
      );

      INSERT INTO swap_rates (token_name, tasky_per_unit, min_tasky, chain, is_active)
      SELECT 'USDT', 20000, 20000, 'BSC', TRUE WHERE NOT EXISTS (SELECT 1 FROM swap_rates WHERE token_name = 'USDT');

      DELETE FROM swap_rates WHERE token_name != 'USDT';
      UPDATE swap_rates SET is_active = TRUE, tasky_per_unit = 20000, min_tasky = 20000 WHERE token_name = 'USDT';

      CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_telegram_id);
      CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_telegram_id);
      CREATE INDEX IF NOT EXISTS idx_user_tasks_telegram_id ON user_tasks(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_mining_sessions_telegram_id ON mining_sessions(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_swaps_telegram_id ON swaps(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_withdrawals_telegram_id ON withdrawals(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_users_total_referrals ON users(total_referrals DESC);

      -- GRAM CURRENCY SUPPORT
      ALTER TABLE users ADD COLUMN IF NOT EXISTS gram_balance NUMERIC DEFAULT 0;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reward_gram NUMERIC DEFAULT 0;
      ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS reward_gram NUMERIC DEFAULT 0;

      CREATE TABLE IF NOT EXISTS gram_withdrawals (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
        wallet_address VARCHAR(100) NOT NULL,
        amount NUMERIC NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ,
        rejection_reason TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_gram_withdrawals_telegram_id ON gram_withdrawals(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_gram_withdrawals_status ON gram_withdrawals(status);

      -- ADS TRAFFIC SPLIT SUPPORT
      ALTER TABLE withdrawal_settings ADD COLUMN IF NOT EXISTS adsgram_block_id VARCHAR(50) DEFAULT '8223';
      ALTER TABLE withdrawal_settings ADD COLUMN IF NOT EXISTS adsgram_ratio INT DEFAULT 50;
      ALTER TABLE withdrawal_settings ADD COLUMN IF NOT EXISTS gigapub_ratio INT DEFAULT 50;
      ALTER TABLE withdrawal_settings ADD COLUMN IF NOT EXISTS payout_channel_id VARCHAR(100);
      ALTER TABLE withdrawal_settings ADD COLUMN IF NOT EXISTS payout_channel_enabled BOOLEAN DEFAULT TRUE;

      -- REFERRAL GATE SUPPORT ON PROMOS
      ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS require_ref BOOLEAN DEFAULT FALSE;

      -- GRAM AD CLAIM REUSE MITIGATION
      ALTER TABLE ad_views ADD COLUMN IF NOT EXISTS claimed BOOLEAN DEFAULT FALSE;

      -- GRAM TRANSACTION HASH SUPPORT
      ALTER TABLE gram_claims ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(255);
      ALTER TABLE gram_withdrawals ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(255);

      -- NFT CARDS & MINERS SUPPORT
      CREATE TABLE IF NOT EXISTS nft_cards (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price_gram NUMERIC NOT NULL,
        daily_yield_gram NUMERIC NOT NULL,
        duration_days INT DEFAULT 10,
        total_yield_gram NUMERIC NOT NULL,
        rarity VARCHAR(30) DEFAULT 'rare',
        icon_key VARCHAR(50) DEFAULT 'bolt',
        max_supply INT DEFAULT 1000,
        sold_count INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_nft_cards (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        nft_id INT REFERENCES nft_cards(id),
        total_days INT DEFAULT 10,
        purchased_at TIMESTAMPTZ DEFAULT NOW(),
        last_claimed_at TIMESTAMPTZ,
        claims_done INT DEFAULT 0,
        total_earned_gram NUMERIC DEFAULT 0,
        is_completed BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS gram_deposits (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        amount_gram NUMERIC NOT NULL,
        tx_hash VARCHAR(255) UNIQUE,
        auto_verified BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'approved',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS unclaimed_commission NUMERIC DEFAULT 0;
      ALTER TABLE user_nft_cards ADD COLUMN IF NOT EXISTS total_days INT DEFAULT 10;

      INSERT INTO nft_cards (id, name, description, price_gram, daily_yield_gram, duration_days, total_yield_gram, rarity, icon_key, max_supply, is_active)
      VALUES 
        (1, 'Gram Mini Miner #01', 'Entry-level digital miner. (Discontinued from Marketplace)', 0.5, 0.07, 10, 0.70, 'rare', 'bolt', 1000, false),
        (2, 'Gram Turbo Miner #02', 'High-speed digital miner. (Discontinued from Marketplace)', 1.0, 0.15, 10, 1.5, 'legendary', 'rocket', 1000, false),
        (3, 'Gram Mega Miner #03', 'Ultra-powered digital miner. Earn 0.70 GRAM daily for 10 days.', 5.0, 0.70, 10, 7.0, 'mythic', 'flame', 1000, true),
        (4, 'Gram Titan God Miner #04', 'Ultimate powerhouse digital miner. Earn 25.0 GRAM daily for 3 days.', 50.0, 25.0, 3, 75.0, 'celestial', 'crown', 1000, true)
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

      UPDATE nft_cards SET is_active = FALSE WHERE id IN (1, 2) OR rarity IN ('rare', 'legendary');

      -- SEED NAME SUFFIX TASK FOR ADMIN TESTING
      INSERT INTO tasks (title, subtitle, type, reward_tasky, action_url, verification_type, icon, category, reward_gram, admin_only, is_active, is_featured)
      SELECT 'Support Tasky Name Suffix 🐾', 'Add | Tasky 🐾 to the end of your Telegram Last Name to claim 0.0001 GRAM!', 'social', 0, '', 'telegram_suffix', 'Telegram', 'internal', 0.0001, FALSE, TRUE, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE verification_type = 'telegram_suffix');

      UPDATE tasks SET 
        title = 'Support Tasky Name Suffix 🐾',
        subtitle = 'Add | Tasky 🐾 to the end of your Telegram Last Name to claim 0.0001 GRAM!',
        admin_only = FALSE,
        is_featured = TRUE
      WHERE verification_type = 'telegram_suffix';
    `;

    await client.query(initScript);
    await client.query('COMMIT');
    console.log('Database tables initialized successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error initializing database tables:', err);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };

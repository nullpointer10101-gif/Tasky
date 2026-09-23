const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const neonUrl = process.env.DATABASE_URL;

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function getClient(retries = 5) {
  for (let i = 1; i <= retries; i++) {
    try {
      const client = new Client({
        connectionString: neonUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 30000,
        keepAlive: true,
      });
      await client.connect();
      return client;
    } catch (err) {
      if (i === retries) throw err;
      await sleep(3000);
    }
  }
}

async function restoreExactSchema() {
  console.log('=== CREATING EXACT SUPABASE SCHEMA ON NEON ===');
  let client = await getClient();

  try {
    // 1. Drop existing tables cleanly
    console.log('Dropping old tables...');
    await client.query(`
      DROP TABLE IF EXISTS 
        campaign_payouts, campaign_tournaments, offerwall_conversions, gram_deposits,
        user_nft_cards, nft_cards, gram_withdrawals, user_promo_claims, promo_codes,
        user_machines, machines, efficiency_tiers, mining_levels, mining_sessions,
        wallet_bindings, system_settings, withdrawals, withdrawal_settings, referral_rules,
        swap_rates, swaps, referrals, user_tasks, pending_broadcasts, tasks, ad_views,
        special_offer_claims, gram_claims, users CASCADE
    `);

    // 2. Re-create all tables with EXACT Supabase types from db.js + all extra columns
    console.log('Creating exact schema tables...');
    await client.query(`
      CREATE TABLE users (
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
        created_at TIMESTAMPTZ DEFAULT NOW(),
        valid_referrals INT DEFAULT 0,
        spins_available INT DEFAULT 0,
        spins_used_today INT DEFAULT 0,
        last_spin_date DATE,
        notify_usdt_unlock BOOLEAN DEFAULT FALSE,
        wallet_address VARCHAR(100),
        onchain_tasky_balance NUMERIC DEFAULT 0,
        mining_level INT DEFAULT 0,
        efficiency_percent NUMERIC DEFAULT 100,
        holding_stable_since TIMESTAMPTZ,
        last_known_balance NUMERIC DEFAULT 0,
        withdrawal_ads_watched INT DEFAULT 0,
        has_unseen_approved_withdrawal BOOLEAN DEFAULT FALSE,
        withdrawal_popup_views INT DEFAULT 0,
        total_ads_watched INT DEFAULT 0,
        special_offer_seen_at TIMESTAMPTZ,
        gram_wallet_address VARCHAR(100),
        referrals_paused BOOLEAN DEFAULT FALSE,
        has_verified_channels BOOLEAN DEFAULT FALSE,
        gram_balance NUMERIC DEFAULT 0,
        unclaimed_commission NUMERIC DEFAULT 0
      );

      CREATE TABLE tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200),
        subtitle VARCHAR(200),
        type VARCHAR(20),
        reward_tasky NUMERIC DEFAULT 0,
        action_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        is_featured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        verification_type VARCHAR(20) DEFAULT 'proof_screenshot',
        icon VARCHAR(50) DEFAULT 'Default',
        telegram_chat_id VARCHAR(100),
        x_subtype VARCHAR(20),
        admin_only BOOLEAN DEFAULT FALSE,
        category VARCHAR(50) DEFAULT 'internal',
        target_audience VARCHAR(50) DEFAULT 'all',
        target_user_ids TEXT,
        new_user_days INT DEFAULT 7,
        reward_gram NUMERIC DEFAULT 0,
        is_daily BOOLEAN DEFAULT FALSE,
        cooldown_hours NUMERIC
      );

      CREATE TABLE user_tasks (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT,
        task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
        completed_at TIMESTAMPTZ DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'pending',
        proof_screenshot_url TEXT,
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        rejection_reason TEXT,
        approved_by VARCHAR(50)
      );

      CREATE TABLE ad_views (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT,
        ad_type VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        claimed BOOLEAN DEFAULT FALSE,
        is_flagged BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE referrals (
        id SERIAL PRIMARY KEY,
        referrer_telegram_id BIGINT,
        referred_telegram_id BIGINT,
        reward_paid BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE gram_claims (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
        gram_wallet_address VARCHAR(100) NOT NULL,
        amount NUMERIC DEFAULT 0.02,
        status VARCHAR(20) DEFAULT 'pending',
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ,
        rejection_reason TEXT,
        tx_hash VARCHAR(255),
        is_flagged BOOLEAN DEFAULT FALSE,
        flag_reason TEXT
      );

      CREATE TABLE gram_withdrawals (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
        wallet_address VARCHAR(100) NOT NULL,
        amount NUMERIC NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ,
        rejection_reason TEXT,
        tx_hash VARCHAR(255),
        is_flagged BOOLEAN DEFAULT FALSE,
        flag_reason TEXT
      );

      CREATE TABLE special_offer_claims (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        offer_id VARCHAR(50) DEFAULT 'invite_20_get_20k',
        status VARCHAR(20) DEFAULT 'pending',
        valid_referrals_at_claim INT DEFAULT 0,
        seen_at TIMESTAMPTZ DEFAULT NOW(),
        claimed_at TIMESTAMPTZ,
        reviewed_at TIMESTAMPTZ,
        rejection_reason TEXT
      );

      CREATE TABLE pending_broadcasts (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE swaps (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT,
        tasky_amount NUMERIC,
        receive_token VARCHAR(10),
        receive_amount NUMERIC,
        wallet_address VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        tx_hash VARCHAR(100),
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ,
        fee_percent NUMERIC DEFAULT 2,
        chain VARCHAR(20) DEFAULT 'TON',
        rejection_reason TEXT,
        is_flagged BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE swap_rates (
        id SERIAL PRIMARY KEY,
        token_name VARCHAR(10),
        tasky_per_unit NUMERIC,
        min_tasky NUMERIC,
        is_active BOOLEAN DEFAULT TRUE,
        chain VARCHAR(20) DEFAULT 'TON',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE referral_rules (
        id SERIAL PRIMARY KEY,
        reward_per_referral NUMERIC DEFAULT 200,
        tasks_required_for_valid INT DEFAULT 3,
        spin_reward_per_referral INT DEFAULT 1
      );

      CREATE TABLE withdrawal_settings (
        id SERIAL PRIMARY KEY,
        min_withdrawal_tasky NUMERIC DEFAULT 2250,
        fee_percent NUMERIC DEFAULT 35,
        usdt_rate NUMERIC DEFAULT 0.00003,
        is_locked BOOLEAN DEFAULT TRUE,
        unlock_message TEXT DEFAULT 'Withdrawals unlock when TASKY launches on-chain',
        target_users_milestone INT,
        adsgram_block_id VARCHAR(50) DEFAULT '8223',
        adsgram_ratio INT DEFAULT 50,
        gigapub_ratio INT DEFAULT 50,
        payout_channel_id VARCHAR(100) DEFAULT '@TaskyPayouts',
        payout_channel_enabled BOOLEAN DEFAULT TRUE,
        auto_payout_enabled BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE withdrawals (
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

      CREATE TABLE system_settings (
        key VARCHAR(50) PRIMARY KEY,
        value JSONB
      );

      CREATE TABLE wallet_bindings (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(100) UNIQUE NOT NULL,
        telegram_id BIGINT UNIQUE NOT NULL,
        bound_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE mining_sessions (
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

      CREATE TABLE mining_levels (
        id SERIAL PRIMARY KEY,
        level INT,
        min_holding NUMERIC,
        base_speed_per_hour NUMERIC,
        name VARCHAR(50)
      );

      CREATE TABLE efficiency_tiers (
        id SERIAL PRIMARY KEY,
        min_days INT,
        multiplier NUMERIC
      );

      CREATE TABLE machines (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50),
        rarity VARCHAR(20),
        min_holding NUMERIC,
        speed_bonus_percent NUMERIC,
        icon_key VARCHAR(50),
        reveal_at_holding NUMERIC,
        sort_order INT
      );

      CREATE TABLE user_machines (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT,
        machine_id INT REFERENCES machines(id) ON DELETE CASCADE,
        unlocked_at TIMESTAMPTZ DEFAULT NOW(),
        reveal_seen BOOLEAN DEFAULT FALSE,
        UNIQUE(telegram_id, machine_id)
      );

      CREATE TABLE promo_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        reward_amount NUMERIC DEFAULT 0,
        reward_gram NUMERIC DEFAULT 0,
        max_uses INT NOT NULL,
        current_uses INT DEFAULT 0,
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        require_ref BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE user_promo_claims (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT,
        promo_id INT REFERENCES promo_codes(id) ON DELETE CASCADE,
        claimed_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(telegram_id, promo_id)
      );

      CREATE TABLE nft_cards (
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

      CREATE TABLE user_nft_cards (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        nft_id INT REFERENCES nft_cards(id) ON DELETE CASCADE,
        total_days INT DEFAULT 10,
        purchased_at TIMESTAMPTZ DEFAULT NOW(),
        last_claimed_at TIMESTAMPTZ,
        claims_done INT DEFAULT 0,
        total_earned_gram NUMERIC DEFAULT 0,
        is_completed BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE gram_deposits (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        amount_gram NUMERIC NOT NULL,
        tx_hash VARCHAR(255) UNIQUE,
        auto_verified BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'approved',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE offerwall_conversions (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        reward_id VARCHAR(255) UNIQUE NOT NULL,
        project_id VARCHAR(100),
        amount NUMERIC DEFAULT 0,
        hash VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE campaign_tournaments (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL DEFAULT 'Weekly Ad Championship',
        start_at TIMESTAMPTZ NOT NULL,
        end_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE campaign_payouts (
        id SERIAL PRIMARY KEY,
        tournament_id INT REFERENCES campaign_tournaments(id) ON DELETE CASCADE,
        telegram_id BIGINT NOT NULL,
        rank INT NOT NULL,
        ads_watched INT NOT NULL,
        gram_reward NUMERIC NOT NULL DEFAULT 0,
        tasky_reward NUMERIC NOT NULL DEFAULT 0,
        claimed BOOLEAN DEFAULT FALSE,
        claimed_at TIMESTAMPTZ
      );
    `);
    console.log('✓ All 29 database tables created with exact typed columns!');

    // 3. Populate tables from latest backup JSON
    const backupDir = path.join(__dirname, 'backups');
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
    const backupPath = path.join(backupDir, files[0]);
    console.log(`\nLoading backup data from: ${files[0]}...`);
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    // Order: parent tables first
    const tableOrder = [
      'referral_rules', 'swap_rates', 'withdrawal_settings', 'mining_levels',
      'efficiency_tiers', 'machines', 'system_settings', 'promo_codes',
      'tasks', 'nft_cards', 'campaign_tournaments', 'users', 'gram_claims',
      'gram_withdrawals', 'gram_deposits', 'swaps', 'user_nft_cards',
      'user_promo_claims', 'special_offer_claims', 'campaign_payouts',
      'wallet_bindings', 'referrals', 'user_machines', 'mining_sessions',
      'user_tasks', 'ad_views', 'offerwall_conversions', 'pending_broadcasts', 'withdrawals'
    ];

    for (const tableName of tableOrder) {
      const rows = backupData[tableName];
      if (!rows || rows.length === 0) continue;

      console.log(`Inserting ${rows.length} rows → ${tableName}...`);

      // Ensure any column in backup exists in table schema (auto ADD COLUMN if needed)
      const sample = rows[0];
      const tableColsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}'`);
      const existingCols = tableColsRes.rows.map(r => r.column_name);

      for (const col of Object.keys(sample)) {
        if (!existingCols.includes(col)) {
          console.log(`Adding missing column ${tableName}.${col}...`);
          let colType = 'TEXT';
          if (typeof sample[col] === 'boolean') colType = 'BOOLEAN DEFAULT FALSE';
          else if (typeof sample[col] === 'number') colType = Number.isInteger(sample[col]) ? 'BIGINT' : 'NUMERIC';
          await client.query(`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${col}" ${colType}`);
        }
      }

      const colNames = Object.keys(rows[0]);
      const colsSql = colNames.map(c => `"${c}"`).join(', ');

      const chunkSize = 100;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const values = [];
        let counter = 1;

        const valueStrings = chunk.map(row => {
          const placeholders = colNames.map(() => `$${counter++}`);
          colNames.forEach(col => {
            let val = row[col];
            if (val !== null && typeof val === 'object') val = JSON.stringify(val);
            values.push(val);
          });
          return `(${placeholders.join(', ')})`;
        });

        await client.query(
          `INSERT INTO "${tableName}" (${colsSql}) VALUES ${valueStrings.join(', ')} ON CONFLICT DO NOTHING`,
          values
        );

        if ((i + chunkSize) % 10000 === 0 || i + chunkSize >= rows.length) {
          const done = Math.min(i + chunkSize, rows.length);
          process.stdout.write(`\r  -> ${tableName}: ${done}/${rows.length}`);
        }
      }

      // Reset SERIAL sequence if table has id
      if (colNames.includes('id')) {
        try {
          await client.query(`SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), COALESCE((SELECT MAX(id) FROM "${tableName}"), 1))`);
        } catch (seqErr) {}
      }

      console.log(`\n  ✓ ${tableName} restored & sequence reset!`);
    }

    // 4. Create Indexes
    console.log('\nCreating performance indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_gram_claims_telegram_id ON gram_claims(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_gram_claims_status ON gram_claims(status);
      CREATE INDEX IF NOT EXISTS idx_special_offer_claims_status ON special_offer_claims(status);
      CREATE INDEX IF NOT EXISTS idx_ad_views_telegram_id ON ad_views(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_ad_views_created_at ON ad_views(created_at);
      CREATE INDEX IF NOT EXISTS idx_user_tasks_telegram_id ON user_tasks(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_mining_sessions_telegram_id ON mining_sessions(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_swaps_telegram_id ON swaps(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_withdrawals_telegram_id ON withdrawals(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_users_total_referrals ON users(total_referrals DESC);
      CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_telegram_id);
      CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_telegram_id);
      CREATE INDEX IF NOT EXISTS idx_gram_withdrawals_telegram_id ON gram_withdrawals(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_gram_withdrawals_status ON gram_withdrawals(status);
      CREATE INDEX IF NOT EXISTS idx_offerwall_conversions_telegram_id ON offerwall_conversions(telegram_id);
    `);
    console.log('✓ All indexes created!');

    // 5. Ensure all users are unbanned and referral/ad counts synced
    await client.query('UPDATE users SET is_banned = FALSE');
    await client.query(`
      UPDATE users u
      SET total_referrals = COALESCE(r.cnt, 0)
      FROM (SELECT referrer_telegram_id, COUNT(*) as cnt FROM referrals GROUP BY referrer_telegram_id) r
      WHERE u.telegram_id = r.referrer_telegram_id
    `);
    await client.query(`
      UPDATE users u
      SET total_ads_watched = COALESCE(a.cnt, 0)
      FROM (SELECT telegram_id, COUNT(*) as cnt FROM ad_views GROUP BY telegram_id) a
      WHERE u.telegram_id = a.telegram_id
    `);

    // 6. Verify
    console.log('\n=== EXACT SUPABASE SCHEMA RESTORE VERIFICATION ===');
    const uCount = await client.query('SELECT COUNT(*) FROM users');
    const tCount = await client.query('SELECT COUNT(*) FROM user_tasks WHERE status = \'approved\'');
    const aCount = await client.query('SELECT COUNT(*) FROM ad_views');
    const rCount = await client.query('SELECT COUNT(*) FROM referrals');

    console.log(`✅ Users:                  ${uCount.rows[0].count}`);
    console.log(`✅ Approved User Tasks:     ${tCount.rows[0].count}`);
    console.log(`✅ Ad Views:               ${aCount.rows[0].count}`);
    console.log(`✅ Referrals:              ${rCount.rows[0].count}`);
    console.log('\n🎉 EXACT SUPABASE DATABASE SCHEMA SUCCESSFULLY DEPLOYED TO NEON! 🎉');

  } finally {
    await client.end();
  }
}

restoreExactSchema().catch(err => {
  console.error('Fatal error during exact schema restore:', err.message);
  process.exit(1);
});

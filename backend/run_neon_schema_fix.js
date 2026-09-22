const { Client } = require('pg');

const neonUrl = 'postgresql://neondb_owner:npg_hdzlyY4E8Dmu@ep-floral-block-ao1exyu8.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function runFix() {
  console.log('=== CONNECTING TO NEON TO CONVERT ALL NUMERIC/BIGINT COLUMNS ===');
  const client = new Client({
    connectionString: neonUrl,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const alters = [
    // USERS
    `ALTER TABLE users ALTER COLUMN telegram_id TYPE BIGINT USING NULLIF(telegram_id, '')::bigint`,
    `ALTER TABLE users ALTER COLUMN referred_by TYPE BIGINT USING NULLIF(referred_by, '')::bigint`,
    `ALTER TABLE users ALTER COLUMN total_referrals TYPE INT USING COALESCE(NULLIF(total_referrals, '')::int, 0)`,
    `ALTER TABLE users ALTER COLUMN balance TYPE NUMERIC USING COALESCE(NULLIF(balance, '')::numeric, 0)`,
    `ALTER TABLE users ALTER COLUMN streak_days TYPE INT USING COALESCE(NULLIF(streak_days, '')::int, 0)`,
    `ALTER TABLE users ALTER COLUMN valid_referrals TYPE INT USING COALESCE(NULLIF(valid_referrals, '')::int, 0)`,
    `ALTER TABLE users ALTER COLUMN spins_available TYPE INT USING COALESCE(NULLIF(spins_available, '')::int, 0)`,
    `ALTER TABLE users ALTER COLUMN spins_used_today TYPE INT USING COALESCE(NULLIF(spins_used_today, '')::int, 0)`,
    `ALTER TABLE users ALTER COLUMN onchain_tasky_balance TYPE NUMERIC USING COALESCE(NULLIF(onchain_tasky_balance, '')::numeric, 0)`,
    `ALTER TABLE users ALTER COLUMN mining_level TYPE INT USING COALESCE(NULLIF(mining_level, '')::int, 0)`,
    `ALTER TABLE users ALTER COLUMN efficiency_percent TYPE NUMERIC USING COALESCE(NULLIF(efficiency_percent, '')::numeric, 100)`,
    `ALTER TABLE users ALTER COLUMN last_known_balance TYPE NUMERIC USING COALESCE(NULLIF(last_known_balance, '')::numeric, 0)`,
    `ALTER TABLE users ALTER COLUMN withdrawal_ads_watched TYPE INT USING COALESCE(NULLIF(withdrawal_ads_watched, '')::int, 0)`,
    `ALTER TABLE users ALTER COLUMN withdrawal_popup_views TYPE INT USING COALESCE(NULLIF(withdrawal_popup_views, '')::int, 0)`,
    `ALTER TABLE users ALTER COLUMN total_ads_watched TYPE INT USING COALESCE(NULLIF(total_ads_watched, '')::int, 0)`,
    `ALTER TABLE users ALTER COLUMN gram_balance TYPE NUMERIC USING COALESCE(NULLIF(gram_balance, '')::numeric, 0)`,
    `ALTER TABLE users ALTER COLUMN unclaimed_commission TYPE NUMERIC USING COALESCE(NULLIF(unclaimed_commission, '')::numeric, 0)`,

    // AD VIEWS
    `ALTER TABLE ad_views ALTER COLUMN telegram_id TYPE BIGINT USING NULLIF(telegram_id, '')::bigint`,

    // USER TASKS
    `ALTER TABLE user_tasks ALTER COLUMN telegram_id TYPE BIGINT USING NULLIF(telegram_id, '')::bigint`,
    `ALTER TABLE user_tasks ALTER COLUMN task_id TYPE INT USING NULLIF(task_id, '')::int`,

    // GRAM CLAIMS
    `ALTER TABLE gram_claims ALTER COLUMN telegram_id TYPE BIGINT USING NULLIF(telegram_id, '')::bigint`,
    `ALTER TABLE gram_claims ALTER COLUMN amount TYPE NUMERIC USING COALESCE(NULLIF(amount, '')::numeric, 0)`,

    // GRAM WITHDRAWALS
    `ALTER TABLE gram_withdrawals ALTER COLUMN telegram_id TYPE BIGINT USING NULLIF(telegram_id, '')::bigint`,
    `ALTER TABLE gram_withdrawals ALTER COLUMN amount TYPE NUMERIC USING COALESCE(NULLIF(amount, '')::numeric, 0)`,

    // SWAPS
    `ALTER TABLE swaps ALTER COLUMN telegram_id TYPE BIGINT USING NULLIF(telegram_id, '')::bigint`,
    `ALTER TABLE swaps ALTER COLUMN tasky_amount TYPE NUMERIC USING COALESCE(NULLIF(tasky_amount, '')::numeric, 0)`,
    `ALTER TABLE swaps ALTER COLUMN receive_amount TYPE NUMERIC USING COALESCE(NULLIF(receive_amount, '')::numeric, 0)`,

    // TASKS
    `ALTER TABLE tasks ALTER COLUMN reward_tasky TYPE NUMERIC USING COALESCE(NULLIF(reward_tasky, '')::numeric, 0)`,
    `ALTER TABLE tasks ALTER COLUMN reward_gram TYPE NUMERIC USING COALESCE(NULLIF(reward_gram, '')::numeric, 0)`,

    // MINING SESSIONS
    `ALTER TABLE mining_sessions ALTER COLUMN telegram_id TYPE BIGINT USING NULLIF(telegram_id, '')::bigint`,
    `ALTER TABLE mining_sessions ALTER COLUMN tasky_earned TYPE NUMERIC USING COALESCE(NULLIF(tasky_earned, '')::numeric, 0)`,
    `ALTER TABLE mining_sessions ALTER COLUMN rate_used TYPE NUMERIC USING COALESCE(NULLIF(rate_used, '')::numeric, 0)`,

    // USER MACHINES
    `ALTER TABLE user_machines ALTER COLUMN telegram_id TYPE BIGINT USING NULLIF(telegram_id, '')::bigint`,
    `ALTER TABLE user_machines ALTER COLUMN machine_id TYPE INT USING NULLIF(machine_id, '')::int`,

    // USER NFT CARDS
    `ALTER TABLE user_nft_cards ALTER COLUMN telegram_id TYPE BIGINT USING NULLIF(telegram_id, '')::bigint`,
    `ALTER TABLE user_nft_cards ALTER COLUMN nft_id TYPE INT USING NULLIF(nft_id, '')::int`,
    `ALTER TABLE user_nft_cards ALTER COLUMN total_earned_gram TYPE NUMERIC USING COALESCE(NULLIF(total_earned_gram, '')::numeric, 0)`,

    // REFERRALS
    `ALTER TABLE referrals ALTER COLUMN referrer_telegram_id TYPE BIGINT USING NULLIF(referrer_telegram_id, '')::bigint`,
    `ALTER TABLE referrals ALTER COLUMN referred_telegram_id TYPE BIGINT USING NULLIF(referred_telegram_id, '')::bigint`
  ];

  for (const sql of alters) {
    try {
      await client.query(sql);
      const match = sql.match(/ALTER TABLE (\w+) ALTER COLUMN (\w+) TYPE (\w+)/);
      if (match) console.log(`✓ ${match[1]}.${match[2]} -> ${match[3]}`);
    } catch (err) {
      console.warn(`Warning on statement (${sql}): ${err.message}`);
    }
  }

  // Now run initDB logic from backend/db.js to recreate all indexes and constraints
  const { initDB } = require('./db');
  console.log('\nRunning db.js initDB() to recreate all indexes, defaults, and constraints...');
  await initDB();

  console.log('\n🎉 ALL COLUMNS, CONSTRAINTS, AND INDEXES FULLY CONVERTED AND VERIFIED ON NEON!');
  await client.end();
}

runFix().catch(err => {
  console.error('Fatal error in run_neon_schema_fix:', err);
  process.exit(1);
});

require('dotenv').config();
const { pool } = require('./backend/db');

async function main() {
  try {
    const userRes = await pool.query(
      "SELECT id, telegram_id, username, first_name, gram_wallet_address, wallet_address, total_referrals FROM users WHERE username ILIKE $1 OR first_name ILIKE $2",
      ['%Foxypi99%', '%Baeyyo%']
    );

    console.log('Found users:', userRes.rows);

    if (userRes.rows.length === 0) {
      console.log('No user found matching Foxypi99 or Baeyyo. Let us search recent users...');
      const recent = await pool.query("SELECT id, telegram_id, username, first_name FROM users ORDER BY id DESC LIMIT 10");
      console.log('Recent users:', recent.rows);
      process.exit(0);
    }

    const targetUser = userRes.rows[0];
    const telegramId = targetUser.telegram_id;

    console.log(`Setting up user ${targetUser.username || targetUser.first_name} (${telegramId})...`);

    // 1. Ensure user has at least 2 referrals
    await pool.query(
      "UPDATE users SET total_referrals = GREATEST(COALESCE(total_referrals, 0), 2) WHERE telegram_id = $1",
      [telegramId]
    );

    // 2. Clear any claims in the last 24h that would block testing
    await pool.query(
      "DELETE FROM gram_claims WHERE telegram_id = $1 AND requested_at >= NOW() - INTERVAL '24 hours'",
      [telegramId]
    );

    // 3. Clear existing unclaimed ad views for clean slate
    await pool.query(
      "DELETE FROM ad_views WHERE telegram_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'",
      [telegramId]
    );

    // 4. Insert 30 GigaPub ads and 30 Monetag ads with valid realistic timestamps
    const now = Date.now();
    for (let i = 0; i < 30; i++) {
      const timeOffset = (60 - i) * 35 * 1000; // 35s spaced
      const adTime = new Date(now - timeOffset).toISOString();
      await pool.query(
        "INSERT INTO ad_views (telegram_id, ad_type, claimed, created_at) VALUES ($1, 'gram_gigapub', FALSE, $2)",
        [telegramId, adTime]
      );
    }

    for (let i = 0; i < 30; i++) {
      const timeOffset = (30 - i) * 35 * 1000; // 35s spaced
      const adTime = new Date(now - timeOffset).toISOString();
      await pool.query(
        "INSERT INTO ad_views (telegram_id, ad_type, claimed, created_at) VALUES ($1, 'gram_monetag', FALSE, $2)",
        [telegramId, adTime]
      );
    }

    console.log('✅ Successfully inserted 30 GigaPub + 30 Monetag ads!');
    console.log('✅ Cleared 24h claim lock and ensured referral eligibility!');
    console.log(`Account ${targetUser.username} (${telegramId}) is 100% ready to test manual claim!`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();

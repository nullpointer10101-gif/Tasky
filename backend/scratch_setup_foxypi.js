require('dotenv').config();
const { pool } = require('./db');

async function setupUserForClaim() {
  const telegramId = '6909180225';
  console.log(`Setting up user ${telegramId} for daily Gram claim test...`);

  // 1. Ensure user exists and has total_referrals >= 2
  await pool.query(`
    UPDATE users 
    SET total_referrals = GREATEST(COALESCE(total_referrals, 0), 2)
    WHERE telegram_id = $1
  `, [telegramId]);

  // 2. Delete recent claims in the last 24h so user can claim right away
  const delClaims = await pool.query(`
    DELETE FROM gram_claims 
    WHERE telegram_id = $1 AND requested_at >= NOW() - INTERVAL '24 hours'
  `, [telegramId]);
  console.log(`Deleted ${delClaims.rowCount} recent claims for test.`);

  // 3. Clear old ad views
  await pool.query(`
    DELETE FROM ad_views 
    WHERE telegram_id = $1 AND ad_type IN ('gram_ad', 'gram_gigapub', 'gram_monetag')
  `, [telegramId]);

  // 4. Insert 30 GigaPub ads and 30 Monetag ads spaced nicely across 35 minutes
  const now = Date.now();
  for (let i = 0; i < 30; i++) {
    const gigaTime = new Date(now - (35 * 60 * 1000) + (i * 35 * 1000));
    await pool.query(`
      INSERT INTO ad_views (telegram_id, ad_type, claimed, created_at)
      VALUES ($1, 'gram_gigapub', FALSE, $2)
    `, [telegramId, gigaTime]);

    const monetagTime = new Date(now - (35 * 60 * 1000) + (i * 35 * 1000) + 15000);
    await pool.query(`
      INSERT INTO ad_views (telegram_id, ad_type, claimed, created_at)
      VALUES ($1, 'gram_monetag', FALSE, $2)
    `, [telegramId, monetagTime]);
  }

  // 5. Verify stats
  const adCount = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE ad_type IN ('gram_ad', 'gram_gigapub')) as gigapub_count,
      COUNT(*) FILTER (WHERE ad_type = 'gram_monetag') as monetag_count
    FROM ad_views
    WHERE telegram_id = $1 AND claimed = FALSE AND created_at >= NOW() - INTERVAL '24 hours'
  `, [telegramId]);

  console.log('✅ User is 100% eligible to claim in Mini App!');
  console.log('Ad counts:', adCount.rows[0]);
  process.exit(0);
}

setupUserForClaim().catch(err => {
  console.error(err);
  process.exit(1);
});

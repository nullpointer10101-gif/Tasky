require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  console.log('\n=== INVESTIGATING USER: @xymndra13 ===\n');

  // 1. Find user by username or telegram_id
  const userRes = await pool.query(
    `SELECT id, telegram_id, first_name, username, created_at, balance, gram_wallet_address, wallet_address 
     FROM users 
     WHERE LOWER(username) = LOWER('xymndra13') OR telegram_id::text = 'xymndra13'`
  );

  if (userRes.rows.length === 0) {
    console.log('❌ User @xymndra13 not found in users table!');
    // Try searching in reactor_claims
    const claimSearch = await pool.query(`SELECT * FROM reactor_claims ORDER BY id DESC LIMIT 10`);
    console.log('Recent reactor claims in DB:');
    console.table(claimSearch.rows);
    await pool.end();
    return;
  }

  const user = userRes.rows[0];
  console.log('👤 USER PROFILE:');
  console.log(`- Database ID: ${user.id}`);
  console.log(`- Telegram ID: ${user.telegram_id}`);
  console.log(`- Username: @${user.username}`);
  console.log(`- First Name: ${user.first_name}`);
  console.log(`- Joined At: ${user.created_at}`);
  console.log(`- Wallet: ${user.gram_wallet_address || user.wallet_address || 'None'}`);

  const tid = user.telegram_id;

  // 2. Reactor Claims
  const claimsRes = await pool.query(
    `SELECT * FROM reactor_claims WHERE telegram_id = $1 ORDER BY claimed_at DESC`,
    [tid]
  );
  console.log(`\n⚡ REACTOR CLAIMS FOR THIS USER (${claimsRes.rows.length} claims):`);
  console.table(claimsRes.rows);

  // 3. Ad Views Analysis
  const adsRes = await pool.query(
    `SELECT id, ad_type, created_at 
     FROM ad_views 
     WHERE telegram_id = $1 AND ad_type IN ('reactor_usl', 'reactor_ad')
     ORDER BY created_at ASC`,
    [tid]
  );

  const totalAds = adsRes.rows.length;
  console.log(`\n📊 AD VIEWS METRICS:`);
  console.log(`- Total Reactor Ad Views: ${totalAds}`);

  if (totalAds > 0) {
    const firstAd = adsRes.rows[0].created_at;
    const lastAd = adsRes.rows[totalAds - 1].created_at;
    const totalTimeMs = new Date(lastAd) - new Date(firstAd);
    const totalTimeMinutes = (totalTimeMs / (1000 * 60)).toFixed(1);
    const totalTimeHours = (totalTimeMs / (1000 * 60 * 60)).toFixed(2);
    const avgSecPerAd = (totalTimeMs / (1000 * totalAds)).toFixed(1);

    console.log(`- First Ad Recorded: ${firstAd}`);
    console.log(`- Last Ad Recorded:  ${lastAd}`);
    console.log(`- Total Duration:    ${totalTimeMinutes} mins (${totalTimeHours} hours)`);
    console.log(`- Average Time per Ad: ${avgSecPerAd} seconds`);

    // Distribution by Hour
    const hourlyRes = await pool.query(
      `SELECT DATE_TRUNC('hour', created_at) as hour_slot, COUNT(*) as count
       FROM ad_views
       WHERE telegram_id = $1 AND ad_type IN ('reactor_usl', 'reactor_ad')
       GROUP BY hour_slot
       ORDER BY hour_slot ASC`,
      [tid]
    );
    console.log('\n📅 AD VIEWS BY HOUR:');
    console.table(hourlyRes.rows.map(r => ({
      Hour: r.hour_slot.toISOString(),
      AdsWatched: r.count
    })));

    // Check time interval between consecutive ads
    let sub5SecCount = 0;
    let sub10SecCount = 0;
    let sub30SecCount = 0;

    for (let i = 1; i < adsRes.rows.length; i++) {
      const prev = new Date(adsRes.rows[i - 1].created_at);
      const curr = new Date(adsRes.rows[i].created_at);
      const diffSec = (curr - prev) / 1000;

      if (diffSec < 5) sub5SecCount++;
      if (diffSec < 10) sub10SecCount++;
      if (diffSec < 30) sub30SecCount++;
    }

    console.log('\n⏱️ INTER-AD TIMING BREAKDOWN (Anti-Spam Check):');
    console.log(`- Ads < 5 seconds apart:  ${sub5SecCount} (${((sub5SecCount / totalAds) * 100).toFixed(1)}%)`);
    console.log(`- Ads < 10 seconds apart: ${sub10SecCount} (${((sub10SecCount / totalAds) * 100).toFixed(1)}%)`);
    console.log(`- Ads < 30 seconds apart: ${sub30SecCount} (${((sub30SecCount / totalAds) * 100).toFixed(1)}%)`);
  }

  // 4. Check other ad types for this user
  const allAdsRes = await pool.query(
    `SELECT ad_type, COUNT(*) as count FROM ad_views WHERE telegram_id = $1 GROUP BY ad_type`,
    [tid]
  );
  console.log('\n📺 TOTAL AD VIEWS ACROSS ALL TYPES FOR THIS USER:');
  console.table(allAdsRes.rows);

  await pool.end();
}

run().catch(console.error);

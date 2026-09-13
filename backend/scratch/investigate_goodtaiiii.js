require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const tid = 1760515529;
  console.log(`\n=== DEEP AUDIT FOR USER: @GoodTaiiii (${tid}) ===\n`);

  // 1. Profile & Wallet
  const uRes = await pool.query(`SELECT * FROM users WHERE telegram_id = $1`, [tid]);
  if (uRes.rows.length === 0) {
    console.log('User not found!');
    await pool.end();
    return;
  }
  const user = uRes.rows[0];
  console.log('👤 USER DETAILS:');
  console.log(`- Username: @${user.username}`);
  console.log(`- Name: ${user.first_name}`);
  console.log(`- Joined: ${user.created_at}`);
  console.log(`- Wallet: ${user.gram_wallet_address || user.wallet_address}`);
  console.log(`- Balance: ${user.balance} TASKY / ${user.gram_balance} GRAM`);
  console.log(`- Referrals: ${user.total_referrals} total / ${user.valid_referrals} valid`);

  const wallet = user.gram_wallet_address || user.wallet_address;

  // 2. Wallet Multi-Account Audit
  const walletDupRes = await pool.query(
    `SELECT id, telegram_id, username, first_name, created_at FROM users WHERE (wallet_address = $1 OR gram_wallet_address = $1) AND telegram_id != $2`,
    [wallet, tid]
  );
  console.log(`\n💳 WALLET MULTI-ACCOUNT CHECK:`);
  if (walletDupRes.rows.length > 0) {
    console.log(`🚨 WARNING: Wallet ${wallet} is SHARED with other accounts:`);
    console.table(walletDupRes.rows);
  } else {
    console.log(`✅ Clean: Wallet is unique to this account.`);
  }

  // 3. Claims History
  const claimsRes = await pool.query(
    `SELECT id, amount, status, is_flagged, flag_reason, requested_at, processed_at, tx_hash FROM gram_claims WHERE telegram_id = $1 ORDER BY requested_at DESC`,
    [tid]
  );
  console.log(`\n📜 CLAIMS HISTORY (${claimsRes.rows.length} total claims):`);
  console.table(claimsRes.rows);

  // 4. Ad Views Analysis (Last 24 hours & total)
  const adsRes = await pool.query(
    `SELECT id, ad_type, created_at FROM ad_views WHERE telegram_id = $1 ORDER BY created_at ASC`,
    [tid]
  );
  console.log(`\n📺 AD VIEWS METRICS:`);
  console.log(`- Total Ad Views Lifetime: ${adsRes.rows.length}`);

  const adTypeCounts = {};
  adsRes.rows.forEach(r => {
    adTypeCounts[r.ad_type] = (adTypeCounts[r.ad_type] || 0) + 1;
  });
  console.log(`- Breakdown by Provider:`, adTypeCounts);

  // Check last 60 ad views timing for current claim
  const recent60 = adsRes.rows.slice(-60);
  if (recent60.length > 0) {
    const firstAd = recent60[0].created_at;
    const lastAd = recent60[recent60.length - 1].created_at;
    const timeSpanMin = ((new Date(lastAd) - new Date(firstAd)) / (1000 * 60)).toFixed(1);
    const avgSecPerAd = ((new Date(lastAd) - new Date(firstAd)) / (1000 * recent60.length)).toFixed(1);

    console.log(`\n⏱️ CURRENT CLAIM 60-AD PACING:`);
    console.log(`- First of 60 Ads: ${firstAd}`);
    console.log(`- Last of 60 Ads:  ${lastAd}`);
    console.log(`- Time Span:       ${timeSpanMin} minutes`);
    console.log(`- Avg Time/Ad:     ${avgSecPerAd} seconds`);

    // Check fast gaps under 10s
    let fastGaps = 0;
    for (let i = 1; i < recent60.length; i++) {
      const prev = new Date(recent60[i - 1].created_at).getTime();
      const curr = new Date(recent60[i].created_at).getTime();
      if ((curr - prev) / 1000 < 10) fastGaps++;
    }
    console.log(`- Ads recorded < 10s apart: ${fastGaps} / ${recent60.length}`);
  }

  await pool.end();
}

run().catch(console.error);

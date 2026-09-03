require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspectUser() {
  const telegramId = '8508502625';
  console.log(`=== AUDITING USER TELEGRAM ID: ${telegramId} ===\n`);

  // 1. Basic User Info
  const userRes = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
  if (userRes.rows.length === 0) {
    console.log('User not found!');
    await pool.end();
    return;
  }
  const user = userRes.rows[0];
  console.log('--- USER PROFILE ---');
  console.log('Name:', user.first_name, '| Username:', `@${user.username || 'N/A'}`);
  console.log('Joined:', user.created_at);
  console.log('TASKY Balance:', user.balance, '| GRAM Balance:', user.gram_balance);
  console.log('TON Wallet:', user.wallet_address);
  console.log('GRAM Wallet:', user.gram_wallet_address);
  console.log('Is Banned:', user.is_banned);
  console.log('Total Ads Watched:', user.total_ads_watched);
  console.log('Total Referrals:', user.total_referrals, '| Valid Referrals:', user.valid_referrals);
  console.log('Referred By:', user.referred_by);

  // 2. IP / Device Check (Same wallet or IP shared with other users)
  if (user.gram_wallet_address || user.wallet_address) {
    const activeWallet = user.gram_wallet_address || user.wallet_address;
    const sameWalletRes = await pool.query(
      'SELECT telegram_id, username, first_name, created_at FROM users WHERE (gram_wallet_address = $1 OR wallet_address = $1) AND telegram_id != $2',
      [activeWallet, telegramId]
    );
    console.log('\n--- MULTI-ACCOUNT / WALLET SHARING CHECK ---');
    if (sameWalletRes.rows.length > 0) {
      console.log('⚠️ WARNING: SHARED WALLET ADDRESS FOUND WITH OTHER USERS:');
      console.table(sameWalletRes.rows);
    } else {
      console.log('✅ No duplicate wallet sharing detected.');
    }
  }

  // 3. Ad Watch Pattern (Timestamp Intervals & Speed)
  const adViewsRes = await pool.query(
    `SELECT id, ad_type, created_at 
     FROM ad_views 
     WHERE telegram_id = $1 
     ORDER BY created_at DESC 
     LIMIT 100`,
    [telegramId]
  );
  console.log(`\n--- AD VIEWS LOG (Total Ads Logged: ${adViewsRes.rows.length}) ---`);
  
  if (adViewsRes.rows.length > 0) {
    let fastAdCount = 0;
    let Intervals = [];
    for (let i = 0; i < adViewsRes.rows.length - 1; i++) {
      const current = new Date(adViewsRes.rows[i].created_at).getTime();
      const previous = new Date(adViewsRes.rows[i + 1].created_at).getTime();
      const diffSec = (current - previous) / 1000;
      Intervals.push(diffSec);
      if (diffSec < 5) {
        fastAdCount++;
      }
    }
    const avgSec = (Intervals.reduce((a, b) => a + b, 0) / Intervals.length).toFixed(1);
    const minSec = Math.min(...Intervals).toFixed(1);
    console.log(`Average Interval Between Ads: ${avgSec}s`);
    console.log(`Shortest Interval Between Ads: ${minSec}s`);
    console.log(`Fast Ads (<5s threshold): ${fastAdCount} ads out of ${Intervals.length} transitions`);

    console.log('\nLast 15 Ad Views Timestamps:');
    adViewsRes.rows.slice(0, 15).forEach(v => {
      console.log(`  [${v.ad_type}] at ${new Date(v.created_at).toISOString()}`);
    });
  }

  // 4. Gram Claims History
  const claimsRes = await pool.query(
    'SELECT * FROM gram_claims WHERE telegram_id = $1 ORDER BY created_at DESC',
    [telegramId]
  );
  console.log('\n--- GRAM CLAIMS HISTORY ---');
  console.table(claimsRes.rows);

  // 5. Referrals Analysis
  const refsRes = await pool.query(
    'SELECT telegram_id, username, first_name, created_at, is_banned FROM users WHERE referred_by = $1',
    [telegramId]
  );
  console.log('\n--- REFERRED USERS BY THIS ACCOUNT ---');
  console.table(refsRes.rows);

  // 6. NFT Miner Purchase History
  const nftRes = await pool.query(
    'SELECT unc.*, nc.name as nft_name FROM user_nft_cards unc JOIN nft_cards nc ON unc.nft_id = nc.id WHERE unc.telegram_id = $1',
    [telegramId]
  );
  console.log('\n--- NFT MINER CARDS ---');
  console.table(nftRes.rows);

  await pool.end();
}

inspectUser().catch(console.error);

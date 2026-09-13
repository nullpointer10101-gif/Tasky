require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  console.log('\n=== DID CLAIMERS ACTUALLY WATCH ADS? ===\n');

  // Get all users who claimed in last 7 days with their ad watch counts
  const res = await pool.query(`
    SELECT 
      gc.telegram_id,
      gc.id as claim_id,
      gc.amount,
      gc.requested_at,
      gc.status,
      gc.is_flagged,
      gc.flag_reason,
      -- Count gigapub ads watched in 24h window BEFORE their claim
      (SELECT COUNT(*) FROM ad_views av 
       WHERE av.telegram_id = gc.telegram_id 
         AND av.ad_type IN ('gram_ad', 'gram_gigapub')
         AND av.created_at BETWEEN gc.requested_at - INTERVAL '24 hours' AND gc.requested_at
      ) as gigapub_watched,
      -- Count adexium ads watched in 24h window BEFORE their claim
      (SELECT COUNT(*) FROM ad_views av 
       WHERE av.telegram_id = gc.telegram_id 
         AND av.ad_type IN ('gram_adexium', 'gram_monetag')
         AND av.created_at BETWEEN gc.requested_at - INTERVAL '24 hours' AND gc.requested_at
      ) as adexium_watched,
      -- Total ads in 24h window
      (SELECT COUNT(*) FROM ad_views av 
       WHERE av.telegram_id = gc.telegram_id 
         AND av.ad_type IN ('gram_ad', 'gram_gigapub', 'gram_adexium', 'gram_monetag')
         AND av.created_at BETWEEN gc.requested_at - INTERVAL '24 hours' AND gc.requested_at
      ) as total_ads_watched
    FROM gram_claims gc
    WHERE gc.requested_at >= NOW() - INTERVAL '7 days'
    ORDER BY gc.requested_at DESC
    LIMIT 60
  `);

  console.log(`Checking last ${res.rows.length} claims...\n`);

  let legitCount = 0, suspiciousCount = 0, zeroAdsCount = 0;

  const suspicious = [];
  const zeroAds = [];

  for (const r of res.rows) {
    const giga = parseInt(r.gigapub_watched);
    const adexium = parseInt(r.adexium_watched);
    const total = parseInt(r.total_ads_watched);
    const meetsRequirement = giga >= 30 && adexium >= 30;
    const date = new Date(r.requested_at).toISOString().slice(0, 16);

    let icon, status;
    if (total === 0) {
      icon = '🔴 ZERO ADS';
      zeroAdsCount++;
      zeroAds.push(r);
    } else if (!meetsRequirement) {
      icon = '🟡 PARTIAL';
      suspiciousCount++;
      suspicious.push(r);
    } else {
      icon = '✅ LEGIT';
      legitCount++;
    }

    console.log(`${icon} | Claim#${r.claim_id} | TG:${r.telegram_id} | Giga:${giga}/30 Adexium:${adexium}/30 Total:${total} | ${date} | Flag:${r.is_flagged ? r.flag_reason : 'no'}`);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`✅ Legitimate (30+30 ads): ${legitCount}`);
  console.log(`🟡 Partial ads (some watched but <30+30): ${suspiciousCount}`);
  console.log(`🔴 ZERO ADS (claimed with 0 ad views): ${zeroAdsCount}`);

  if (zeroAds.length > 0) {
    console.log('\n🔴 USERS WHO CLAIMED WITH ZERO RECORDED ADS:');
    for (const r of zeroAds) {
      console.log(`  TelegramID: ${r.telegram_id} | ClaimID: ${r.claim_id} | Date: ${new Date(r.requested_at).toISOString().slice(0,16)}`);
    }
    console.log('\n  ⚠️  This could mean:');
    console.log('  1. Old claims before ad tracking was implemented');
    console.log('  2. The ad_views "claimed=TRUE" already wiped the records before this query ran');
    console.log('  3. A bypass vulnerability');
  }

  if (suspicious.length > 0) {
    console.log('\n🟡 USERS WITH PARTIAL AD VIEWS:');
    for (const r of suspicious) {
      console.log(`  TelegramID: ${r.telegram_id} | Giga:${r.gigapub_watched} Adexium:${r.adexium_watched} | Date: ${new Date(r.requested_at).toISOString().slice(0,16)}`);
    }
  }

  // Cross-check: any claim where claimed=TRUE ad_views were wiped — 
  // check if there are ANY ad_views with claimed=TRUE for these users
  console.log('\n--- Checking claimed=TRUE ad_views for ZERO-ads users ---');
  for (const r of zeroAds.slice(0, 5)) {
    const avRes = await pool.query(`
      SELECT COUNT(*) as cnt, MAX(created_at) as last_ad
      FROM ad_views
      WHERE telegram_id = $1
        AND claimed = TRUE
        AND ad_type IN ('gram_ad', 'gram_gigapub', 'gram_adexium', 'gram_monetag')
    `, [r.telegram_id]);
    const av = avRes.rows[0];
    console.log(`  TG:${r.telegram_id} | claimed=TRUE ad_views: ${av.cnt} | last: ${av.last_ad ? new Date(av.last_ad).toISOString().slice(0,16) : 'none'}`);
  }

  await pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });

// Threshold: if a user watched more than this many ads in 24h, their claim is suspicious.
// The legit max is 60 (30 gigapub + 30 adexium). We give a 50% buffer = 90 before flagging.
// This means: watch 61-89 ads = fine. Watch 90+ = auto-flagged, manual review, no auto-payout.
const EXCESS_AD_THRESHOLD = 90;

async function checkFraud(telegram_id, walletAddress, client, adsWatchedToday = 0) {
  const flags = [];

  // 1. Same wallet used by 2+ different telegram accounts
  const walletDupRes = await client.query(
    `SELECT COUNT(DISTINCT telegram_id) as cnt FROM users WHERE wallet_address = $1`,
    [walletAddress]
  );
  if (parseInt(walletDupRes.rows[0]?.cnt || 0) > 1) flags.push('wallet_shared');

  // 2. Referrals all joined in the same 24h window (referral farming)
  const refFarmRes = await client.query(
    `SELECT COUNT(*) as total,
            SUM(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as recent
     FROM users WHERE referred_by = $1`,
    [telegram_id]
  );
  const totalRefs = parseInt(refFarmRes.rows[0]?.total || 0);
  const recentRefs = parseInt(refFarmRes.rows[0]?.recent || 0);
  if (totalRefs > 0 && totalRefs === recentRefs && totalRefs >= 5) flags.push('referral_farm');

  // 3. Excess ad volume — user watched far more ads than the 60-ad claim requirement.
  //    Legit users need exactly 30 gigapub + 30 adexium = 60. Watching 90+ in one day
  //    is a strong signal of automated/scripted ad view injection.
  //    We flag but DON'T block — the claim goes to manual admin review with no auto-payout.
  if (adsWatchedToday >= EXCESS_AD_THRESHOLD) {
    flags.push(`excess_ad_volume:${adsWatchedToday}`);
  }

  if (flags.length > 0) {
    return { flagged: true, reason: flags.join(', ') };
  }
  return { flagged: false, reason: null };
}

module.exports = { checkFraud };

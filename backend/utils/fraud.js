async function checkFraud(telegram_id, walletAddress, client, adsWatchedToday = 0) {
  const flags = [];

  // 1. Same TON or Gram wallet used by 2+ different telegram accounts
  if (walletAddress) {
    const walletDupRes = await client.query(
      `SELECT COUNT(DISTINCT telegram_id) as cnt FROM users WHERE wallet_address = $1 OR gram_wallet_address = $1`,
      [walletAddress]
    );
    if (parseInt(walletDupRes.rows[0]?.cnt || 0) > 1) {
      flags.push('wallet_shared_across_users');
    }

    const claimDupRes = await client.query(
      `SELECT COUNT(DISTINCT telegram_id) as cnt FROM gram_claims WHERE gram_wallet_address = $1 AND telegram_id != $2`,
      [walletAddress, telegram_id]
    );
    if (parseInt(claimDupRes.rows[0]?.cnt || 0) > 0) {
      flags.push('wallet_previously_claimed_by_another_user');
    }
  }

  // 2. Rapid Ad Clustering Check (Anti-Script / Anti-Bot)
  // Audit time gaps between consecutive unclaimed ad views in the last 24h (excluding reactor_usl)
  const adTimestampsRes = await client.query(
    `SELECT created_at FROM ad_views
     WHERE telegram_id = $1 
       AND claimed = FALSE 
       AND ad_type IN ('gram_ad', 'gram_gigapub', 'gram_adexium', 'gram_monetag')
       AND created_at >= NOW() - INTERVAL '24 hours'
     ORDER BY created_at ASC`,
    [telegram_id]
  );

  const adRows = adTimestampsRes.rows;
  if (adRows.length >= 15) {
    let fastGapsCount = 0;
    let totalGapsSec = 0;

    for (let i = 1; i < adRows.length; i++) {
      const prev = new Date(adRows[i - 1].created_at).getTime();
      const curr = new Date(adRows[i].created_at).getTime();
      const gapSec = (curr - prev) / 1000;
      totalGapsSec += gapSec;
      if (gapSec < 8) {
        fastGapsCount++;
      }
    }

    const avgGapSec = totalGapsSec / (adRows.length - 1);
    if (avgGapSec < 8.0) {
      flags.push(`rapid_ad_cluster:avg_${avgGapSec.toFixed(1)}s`);
    } else if (fastGapsCount >= 15) {
      flags.push(`fast_ad_bursts:${fastGapsCount}_under_8s`);
    }
  }

  // 3. Referrals all joined in the same 24h window (referral farming)
  const refFarmRes = await client.query(
    `SELECT COUNT(*) as total,
            SUM(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as recent
     FROM users WHERE referred_by = $1`,
    [telegram_id]
  );
  const totalRefs = parseInt(refFarmRes.rows[0]?.total || 0);
  const recentRefs = parseInt(refFarmRes.rows[0]?.recent || 0);
  if (totalRefs > 0 && totalRefs === recentRefs && totalRefs >= 5) {
    flags.push('referral_farm');
  }

  // Note: Cyber Reactor USL ads (reactor_usl / reactor_ad) have ZERO daily limits.
  // Users are 100% free to binge-watch all 1,000 USL ads in a single day.

  if (flags.length > 0) {
    return { flagged: true, reason: flags.join(', ') };
  }
  return { flagged: false, reason: null };
}

module.exports = { checkFraud };



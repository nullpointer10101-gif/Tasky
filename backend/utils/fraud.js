async function checkFraud(telegram_id, walletAddress, client) {
  const flags = [];

  // 1. Same wallet used by 2+ different telegram accounts
  const walletDupRes = await client.query(
    `SELECT COUNT(DISTINCT telegram_id) as cnt FROM users WHERE wallet_address = $1`,
    [walletAddress]
  );
  if (parseInt(walletDupRes.rows[0]?.cnt || 0) > 1) flags.push('wallet_shared');

  // 3. Referrals all joined in the same 24h window (referral farming)
  const refFarmRes = await client.query(
    `SELECT COUNT(*) as total,
            SUM(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as recent
     FROM users WHERE referred_by = $1`,
    [telegram_id]
  );
  const totalRefs = parseInt(refFarmRes.rows[0]?.total || 0);
  const recentRefs = parseInt(refFarmRes.rows[0]?.recent || 0);
  if (totalRefs > 0 && totalRefs === recentRefs && totalRefs >= 5) flags.push('referral_farm');

  if (flags.length > 0) {
    return { flagged: true, reason: flags.join(', ') };
  }
  return { flagged: false, reason: null };
}

module.exports = { checkFraud };

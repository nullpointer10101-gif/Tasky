const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function deepAudit() {
  const client = await pool.connect();
  try {
    const tourneyRes = await client.query(
      "SELECT * FROM campaign_tournaments WHERE status = 'active' ORDER BY id DESC LIMIT 1"
    );
    const tournament = tourneyRes.rows[0];

    const top30 = await client.query(`
      SELECT 
        u.id as user_db_id,
        u.telegram_id,
        u.username,
        u.first_name,
        u.created_at as account_created_at,
        u.wallet_address,
        u.gram_wallet_address,
        u.is_banned,
        u.total_ads_watched,
        u.total_referrals,
        u.valid_referrals,
        u.mining_level,
        u.streak_days,
        u.referred_by,
        COUNT(a.id) as tournament_ads
      FROM ad_views a
      JOIN users u ON u.telegram_id::text = a.telegram_id::text
      WHERE a.created_at >= $1 AND a.created_at <= $2
      GROUP BY u.id, u.telegram_id, u.username, u.first_name, u.created_at, u.wallet_address, u.gram_wallet_address, u.is_banned, u.total_ads_watched, u.total_referrals, u.valid_referrals, u.mining_level, u.streak_days, u.referred_by
      ORDER BY tournament_ads DESC, u.telegram_id ASC
      LIMIT 30
    `, [tournament.start_at, tournament.end_at]);

    console.log('--- Checking Referral Connections among Top 30 ---');
    const tids = top30.rows.map(r => String(r.telegram_id));
    const tidSet = new Set(tids);

    const clusterMap = [];
    for (const r of top30.rows) {
      if (r.referred_by && tidSet.has(String(r.referred_by))) {
        const parent = top30.rows.find(p => String(p.telegram_id) === String(r.referred_by));
        clusterMap.push({
          child_rank: top30.rows.indexOf(r) + 1,
          child: `@${r.username || 'no_user'} (${r.telegram_id})`,
          parent_rank: top30.rows.indexOf(parent) + 1,
          parent: `@${parent.username || 'no_user'} (${parent.telegram_id})`
        });
      }
    }
    console.log('Referral clusters inside Top 30:', clusterMap);

    // Check users with very similar names or patterns (e.g. ranks 15-22: Chamhip, bien2210, namchien12, anhtam11, danden111, MrBen0111, vanbien2210, LONGVIPPRO12)
    console.log('\n--- Checking Vietnam group (ranks 15-22) ---');
    const vnGroup = top30.rows.slice(14, 22);
    for (const v of vnGroup) {
      console.log(`Rank #${top30.rows.indexOf(v)+1}: TG ${v.telegram_id} | @${v.username} | ${v.first_name} | Created: ${v.account_created_at} | RefBy: ${v.referred_by} | Wallet: ${v.wallet_address}`);
    }

    // Check all wallets in Top 30 for duplicates
    console.log('\n--- Checking Wallet Uniqueness ---');
    const allWallets = top30.rows.map(r => ({
      rank: top30.rows.indexOf(r) + 1,
      tg: r.telegram_id,
      user: r.username,
      wallet: r.wallet_address || r.gram_wallet_address || 'NO_WALLET'
    }));
    const seen = new Map();
    for (const w of allWallets) {
      if (w.wallet !== 'NO_WALLET') {
        if (!seen.has(w.wallet)) seen.set(w.wallet, []);
        seen.get(w.wallet).push(w);
      }
    }
    let duplicateWallets = false;
    for (const [wallet, users] of seen.entries()) {
      if (users.length > 1) {
        duplicateWallets = true;
        console.log(`🚨 DUPLICATE WALLET DETECTED (${wallet}):`, users);
      }
    }
    if (!duplicateWallets) {
      console.log('✅ All 30 users have 100% unique TON/GRAM wallet addresses (or have not set one yet).');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

deepAudit();

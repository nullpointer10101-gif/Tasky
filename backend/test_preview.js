const { pool } = require('./db');
require('dotenv').config();

async function test() {
  const tRes = await pool.query("SELECT * FROM campaign_tournaments WHERE status IN ('ended_pending_admin_payout', 'active') ORDER BY id DESC LIMIT 1");
  const t = tRes.rows[0];
  console.log('Current Tournament in DB:', t);

  const isReferral = (t.tournament_type === 'referral') || (t.title && t.title.toLowerCase().includes('referral') && !t.title.toLowerCase().includes('ad'));
  console.log('isReferral:', isReferral);

  const KNOWN_FRAUD_IDS = ['8222178828', '7810514939', '7366534603', '6828691165'];
  const winnersRes = await pool.query(`
    SELECT 
      u.telegram_id, u.username, u.first_name, u.gram_wallet_address,
      COUNT(a.id) as ads_watched,
      cp.tx_hash, cp.status as payout_status, cp.paid_at
    FROM ad_views a
    JOIN users u ON u.telegram_id::text = a.telegram_id::text
    LEFT JOIN campaign_payouts cp ON cp.tournament_id = $4 AND cp.telegram_id::text = u.telegram_id::text
    WHERE a.created_at >= $1 AND a.created_at <= $2
      AND u.is_banned = FALSE
      AND NOT (u.telegram_id::text = ANY($3))
    GROUP BY u.telegram_id, u.username, u.first_name, u.gram_wallet_address, cp.tx_hash, cp.status, cp.paid_at
    ORDER BY ads_watched DESC, u.telegram_id ASC
    LIMIT 30
  `, [t.start_at, t.end_at, KNOWN_FRAUD_IDS, t.id]);

  console.log('Ad winners count:', winnersRes.rows.length);
  winnersRes.rows.slice(0, 10).forEach((w, i) => {
    console.log(`#${i+1}: @${w.username || w.first_name} (${w.telegram_id}) - Ads: ${w.ads_watched} - Wallet: ${w.gram_wallet_address || 'None'}`);
  });
  await pool.end();
}

test().catch(console.error);

require('dotenv').config();
const { pool } = require('./db.js');
const bot = require('./bot.js');

async function test() {
  try {
    const q = `
      SELECT 
        gc.id as claim_id, gc.gram_wallet_address, gc.amount, gc.requested_at, gc.tx_hash, gc.is_flagged, gc.flag_reason,
        u.telegram_id, u.username, u.first_name, u.created_at, u.total_referrals, u.valid_referrals, u.total_ads_watched,
        (SELECT COUNT(*) FROM swaps WHERE telegram_id = gc.telegram_id AND status = 'done') as approved_swaps_count,
        (SELECT COUNT(*) FROM withdrawals WHERE telegram_id = gc.telegram_id AND status = 'approved') as approved_withdrawals_count,
        (SELECT COUNT(*) FROM gram_claims WHERE telegram_id = gc.telegram_id AND status = 'approved') as approved_gram_claims_count,
        (SELECT COUNT(*) FROM gram_withdrawals WHERE telegram_id = gc.telegram_id AND status = 'approved') as approved_gram_withdrawals_count,
        (SELECT COUNT(*) FROM user_tasks WHERE telegram_id = gc.telegram_id AND status = 'approved') as tasks_completed_count,
        (SELECT COUNT(*) FROM user_nft_cards WHERE telegram_id = gc.telegram_id AND is_completed = false) as active_nfts_count,
        (SELECT COUNT(*) FROM ad_views WHERE telegram_id = gc.telegram_id AND ad_type IN ('gram_ad', 'gram_gigapub', 'gram_monetag') AND created_at >= NOW() - INTERVAL '24 hours') as today_gram_ads_watched,
        (SELECT COUNT(*) FILTER (WHERE ad_type IN ('gram_ad', 'gram_gigapub')) FROM ad_views WHERE telegram_id = gc.telegram_id AND created_at >= NOW() - INTERVAL '24 hours') as today_giga_ads,
        (SELECT COUNT(*) FILTER (WHERE ad_type = 'gram_monetag') FROM ad_views WHERE telegram_id = gc.telegram_id AND created_at >= NOW() - INTERVAL '24 hours') as today_monetag_ads,
        (SELECT ROUND(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))::numeric / 60, 1) FROM ad_views WHERE telegram_id = gc.telegram_id AND ad_type IN ('gram_ad', 'gram_gigapub', 'gram_monetag') AND created_at >= NOW() - INTERVAL '24 hours') as watch_duration_mins,
        (SELECT ROUND((EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))::numeric / NULLIF(COUNT(*) - 1, 0))::numeric, 1) FROM ad_views WHERE telegram_id = gc.telegram_id AND ad_type IN ('gram_ad', 'gram_gigapub', 'gram_monetag') AND created_at >= NOW() - INTERVAL '24 hours') as avg_interval_sec,
        (SELECT MIN(created_at) FROM ad_views WHERE telegram_id = gc.telegram_id AND ad_type IN ('gram_ad', 'gram_gigapub', 'gram_monetag') AND created_at >= NOW() - INTERVAL '24 hours') as first_ad_at,
        (SELECT MAX(created_at) FROM ad_views WHERE telegram_id = gc.telegram_id AND ad_type IN ('gram_ad', 'gram_gigapub', 'gram_monetag') AND created_at >= NOW() - INTERVAL '24 hours') as last_ad_at,
        (SELECT COUNT(*) FROM gram_claims WHERE telegram_id = gc.telegram_id AND requested_at <= gc.requested_at) as claim_seq,
        (SELECT COALESCE(processed_at, requested_at) FROM gram_claims WHERE telegram_id = gc.telegram_id AND status = 'approved' AND id != gc.id ORDER BY COALESCE(processed_at, requested_at) DESC LIMIT 1) as last_claim_at
      FROM gram_claims gc
      JOIN users u ON gc.telegram_id = u.telegram_id
      WHERE gc.status = 'pending'
      ORDER BY gc.requested_at ASC
    `;
    const res = await pool.query(q);
    console.log('Pending claims count:', res.rows.length);
    if (res.rows.length > 0) {
      console.log('Sample claim data:', res.rows[0]);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

test();

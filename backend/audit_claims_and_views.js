require('dotenv').config();
const { pool } = require('./db');

async function audit() {
  console.log('=== 1. CLAIMS AUDIT (LAST 24 HOURS) ===');
  const claimsRes = await pool.query(`
    SELECT gc.id, gc.telegram_id, u.username, u.first_name, gc.amount, gc.status, gc.requested_at, gc.processed_at, gc.tx_hash, gc.is_flagged, gc.flag_reason
    FROM gram_claims gc
    LEFT JOIN users u ON u.telegram_id = gc.telegram_id
    ORDER BY gc.id DESC
    LIMIT 25
  `);
  console.table(claimsRes.rows);

  console.log('\n=== 2. TOTAL STATS TODAY ===');
  const statsRes = await pool.query(`
    SELECT 
      COUNT(*) as total_claims,
      COUNT(*) FILTER (WHERE status = 'approved') as approved_claims,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_claims,
      COUNT(*) FILTER (WHERE status = 'rejected') as rejected_claims,
      COUNT(DISTINCT telegram_id) as unique_users
    FROM gram_claims
    WHERE requested_at >= NOW() - INTERVAL '24 hours'
  `);
  console.table(statsRes.rows);

  console.log('\n=== 3. AD VIEWS TIMING & PACING AUDIT FOR RECENT CLAIM USERS ===');
  const recentClaimUserIds = claimsRes.rows.slice(0, 10).map(r => r.telegram_id);
  
  for (const tid of recentClaimUserIds) {
    const userAds = await pool.query(`
      SELECT id, ad_type, created_at, claimed
      FROM ad_views
      WHERE telegram_id = $1
      ORDER BY id DESC
      LIMIT 10
    `, [tid]);

    const pacingRes = await pool.query(`
      SELECT 
        COUNT(*) as total_views,
        MIN(created_at) as first_ad,
        MAX(created_at) as last_ad,
        EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as duration_seconds
      FROM ad_views
      WHERE telegram_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'
    `, [tid]);

    const p = pacingRes.rows[0];
    const totalViews = parseInt(p.total_views || 0);
    const duration = parseFloat(p.duration_seconds || 0);
    const avgSecPerAd = totalViews > 1 ? (duration / totalViews).toFixed(1) : 0;

    console.log(`User ${tid}: ${totalViews} ads in ${duration.toFixed(0)}s (avg ${avgSecPerAd}s/ad) | First: ${p.first_ad} | Last: ${p.last_ad}`);
  }
}

audit().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

const { pool } = require('./db');

async function investigate() {
  try {
    console.log('=== GRAM REWARD CLAIMS & AD WATCHING ANALYSIS ===\n');

    // 1. General claim counts
    const claimStats = await pool.query(`
      SELECT status, COUNT(*), SUM(amount) as total_gram
      FROM gram_claims
      GROUP BY status
      ORDER BY count DESC
    `);
    console.log('--- Claim Summary by Status ---');
    console.table(claimStats.rows);

    // 2. Recent 15 Claims
    const recentClaims = await pool.query(`
      SELECT c.id, c.telegram_id, u.username, u.first_name, c.gram_wallet_address, c.amount, c.status, c.requested_at, c.tx_hash
      FROM gram_claims c
      LEFT JOIN users u ON c.telegram_id = u.telegram_id
      ORDER BY c.requested_at DESC
      LIMIT 15
    `);
    console.log('\n--- Recent 15 Claims ---');
    console.table(recentClaims.rows.map(r => ({
      id: r.id,
      telegram_id: r.telegram_id,
      user: r.username ? `@${r.username}` : r.first_name,
      amount: r.amount,
      status: r.status,
      requested_at: new Date(r.requested_at).toISOString().replace('T', ' ').substring(0, 19),
      tx: r.tx_hash ? r.tx_hash.substring(0, 15) + '...' : 'N/A'
    })));

    // 3. Ad Views Breakdown by Provider in Last 24 Hours
    const adView24h = await pool.query(`
      SELECT ad_type, COUNT(*) as count, COUNT(DISTINCT telegram_id) as unique_users
      FROM ad_views
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY ad_type
      ORDER BY count DESC
    `);
    console.log('\n--- Ad Views Breakdown (Last 24 Hours) ---');
    console.table(adView24h.rows);

    // 4. Ad Views Breakdown by Provider (All-time)
    const adViewAll = await pool.query(`
      SELECT ad_type, COUNT(*) as count, COUNT(DISTINCT telegram_id) as unique_users
      FROM ad_views
      GROUP BY ad_type
      ORDER BY count DESC
    `);
    console.log('\n--- Ad Views Breakdown (All-Time) ---');
    console.table(adViewAll.rows);

    // 5. Audit last 5 users who submitted claims: check their ad view history
    console.log('\n--- Audit Ad Views for Recent Claim Users ---');
    for (const claim of recentClaims.rows.slice(0, 5)) {
      const userAdCount = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE ad_type IN ('gram_ad', 'gram_gigapub')) as gigapub_count,
          COUNT(*) FILTER (WHERE ad_type IN ('gram_adexium', 'gram_monetag', 'gram_taddy')) as adexium_taddy_count,
          COUNT(*) as total_ads,
          MIN(created_at) as first_ad,
          MAX(created_at) as last_ad
        FROM ad_views
        WHERE telegram_id = $1
          AND created_at <= $2
          AND created_at >= $2::timestamptz - INTERVAL '30 hours'
      `, [claim.telegram_id, claim.requested_at]);

      const adInfo = userAdCount.rows[0];
      const durationMin = adInfo.first_ad && adInfo.last_ad 
        ? ((new Date(adInfo.last_ad) - new Date(adInfo.first_ad)) / 60000).toFixed(1) + ' min'
        : 'N/A';

      console.log(`User ID: ${claim.telegram_id} (@${claim.username || 'N/A'}) | Claimed: ${claim.amount} GRAM | Status: ${claim.status}`);
      console.log(`  └─ GigaPub Ads: ${adInfo.gigapub_count} | Adexium/Taddy Ads: ${adInfo.adexium_taddy_count} | Total Ads Watched Before Claim: ${adInfo.total_ads}`);
      console.log(`  └─ Time Span for Ad Watching: ${durationMin} (First: ${adInfo.first_ad ? new Date(adInfo.first_ad).toISOString().substring(11, 19) : 'N/A'} -> Last: ${adInfo.last_ad ? new Date(adInfo.last_ad).toISOString().substring(11, 19) : 'N/A'})\n`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error running investigation:', err);
    process.exit(1);
  }
}

investigate();

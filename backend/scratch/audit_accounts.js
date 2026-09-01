require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function auditUser(usernameOrName) {
  const userRes = await pool.query(`
    SELECT telegram_id, username, first_name, created_at, balance, is_banned, has_verified_channels 
    FROM users 
    WHERE LOWER(username) LIKE LOWER($1) OR LOWER(first_name) LIKE LOWER($1)
    LIMIT 3
  `, ['%' + usernameOrName + '%']);

  for (const user of userRes.rows) {
    console.log('\n==================================================');
    console.log(`USER: ${user.first_name} (@${user.username || 'NO_USER'}) [ID: ${user.telegram_id}]`);
    console.log(`Created: ${user.created_at} | Banned: ${user.is_banned} | Balance: ${user.balance}`);

    // Fetch ad views for this user
    const adViewsRes = await pool.query(`
      SELECT created_at, ad_type, claimed 
      FROM ad_views 
      WHERE telegram_id = $1 AND ad_type = 'gram_ad'
      ORDER BY created_at ASC
    `, [user.telegram_id]);

    const totalViews = adViewsRes.rows.length;
    console.log(`Total Gram Ad Views: ${totalViews}`);

    if (totalViews > 0) {
      const firstView = adViewsRes.rows[0].created_at;
      const lastView = adViewsRes.rows[totalViews - 1].created_at;
      const timeSpanSec = (new Date(lastView) - new Date(firstView)) / 1000;
      const avgIntervalSec = totalViews > 1 ? (timeSpanSec / (totalViews - 1)).toFixed(1) : 'N/A';

      let minGapSec = 999999;
      let suspiciousFastViews = 0; // Views watched < 2 seconds apart
      for (let i = 1; i < adViewsRes.rows.length; i++) {
        const gap = (new Date(adViewsRes.rows[i].created_at) - new Date(adViewsRes.rows[i-1].created_at)) / 1000;
        if (gap < minGapSec) minGapSec = gap;
        if (gap < 2) suspiciousFastViews++;
      }

      console.log(`First Ad View: ${firstView}`);
      console.log(`Last Ad View:  ${lastView}`);
      console.log(`Total Timespan: ${(timeSpanSec/60).toFixed(1)} minutes (${timeSpanSec}s)`);
      console.log(`Avg Interval Between Ads: ${avgIntervalSec}s`);
      console.log(`Min Gap Between Ads: ${minGapSec.toFixed(2)}s`);
      console.log(`Fast Views (< 2s apart): ${suspiciousFastViews}`);

      let legitStatus = '✅ LEGITIMATE (Natural human pacing)';
      if (suspiciousFastViews > 5 || (totalViews >= 60 && timeSpanSec < 120)) {
        legitStatus = '🚨 SUSPICIOUS / BOT-LIKE (Watching too fast)';
      }
      console.log(`VERDICT: ${legitStatus}`);
    }

    // Claims check
    const claimsRes = await pool.query(`
      SELECT id, status, requested_at, tx_hash 
      FROM gram_claims 
      WHERE telegram_id = $1 
      ORDER BY requested_at DESC
    `, [user.telegram_id]);
    console.log(`Gram Claims History (${claimsRes.rows.length}):`, claimsRes.rows);
  }
}

async function run() {
  const targets = ['Otega', 'Wongpitu22', 'Abuubay22', 'sonasimri', 'Amrhoseinjfri', 'SoniaSinngsisback', 'Hasan', 'Azzalea09'];
  for (const t of targets) {
    await auditUser(t);
  }
  await pool.end();
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

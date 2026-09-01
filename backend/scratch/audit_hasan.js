require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const adViewsRes = await pool.query("SELECT created_at FROM ad_views WHERE telegram_id = '7312796248' AND ad_type = 'gram_ad' ORDER BY created_at ASC");
  const totalViews = adViewsRes.rows.length;
  if (totalViews > 0) {
    const firstView = adViewsRes.rows[0].created_at;
    const lastView = adViewsRes.rows[totalViews - 1].created_at;
    const timeSpanSec = (new Date(lastView) - new Date(firstView)) / 1000;
    let minGapSec = 999999;
    let suspiciousFast = 0;
    for (let i = 1; i < adViewsRes.rows.length; i++) {
      const gap = (new Date(adViewsRes.rows[i].created_at) - new Date(adViewsRes.rows[i-1].created_at)) / 1000;
      if (gap < minGapSec) minGapSec = gap;
      if (gap < 2) suspiciousFast++;
    }
    console.log('Hasan [7312796248] Audit:');
    console.log('Total Views:', totalViews);
    console.log('Total Timespan:', (timeSpanSec/3600).toFixed(2), 'hours');
    console.log('Avg Gap:', (timeSpanSec/(totalViews-1)).toFixed(1), 'seconds');
    console.log('Min Gap:', minGapSec.toFixed(2), 'seconds');
    console.log('Fast Views (<2s apart):', suspiciousFast);
  } else {
    console.log('No views found for Hasan 7312796248');
  }
  await pool.end();
}
run().catch(e => console.error(e));

require('dotenv').config();
const { pool } = require('./db');

async function testStats() {
  const gramStats = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE ad_type IN ('gram_gigapub', 'gram_monetag', 'gram_ad')) as total_quest_ads,
      COUNT(*) FILTER (WHERE ad_type IN ('gram_gigapub', 'gram_monetag')) as total_active_provider_ads,
      COUNT(*) FILTER (WHERE ad_type IN ('gram_gigapub', 'gram_monetag') AND created_at >= CURRENT_DATE) as ads_today,
      COUNT(*) FILTER (WHERE ad_type IN ('gram_gigapub', 'gram_monetag') AND created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE) as ads_yesterday,
      COUNT(*) FILTER (WHERE ad_type = 'gram_gigapub') as gigapub_total,
      COUNT(*) FILTER (WHERE ad_type = 'gram_monetag') as monetag_total,
      COUNT(*) FILTER (WHERE ad_type = 'gram_gigapub' AND created_at >= CURRENT_DATE) as gigapub_today,
      COUNT(*) FILTER (WHERE ad_type = 'gram_monetag' AND created_at >= CURRENT_DATE) as monetag_today,
      COUNT(*) FILTER (WHERE ad_type = 'task_ad') as task_ads_total,
      COUNT(*) FILTER (WHERE ad_type = 'task_ad' AND created_at >= CURRENT_DATE) as task_ads_today,
      COUNT(*) FILTER (WHERE ad_type = 'wallet_ad') as wallet_ads_total,
      COUNT(*) FILTER (WHERE ad_type = 'wallet_ad' AND created_at >= CURRENT_DATE) as wallet_ads_today
    FROM ad_views
  `);
  console.log('Stats Result:', gramStats.rows[0]);

  const chartRes = await pool.query(`
    WITH dates AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
        '1 day'::interval
      )::date AS date
    )
    SELECT 
      TO_CHAR(d.date, 'YYYY-MM-DD') as date,
      COUNT(av.id) FILTER (WHERE av.ad_type IN ('gram_gigapub', 'gram_monetag')) as count,
      COUNT(av.id) FILTER (WHERE av.ad_type = 'gram_gigapub') as gigapub_count,
      COUNT(av.id) FILTER (WHERE av.ad_type = 'gram_monetag') as monetag_count
    FROM dates d
    LEFT JOIN ad_views av ON DATE(av.created_at) = d.date
    GROUP BY d.date
    ORDER BY d.date ASC
  `);
  console.log('Chart Result:', chartRes.rows);

  process.exit(0);
}
testStats();

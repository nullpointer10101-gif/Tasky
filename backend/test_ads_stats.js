require('dotenv').config();
const { pool } = require('./db.js');

async function test() {
  try {
    const q = `
      WITH dates AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '6 days',
          CURRENT_DATE,
          '1 day'::interval
        )::date AS date
      )
      SELECT 
        TO_CHAR(d.date, 'YYYY-MM-DD') as date,
        COUNT(av.id) as count,
        COUNT(av.id) FILTER (WHERE av.ad_type IN ('gram_ad', 'gram_gigapub')) as gigapub_count,
        COUNT(av.id) FILTER (WHERE av.ad_type = 'gram_monetag') as monetag_count
      FROM dates d
      LEFT JOIN ad_views av ON DATE(av.created_at) = d.date
      GROUP BY d.date
      ORDER BY d.date ASC
    `;
    const res = await pool.query(q);
    console.log('Query Results:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

test();

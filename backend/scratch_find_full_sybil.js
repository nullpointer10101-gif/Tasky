const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function findFullSybilCluster() {
  const tRes = await pool.query("SELECT * FROM campaign_tournaments WHERE status = 'active' ORDER BY id DESC LIMIT 1");
  const tournament = tRes.rows[0];

  // Find all users created on Sep 18 who engaged in simultaneous ad bursts or referral loops
  const candidates = await pool.query(`
    SELECT u.telegram_id, u.username, u.first_name, u.created_at, u.referred_by, count(a.id) as ad_count
    FROM users u
    JOIN ad_views a ON a.telegram_id::text = u.telegram_id::text
    WHERE a.created_at >= $1 AND a.created_at <= $2
      AND u.is_banned = FALSE
    GROUP BY u.telegram_id, u.username, u.first_name, u.created_at, u.referred_by
    ORDER BY ad_count DESC
    LIMIT 60
  `, [tournament.start_at, tournament.end_at]);

  console.log('Top 60 active tournament participants:');
  console.table(candidates.rows.map((r, i) => ({
    Rank: i + 1,
    TG_ID: r.telegram_id,
    Username: r.username ? '@' + r.username : 'None',
    Name: r.first_name,
    Ads: r.ad_count,
    Created: new Date(r.created_at).toISOString().slice(0, 16),
    RefBy: r.referred_by
  })));

  await pool.end();
}

findFullSybilCluster();

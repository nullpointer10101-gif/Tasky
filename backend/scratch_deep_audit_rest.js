const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function deepAuditRest() {
  const tRes = await pool.query("SELECT * FROM campaign_tournaments WHERE status = 'active' ORDER BY id DESC LIMIT 1");
  const tournament = tRes.rows[0];

  const users = await pool.query(`
    SELECT 
      u.id, u.telegram_id, u.username, u.first_name, u.created_at, u.referred_by,
      u.wallet_address, u.gram_wallet_address, u.total_referrals, u.streak_days, u.mining_level,
      COUNT(a.id) as tournament_ads
    FROM ad_views a
    JOIN users u ON u.telegram_id::text = a.telegram_id::text
    WHERE a.created_at >= $1 AND a.created_at <= $2
    GROUP BY u.id, u.telegram_id, u.username, u.first_name, u.created_at, u.referred_by, u.wallet_address, u.gram_wallet_address, u.total_referrals, u.streak_days, u.mining_level
    ORDER BY tournament_ads DESC
    LIMIT 30
  `, [tournament.start_at, tournament.end_at]);

  console.log('RANK | TG ID | USERNAME | ADS | CREATED AT | REFERRED BY | STREAK | WALLET');
  console.log('------------------------------------------------------------------------------------------------------------------------');
  users.rows.forEach((u, i) => {
    console.log(
      `#${(i+1).toString().padEnd(2)} | ` +
      `${u.telegram_id.toString().padEnd(11)} | ` +
      `${(u.username ? '@' + u.username : 'NO_USER').padEnd(16)} | ` +
      `${u.tournament_ads.toString().padEnd(5)} | ` +
      `${new Date(u.created_at).toISOString().slice(0,10)} | ` +
      `${(u.referred_by ? u.referred_by.toString() : 'NONE').padEnd(11)} | ` +
      `${u.streak_days.toString().padEnd(6)} | ` +
      `${(u.wallet_address || u.gram_wallet_address || 'NO_WALLET').slice(0, 16)}...`
    );
  });
  await pool.end();
}

deepAuditRest();

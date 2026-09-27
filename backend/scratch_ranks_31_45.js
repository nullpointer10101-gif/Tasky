const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkNext() {
  const tourneyRes = await pool.query("SELECT * FROM campaign_tournaments WHERE status = 'active' ORDER BY id DESC LIMIT 1");
  const tournament = tourneyRes.rows[0];

  const nextUsers = await pool.query(`
    SELECT 
      u.telegram_id, u.username, u.first_name, u.created_at, u.wallet_address, u.gram_wallet_address,
      COUNT(a.id) as tournament_ads
    FROM ad_views a
    JOIN users u ON u.telegram_id::text = a.telegram_id::text
    WHERE a.created_at >= $1 AND a.created_at <= $2
      AND u.is_banned = FALSE
    GROUP BY u.telegram_id, u.username, u.first_name, u.created_at, u.wallet_address, u.gram_wallet_address
    ORDER BY tournament_ads DESC
    OFFSET 30 LIMIT 15
  `, [tournament.start_at, tournament.end_at]);

  console.log('--- Legitimate Users in Ranks 31-45 who step up if Sybils are banned ---');
  console.table(nextUsers.rows.map((r, i) => ({
    Rank: 31 + i,
    TG_ID: r.telegram_id,
    Username: r.username ? '@' + r.username : 'None',
    Name: r.first_name,
    Ads: r.tournament_ads,
    Created: new Date(r.created_at).toISOString().slice(0, 10),
    Wallet: r.wallet_address || r.gram_wallet_address || 'NO_WALLET'
  })));

  await pool.end();
}

checkNext();

const { pool } = require('./db');
require('dotenv').config();

async function fixTournament1() {
  await pool.query(`
    ALTER TABLE campaign_tournaments ADD COLUMN IF NOT EXISTS tournament_type VARCHAR(50) DEFAULT 'ad';
    ALTER TABLE campaign_tournaments ADD COLUMN IF NOT EXISTS winners_count INTEGER DEFAULT 30;
  `);

  const res = await pool.query(`
    UPDATE campaign_tournaments 
    SET tournament_type = 'ad', winners_count = 30 
    WHERE id = 1 OR title ILIKE '%ad%'
    RETURNING *;
  `);
  console.log('Fixed tournament 1:', res.rows);

  // Check payout preview winners for tournament 1
  const winnersRes = await pool.query(`
    SELECT u.telegram_id, u.username, u.first_name, u.gram_wallet_address,
           COUNT(av.id) as score, COUNT(av.id) as ads_watched,
           p.tx_hash, (p.status = 'paid' OR p.tx_hash IS NOT NULL) as is_paid
    FROM ad_views av
    JOIN users u ON u.telegram_id::text = av.telegram_id::text
    LEFT JOIN campaign_payouts p ON p.telegram_id::text = u.telegram_id::text AND p.tournament_id = 1
    WHERE av.created_at >= '2026-09-20 11:45:20.029+00' AND av.created_at <= '2026-09-27 11:45:20.029+00'
      AND u.is_banned = FALSE
    GROUP BY u.telegram_id, u.username, u.first_name, u.gram_wallet_address, p.tx_hash, p.status
    ORDER BY score DESC, u.telegram_id ASC
    LIMIT 30;
  `);

  console.log('Top 5 Ad Championship Winners:');
  winnersRes.rows.slice(0, 5).forEach((w, i) => {
    console.log(`#${i+1} @${w.username || w.first_name} (${w.telegram_id}) - Ads: ${w.ads_watched}, Wallet: ${w.gram_wallet_address || 'None'}`);
  });

  await pool.end();
}

fixTournament1().catch(console.error);

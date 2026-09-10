require('dotenv').config();
const { pool } = require('./db');

async function checkAccount() {
  const telegramId = '6909180225';
  const claims = await pool.query('SELECT id, telegram_id, amount, status, requested_at, tx_hash FROM gram_claims WHERE telegram_id = $1 ORDER BY id DESC LIMIT 3', [telegramId]);
  console.log('User Claims:', claims.rows);
  
  const ads = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE ad_type = 'gram_gigapub' AND claimed = FALSE) as unclaim_giga,
      COUNT(*) FILTER (WHERE ad_type = 'gram_monetag' AND claimed = FALSE) as unclaim_monetag,
      COUNT(*) FILTER (WHERE claimed = TRUE) as claimed_total
    FROM ad_views WHERE telegram_id = $1
  `, [telegramId]);
  console.log('User Ad Status:', ads.rows[0]);
  process.exit(0);
}
checkAccount();

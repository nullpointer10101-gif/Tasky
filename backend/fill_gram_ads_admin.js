require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const ADMIN_ID = '8823265955';

async function check() {
  try {
    // Check recent gram_claims
    const claims = await pool.query(
      "SELECT * FROM gram_claims WHERE telegram_id = $1 ORDER BY requested_at DESC LIMIT 5",
      [ADMIN_ID]
    );
    console.log('Recent gram_claims:', JSON.stringify(claims.rows, null, 2));

    // Check claimed in last 24h
    const block = await pool.query(
      "SELECT COUNT(*) FROM gram_claims WHERE telegram_id = $1 AND requested_at >= NOW() - INTERVAL '24 hours' AND status IN ('pending','approved')",
      [ADMIN_ID]
    );
    console.log('Blocking claims in last 24h:', block.rows[0].count);

    // Check ad count (rolling 24h)
    const ads = await pool.query(
      "SELECT COUNT(*) FROM ad_views WHERE telegram_id = $1 AND ad_type = 'gram_ad' AND created_at >= NOW() - INTERVAL '24 hours'",
      [ADMIN_ID]
    );
    console.log('Gram ads in last 24h:', ads.rows[0].count);

    // Check user wallet
    const user = await pool.query(
      "SELECT gram_wallet_address, wallet_address FROM users WHERE telegram_id = $1",
      [ADMIN_ID]
    );
    console.log('Wallet:', user.rows[0]);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}
check();

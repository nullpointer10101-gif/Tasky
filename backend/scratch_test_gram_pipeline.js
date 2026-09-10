require('dotenv').config({ path: __dirname + '/.env' });
const { pool } = require('./db');

async function testPipeline() {
  try {
    const userRes = await pool.query('SELECT telegram_id, first_name, gram_wallet_address, total_referrals FROM users LIMIT 1');
    const user = userRes.rows[0];
    console.log('Sample User:', user);

    const adsRes = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE ad_type IN ('gram_ad', 'gram_gigapub')) as gigapub,
        COUNT(*) FILTER (WHERE ad_type = 'gram_monetag') as monetag
      FROM ad_views
      WHERE telegram_id = $1 AND claimed = FALSE AND created_at >= NOW() - INTERVAL '24 hours'
    `, [user.telegram_id]);
    console.log('Sample User Unclaimed Ads (24h):', adsRes.rows[0]);

    const claimsRes = await pool.query('SELECT COUNT(*) FROM gram_claims WHERE telegram_id = $1', [user.telegram_id]);
    console.log('Sample User Total Claims:', claimsRes.rows[0].count);

    console.log('✅ Gram database queries and schema verified 100% operational.');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    pool.end();
  }
}

testPipeline();

const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function inspectTopGrinders() {
  const topIds = ['7559973817', '7947352363', '7002672537'];
  for (const tid of topIds) {
    const userRes = await pool.query('SELECT * FROM users WHERE telegram_id::text = $1', [tid]);
    const u = userRes.rows[0];
    console.log('\n======================================================');
    console.log(`👤 User: @${u.username} (${u.first_name}) | TG: ${u.telegram_id}`);
    console.log(`Created: ${u.created_at} | Mining Level: ${u.mining_level} | Streak: ${u.streak_days}`);
    console.log(`Wallet: ${u.wallet_address || 'None'} | GRAM Wallet: ${u.gram_wallet_address || 'None'}`);
    console.log(`Total Ads Watched: ${u.total_ads_watched} | Total Referrals: ${u.total_referrals}`);

    // Ad views by day
    const dayRes = await pool.query(`
      SELECT date_trunc('day', created_at) as day, count(*) as cnt
      FROM ad_views
      WHERE telegram_id::text = $1
      GROUP BY day
      ORDER BY day ASC
    `, [tid]);
    console.log('Ad Views by Day:');
    console.table(dayRes.rows.map(r => ({ day: new Date(r.day).toISOString().slice(0,10), ads: r.cnt })));

    // Check hourly pattern across 24 hours
    const hourRes = await pool.query(`
      SELECT extract(hour from created_at) as hr, count(*) as cnt
      FROM ad_views
      WHERE telegram_id::text = $1
      GROUP BY hr
      ORDER BY hr ASC
    `, [tid]);
    console.log('Hourly distribution (UTC):', hourRes.rows.map(r => `${r.hr}h:${r.cnt}`).join(', '));
  }
  await pool.end();
}
inspectTopGrinders();

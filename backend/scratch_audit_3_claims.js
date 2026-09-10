require('dotenv').config({ path: __dirname + '/.env' });
const { pool } = require('./db');

async function check() {
  try {
    const res = await pool.query(`
      SELECT id, telegram_id, gram_wallet_address, amount, status, requested_at 
      FROM gram_claims 
      WHERE status = 'pending' 
      ORDER BY requested_at DESC
    `);
    console.log('Pending claims count:', res.rows.length);
    
    for (const c of res.rows) {
      console.log('\n====================================');
      console.log('User:', c.telegram_id, '| Claim ID:', c.id, '| Wallet:', c.gram_wallet_address, '| Requested:', c.requested_at);
      const userRes = await pool.query('SELECT telegram_id, first_name, username, created_at, is_banned, total_referrals, referred_by FROM users WHERE telegram_id = $1', [c.telegram_id]);
      console.log('User Info:', userRes.rows[0]);

      // Check user referrals
      const refRes = await pool.query('SELECT telegram_id, first_name, username, created_at, is_banned FROM users WHERE referred_by = $1', [c.telegram_id]);
      console.log(`Referrals (${refRes.rows.length}):`, refRes.rows);

      // Check ad views in the batch for this claim
      const adViews = await pool.query(`
        SELECT id, ad_type, created_at 
        FROM ad_views 
        WHERE telegram_id = $1 
        ORDER BY created_at DESC
        LIMIT 60
      `, [c.telegram_id]);
      
      const rows = adViews.rows.reverse();
      console.log('Recent 60 ad_views count:', rows.length);
      if (rows.length > 0) {
        const firstAd = new Date(rows[0].created_at);
        const lastAd = new Date(rows[rows.length - 1].created_at);
        const totalMinutes = (lastAd - firstAd) / (1000 * 60);
        const avgSecPerAd = rows.length > 1 ? (lastAd - firstAd) / (1000 * (rows.length - 1)) : 0;
        console.log(`Pacing: Total Time = ${totalMinutes.toFixed(2)} mins | Avg Per Ad = ${avgSecPerAd.toFixed(2)}s`);
        
        let shortGaps = 0;
        let instantGaps = 0;
        const sampleGaps = [];
        for (let i = 1; i < rows.length; i++) {
          const gap = (new Date(rows[i].created_at) - new Date(rows[i-1].created_at)) / 1000;
          if (gap < 4) instantGaps++;
          else if (gap < 8) shortGaps++;
          if (i <= 10) sampleGaps.push(`${gap.toFixed(1)}s (${rows[i].ad_type})`);
        }
        console.log(`Gap Analysis: Instant (<4s): ${instantGaps} | Fast (<8s): ${shortGaps}`);
        console.log('First 10 intervals:', sampleGaps.join(', '));
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

check();

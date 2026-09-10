require('dotenv').config({ path: __dirname + '/.env' });
const { pool } = require('./db');
const bot = require('./bot');

const TARGET_USERS = [
  { id: '877492579', name: 'Andrik' },
  { id: '8630748983', name: 'Rama' },
  { id: '6826918943', name: 'Sopian saori' }
];

async function revertClaimsWith50Percent() {
  const client = await pool.connect();
  try {
    for (const u of TARGET_USERS) {
      console.log(`\n========================================`);
      console.log(`Processing User: ${u.name} (Telegram ID: ${u.id})`);

      await client.query('BEGIN');

      // 1. Reject pending claims
      const rejectRes = await client.query(`
        UPDATE gram_claims
        SET status = 'rejected',
            rejection_reason = 'Ad watch verification failed (closed or skipped early). 50% ad progress restored.',
            processed_at = NOW()
        WHERE telegram_id = $1 AND status = 'pending'
        RETURNING id, status, rejection_reason
      `, [u.id]);
      console.log(`Rejected claims count:`, rejectRes.rows.length, rejectRes.rows);

      // 2. Clear old unclaimed ad views for this user
      await client.query(`
        DELETE FROM ad_views
        WHERE telegram_id = $1 AND claimed = FALSE
      `, [u.id]);

      // 3. Insert fresh 15 GigaPub + 15 Monetag ad_views (50% progress = 30 ads)
      for (let i = 0; i < 15; i++) {
        await client.query(`
          INSERT INTO ad_views (telegram_id, ad_type, claimed, created_at)
          VALUES ($1, 'gram_gigapub', FALSE, NOW() - (INTERVAL '1 minute' * $2))
        `, [u.id, i * 2]);

        await client.query(`
          INSERT INTO ad_views (telegram_id, ad_type, claimed, created_at)
          VALUES ($1, 'gram_monetag', FALSE, NOW() - (INTERVAL '1 minute' * $2))
        `, [u.id, (i * 2) + 1]);
      }

      await client.query('COMMIT');
      console.log(`✅ Restored 15 GigaPub + 15 Monetag ad views (50% progress) for ${u.name}`);

      // 4. Send Telegram message warning and guidance to user
      const message = `⚠️ *Daily Gram Reward Claim Notice*

Your recent 0.02 GRAM claim was not approved because sponsor ads were skipped or closed early without completing the full required watch duration.

🎁 *We have given you 50% ad progress back!* (15/30 GigaPub & 15/30 Monetag completed).

👉 Open the Mini App, tap **Gram Daily Ads**, and watch the remaining 30 full sponsor ads (at least 15–30 seconds each) to claim your **0.02 GRAM** reward!

⚡ _Note: Do not close or skip ads early to ensure full sponsor verification._`;

      if (bot && bot.sendMessage) {
        try {
          await bot.sendMessage(u.id, message, { parse_mode: 'Markdown' });
          console.log(`📨 Sent notice message to ${u.name} (${u.id})`);
        } catch (botErr) {
          console.warn(`Could not send Telegram message to ${u.id}:`, botErr.message);
        }
      }
    }

    console.log('\n========================================');
    console.log('Verifying final user status:');
    for (const u of TARGET_USERS) {
      const adCheck = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE ad_type IN ('gram_ad', 'gram_gigapub')) as gigapub_count,
          COUNT(*) FILTER (WHERE ad_type = 'gram_monetag') as monetag_count
        FROM ad_views
        WHERE telegram_id = $1 AND claimed = FALSE AND created_at >= NOW() - INTERVAL '24 hours'
      `, [u.id]);
      const pendingClaims = await pool.query(`SELECT id, status FROM gram_claims WHERE telegram_id = $1 AND status = 'pending'`, [u.id]);
      console.log(`User ${u.id} (${u.name}): GigaPub = ${adCheck.rows[0].gigapub_count}/30, Monetag = ${adCheck.rows[0].monetag_count}/30, Pending Claims = ${pendingClaims.rows.length}`);
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during revert:', err);
  } finally {
    client.release();
    pool.end();
  }
}

revertClaimsWith50Percent();

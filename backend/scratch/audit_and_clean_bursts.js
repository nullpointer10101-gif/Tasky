const { pool } = require('../db');
const bot = require('../bot');

async function auditAndClean() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('--- 1. AUDITING PENDING CLAIMS AND WITHDRAWALS ---');

    // 1A. Pending Gram Claims
    const gramClaimsRes = await client.query(`SELECT * FROM gram_claims WHERE status = 'pending'`);
    console.log(`Found ${gramClaimsRes.rows.length} pending gram claims.`);

    for (const claim of gramClaimsRes.rows) {
      console.log(`Processing Gram Claim #${claim.id} for user ${claim.telegram_id}...`);
      await client.query(`
        UPDATE gram_claims 
        SET status = 'rejected', 
            rejection_reason = 'Invalid ad viewing speed (fast bursts detected). Ads reset.', 
            processed_at = NOW() 
        WHERE id = $1
      `, [claim.id]);

      // Notify User
      if (bot && bot.sendMessage) {
        try {
          await bot.sendMessage(
            claim.telegram_id,
            `❌ <b>GRAM Claim Update</b>\n\n` +
            `Your claim for 0.02 GRAM was not approved.\n\n` +
            `📌 <b>Reason:</b> Invalid ad viewing speed (fast ad bursts) detected.\n\n` +
            `🔄 Your ad count has been reset to 0. Please watch ads legitimately to claim your reward!`,
            { parse_mode: 'HTML' }
          );
          console.log(`Notified ${claim.telegram_id} of claim rejection.`);
        } catch (e) {
          console.error(`Failed to notify ${claim.telegram_id}:`, e.message);
        }
      }
    }

    // 1B. Pending Gram Withdrawals
    const gramWithdrawalsRes = await client.query(`SELECT * FROM gram_withdrawals WHERE status = 'pending'`);
    console.log(`Found ${gramWithdrawalsRes.rows.length} pending gram withdrawals.`);

    for (const w of gramWithdrawalsRes.rows) {
      console.log(`Processing Gram Withdrawal #${w.id} for user ${w.telegram_id}...`);
      await client.query(`
        UPDATE gram_withdrawals 
        SET status = 'rejected', 
            rejection_reason = 'Invalid ad viewing activity detected. Withdrawal rejected.', 
            processed_at = NOW() 
        WHERE id = $1
      `, [w.id]);

      // Refund gram_balance if deducted
      if (w.amount) {
        await client.query(`
          UPDATE users SET gram_balance = COALESCE(gram_balance, 0) + $1 WHERE telegram_id = $2
        `, [w.amount, w.telegram_id]);
      }

      // Notify User
      if (bot && bot.sendMessage) {
        try {
          await bot.sendMessage(
            w.telegram_id,
            `❌ <b>GRAM Withdrawal Update</b>\n\n` +
            `Your withdrawal request for <b>${w.amount} GRAM</b> was rejected.\n\n` +
            `📌 <b>Reason:</b> Unverified or rapid ad activity detected on account.\n\n` +
            `Your balance has been restored. Please contact support if you need assistance.`,
            { parse_mode: 'HTML' }
          );
          console.log(`Notified ${w.telegram_id} of withdrawal rejection.`);
        } catch (e) {
          console.error(`Failed to notify ${w.telegram_id}:`, e.message);
        }
      }
    }

    // 1C. Pending Reactor Claims
    const reactorClaimsRes = await client.query(`SELECT * FROM reactor_claims WHERE status = 'pending'`);
    console.log(`Found ${reactorClaimsRes.rows.length} pending reactor claims.`);

    for (const rClaim of reactorClaimsRes.rows) {
      if (rClaim.is_flagged) {
        console.log(`Rejecting flagged Reactor Claim #${rClaim.id} for user ${rClaim.telegram_id}...`);
        await client.query(`
          UPDATE reactor_claims 
          SET status = 'rejected', 
              rejection_reason = 'Fast burst / unverified ad views detected', 
              reviewed_at = NOW(),
              reviewed_by = 'system_audit'
          WHERE id = $1
        `, [rClaim.id]);

        if (bot && bot.sendMessage) {
          try {
            await bot.sendMessage(
              rClaim.telegram_id,
              `❌ <b>Cyber Reactor Claim Update</b>\n\n` +
              `Your Cyber Reactor claim was not approved.\n\n` +
              `📌 <b>Reason:</b> Unverified ad viewing speed detected.\n\n` +
              `Please watch ads fully without fast-skipping.`,
              { parse_mode: 'HTML' }
            );
          } catch (e) {}
        }
      }
    }

    console.log('--- 2. AUDITING HIGH-VOLUME / FAST-BURST AD USERS IN PAST 24 HOURS ---');

    // Find all users who watched >60 ads or had fast bursts in the last 24h
    const usersRes = await client.query(`
      SELECT telegram_id, COUNT(*) as cnt
      FROM ad_views
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY telegram_id
      HAVING COUNT(*) > 60
    `);

    console.log(`Found ${usersRes.rows.length} users with >60 ads in past 24h.`);

    for (const u of usersRes.rows) {
      const tid = u.telegram_id;
      // Get all ad views in 24h for this user
      const viewsRes = await client.query(`
        SELECT id, created_at
        FROM ad_views
        WHERE telegram_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'
        ORDER BY created_at ASC
      `, [tid]);

      const views = viewsRes.rows;
      let fastCount = 0;
      for (let i = 1; i < views.length; i++) {
        const diffSec = (new Date(views[i].created_at) - new Date(views[i-1].created_at)) / 1000;
        if (diffSec < 10) {
          fastCount++;
        }
      }

      console.log(`User ${tid}: Total ${views.length} ads, Fast Bursts (<10s): ${fastCount}`);

      if (fastCount > 5 || views.length > 90) {
        console.log(`Purging invalid/fast ad_views for user ${tid}...`);
        const delRes = await client.query(`
          DELETE FROM ad_views
          WHERE telegram_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'
        `, [tid]);
        console.log(`Deleted ${delRes.rowCount} ad_views for ${tid}.`);
      }
    }

    await client.query('COMMIT');
    console.log('--- AUDIT & CLEANUP COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Audit failed:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

auditAndClean();

const { pool } = require('./db');
let bot;
try {
  bot = require('./bot');
} catch (e) {
  // Bot might not be initialized
}

async function runAutoApproveAI() {
  const client = await pool.connect();
  try {
    // Fetch up to 10 pending tasks that do NOT require manual proof review.
    // proof_screenshot, proof_url, proof_username tasks must ALWAYS be reviewed by admin.
    const { rows: pendingTasks } = await client.query(`
      SELECT ut.id as user_task_id, ut.telegram_id, t.reward_tasky, t.title, u.username, u.first_name, u.referred_by, u.valid_referrals
      FROM user_tasks ut
      JOIN tasks t ON ut.task_id = t.id
      JOIN users u ON ut.telegram_id = u.telegram_id
      WHERE ut.status = 'pending'
      AND t.verification_type NOT IN ('proof_screenshot', 'proof_url', 'proof_username')
      ORDER BY ut.submitted_at ASC
      LIMIT 10
    `);

    if (pendingTasks.length === 0) {
      return; // Nothing to approve
    }

    console.log(`[Auto AI] Found ${pendingTasks.length} pending tasks. Approving...`);

    for (const task of pendingTasks) {
      await client.query('BEGIN');
      try {
        // Approve task - mark as AI approved
        await client.query(`UPDATE user_tasks SET status = 'approved', reviewed_at = NOW(), approved_by = 'ai' WHERE id = $1`, [task.user_task_id]);
        
        // Add balance
        await client.query(`UPDATE users SET balance = balance + $1 WHERE telegram_id = $2`, [task.reward_tasky, task.telegram_id]);

        // NOTE: AI-approved tasks do NOT count toward referral validation.
        // Only admin-manually-approved tasks count. Referral credit is handled
        // exclusively in the admin review endpoint (/tasks/admin/review).

        await client.query('COMMIT');

        // Notify user - clearly label as AI approved
        if (bot && bot.sendMessage) {
          try { bot.sendMessage(task.telegram_id, `🤖 Auto AI has approved your proof for "${task.title}"! +${task.reward_tasky} TASKY added to your balance.`); } catch (e) {}
        }
      } catch (e) {
        await client.query('ROLLBACK');
        console.error(`[Auto AI] Failed to approve task ${task.user_task_id}:`, e.message);
      }
    }
    console.log(`[Auto AI] Successfully processed ${pendingTasks.length} tasks.`);
  } catch (error) {
    console.error('[Auto AI] Error running auto approve job:', error);
  } finally {
    client.release();
  }
}

function startAutoApproveAI() {
  // Run every 20 minutes (20 * 60 * 1000 ms)
  const intervalMs = 20 * 60 * 1000;
  
  console.log(`[Auto AI] Scheduled to run every 20 minutes.`);
  setInterval(runAutoApproveAI, intervalMs);
  
  // Also run immediately on startup after a small delay
  setTimeout(runAutoApproveAI, 5000);
}

module.exports = { startAutoApproveAI };

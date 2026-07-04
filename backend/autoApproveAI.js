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
    // Fetch up to 10 pending tasks
    const { rows: pendingTasks } = await client.query(`
      SELECT ut.id as user_task_id, ut.telegram_id, t.reward_tasky, t.title, u.username, u.first_name, u.referred_by, u.valid_referrals
      FROM user_tasks ut
      JOIN tasks t ON ut.task_id = t.id
      JOIN users u ON ut.telegram_id = u.telegram_id
      WHERE ut.status = 'pending'
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
        // Approve task
        await client.query(`UPDATE user_tasks SET status = 'approved', reviewed_at = NOW() WHERE id = $1`, [task.user_task_id]);
        
        // Add balance
        await client.query(`UPDATE users SET balance = balance + $1 WHERE telegram_id = $2`, [task.reward_tasky, task.telegram_id]);

        // Referral Logic
        if (task.referred_by) {
            const approvedCountRes = await client.query(
                `SELECT COUNT(*) FROM user_tasks WHERE telegram_id = $1 AND status = 'approved'`,
                [task.telegram_id]
            );
            const approvedCount = parseInt(approvedCountRes.rows[0].count, 10);
            const rulesRes = await client.query('SELECT * FROM referral_rules LIMIT 1');
            const rules = rulesRes.rows[0];

            if (approvedCount >= rules.tasks_required_for_valid && task.valid_referrals === 0) {
                const referrerRes = await client.query(
                    'SELECT * FROM referrals WHERE referrer_telegram_id = $1 AND referred_telegram_id = $2',
                    [task.referred_by, task.telegram_id]
                );
                if (referrerRes.rows.length > 0) {
                    await client.query(`UPDATE users SET balance = balance + $1, valid_referrals = valid_referrals + 1, spins_available = spins_available + $3 WHERE telegram_id = $2`, [rules.reward_per_referral, task.referred_by, rules.spin_reward_per_referral]);
                    await client.query('UPDATE users SET valid_referrals = valid_referrals + 1 WHERE telegram_id = $1', [task.telegram_id]);
                    if (bot && bot.sendMessage) {
                        try { bot.sendMessage(task.referred_by, `🎉 Auto AI Verified: Your referral @${task.username || task.first_name} is now valid! +${rules.reward_per_referral} TASKY and +${rules.spin_reward_per_referral} Spin added.`); } catch (e) {}
                    }
                }
            }
        }

        await client.query('COMMIT');

        // Notify user
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

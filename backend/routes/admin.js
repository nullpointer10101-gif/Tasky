const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bot = require('../bot');

// --- Simple Admin Auth Middleware ---
// Expects an 'x-admin-password' header to match the .env ADMIN_PASSWORD
const adminAuth = (req, res, next) => {
  const password = req.headers['x-admin-password'];
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('ADMIN_PASSWORD not set in .env. Admin routes are disabled.');
    return res.status(403).json({ error: 'Admin panel is not configured.' });
  }
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.use(adminAuth);

// ==========================================
// 1. DASHBOARD STATS
// ==========================================
router.get('/stats', async (req, res) => {
  try {
    const usersRes = await pool.query('SELECT COUNT(*) FROM users');
    const tasksRes = await pool.query("SELECT COUNT(*) FROM user_tasks WHERE status = 'pending'");
    const withdrawalsRes = await pool.query("SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'");
    const balanceRes = await pool.query('SELECT SUM(balance) FROM users');

    res.json({
      totalUsers: parseInt(usersRes.rows[0].count),
      onlineUsers: global.onlineUsers ? global.onlineUsers.size : 0,
      pendingTasks: parseInt(tasksRes.rows[0].count),
      pendingWithdrawals: parseInt(withdrawalsRes.rows[0].count),
      totalCirculatingTasky: parseFloat(balanceRes.rows[0].sum || 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. CONFIGURATION (GLOBAL SETTINGS)
// ==========================================
router.get('/config', async (req, res) => {
  try {
    const wdSettings = await pool.query('SELECT * FROM withdrawal_settings LIMIT 1');
    const refRules = await pool.query('SELECT * FROM referral_rules LIMIT 1');
    
    res.json({
      withdrawal: wdSettings.rows[0] || {},
      referral: refRules.rows[0] || {}
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/config', async (req, res) => {
  const { withdrawal, referral } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    if (withdrawal) {
      await client.query(`
        UPDATE withdrawal_settings 
        SET min_withdrawal_tasky = $1, fee_percent = $2, usdt_rate = $3
      `, [withdrawal.min_withdrawal_tasky, withdrawal.fee_percent, withdrawal.usdt_rate]);
    }

    if (referral) {
      await client.query(`
        UPDATE referral_rules 
        SET reward_per_referral = $1, tasks_required_for_valid = $2, spin_reward_per_referral = $3
      `, [referral.reward_per_referral, referral.tasks_required_for_valid, referral.spin_reward_per_referral]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ==========================================
// 3. TASK REVIEWS
// ==========================================
router.get('/tasks/pending', async (req, res) => {
  try {
    // Join with tasks and users to get full context
    const query = `
      SELECT 
        ut.id as user_task_id, ut.submitted_at, ut.proof_screenshot_url,
        t.id as task_id, t.title, t.reward_tasky, t.verification_type,
        u.telegram_id, u.username, u.first_name
      FROM user_tasks ut
      JOIN tasks t ON ut.task_id = t.id
      JOIN users u ON ut.telegram_id = u.telegram_id
      WHERE ut.status = 'pending'
      ORDER BY ut.submitted_at ASC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tasks/review', async (req, res) => {
  const { user_task_id, action, rejection_reason } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get the task details to find reward and telegram_id
    const utRes = await client.query(`
      SELECT ut.telegram_id, t.reward_tasky, t.title 
      FROM user_tasks ut
      JOIN tasks t ON ut.task_id = t.id
      WHERE ut.id = $1 AND ut.status = 'pending'
    `, [user_task_id]);

    if (utRes.rows.length === 0) throw new Error('Task not found or already reviewed');
    
    const { telegram_id, reward_tasky, title } = utRes.rows[0];

    if (action === 'approve') {
      await client.query(`UPDATE user_tasks SET status = 'approved', reviewed_at = NOW() WHERE id = $1`, [user_task_id]);
      await client.query(`UPDATE users SET balance = balance + $1 WHERE telegram_id = $2`, [reward_tasky, telegram_id]);
      
      if (bot && bot.sendMessage) {
        try {
          await bot.sendMessage(
            telegram_id,
            `🎉 <b>HOORAY! Task Approved!</b> 🎉\n\nYour submission for the task <b>"${title}"</b> has been successfully verified!\n\n<b>+${reward_tasky} TASKY</b> has been added to your balance. 🚀\n\nKeep completing tasks to earn more! 💸`,
            { parse_mode: 'HTML' }
          );
        } catch (e) {
          console.error('Failed to notify user of task approval:', e.message);
        }
      }
    } else if (action === 'reject') {
      await client.query(`UPDATE user_tasks SET status = 'rejected', rejection_reason = $2, reviewed_at = NOW() WHERE id = $1`, [user_task_id, rejection_reason]);
      
      if (bot && bot.sendMessage) {
        try {
          await bot.sendMessage(
            telegram_id,
            `❌ <b>Task Rejected</b>\n\nYour submission for the task <b>"${title}"</b> was rejected.\n\n<b>Reason:</b> ${rejection_reason || 'Did not meet requirements'}\n\nPlease ensure you follow all instructions carefully next time.`,
            { parse_mode: 'HTML' }
          );
        } catch (e) {
          console.error('Failed to notify user of task rejection:', e.message);
        }
      }
    } else {
      throw new Error('Invalid action');
    }

    await client.query('COMMIT');
    res.json({ success: true, message: "Task " + action + "d successfully" });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.post('/tasks/review-all', async (req, res) => {
  const { action, rejection_reason } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (action === 'approve') {
      const pendingRes = await client.query(`
        SELECT ut.telegram_id, SUM(t.reward_tasky) as total_reward
        FROM user_tasks ut
        JOIN tasks t ON ut.task_id = t.id
        WHERE ut.status = 'pending'
        GROUP BY ut.telegram_id
      `);

      if (pendingRes.rows.length > 0) {
        await client.query(`UPDATE user_tasks SET status = 'approved', reviewed_at = NOW() WHERE status = 'pending'`);
        for (const row of pendingRes.rows) {
          await client.query(`UPDATE users SET balance = balance + $1 WHERE telegram_id = $2`, [row.total_reward, row.telegram_id]);
        }
      }
    } else if (action === 'reject') {
      await client.query(`UPDATE user_tasks SET status = 'rejected', rejection_reason = $1, reviewed_at = NOW() WHERE status = 'pending'`, [rejection_reason]);
    } else {
      throw new Error('Invalid action');
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `All pending tasks ${action}d successfully` });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ==========================================
// 4. WITHDRAWALS (MAPPED TO SWAPS)
// ==========================================
router.get('/withdrawals/pending', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id as withdrawal_id, s.tasky_amount, s.receive_amount as usdt_amount, s.receive_token as token, s.wallet_address, s.requested_at,
        u.telegram_id, u.username, u.first_name, u.balance as current_balance
      FROM swaps s
      JOIN users u ON s.telegram_id = u.telegram_id
      WHERE s.status = 'pending'
      ORDER BY s.requested_at ASC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/withdrawals/history', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id as withdrawal_id, s.tasky_amount, s.receive_amount as usdt_amount, s.receive_token as token, s.wallet_address, s.requested_at, s.status, s.rejection_reason,
        u.telegram_id, u.username, u.first_name
      FROM swaps s
      JOIN users u ON s.telegram_id = u.telegram_id
      WHERE s.status IN ('done', 'rejected')
      ORDER BY s.requested_at DESC
      LIMIT 500
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/withdrawals/review', async (req, res) => {
  const { withdrawal_id, action, rejection_reason } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const wRes = await client.query('SELECT telegram_id, tasky_amount FROM swaps WHERE id = $1 AND status = \'pending\'', [withdrawal_id]);
    if (wRes.rows.length === 0) throw new Error('Swap not found or already processed');

    const { telegram_id, tasky_amount } = wRes.rows[0];

    if (action === 'approve') {
      await client.query(`UPDATE swaps SET status = 'done', processed_at = NOW() WHERE id = $1`, [withdrawal_id]);
      await client.query(`UPDATE users SET has_unseen_approved_withdrawal = TRUE, withdrawal_popup_views = 0 WHERE telegram_id = $1`, [telegram_id]);
    } else if (action === 'reject') {
      await client.query(`UPDATE swaps SET status = 'rejected', rejection_reason = $2, processed_at = NOW() WHERE id = $1`, [withdrawal_id, rejection_reason]);
      // Refund the user's TASKY balance since it was rejected
      await client.query(`UPDATE users SET balance = balance + $1 WHERE telegram_id = $2`, [tasky_amount, telegram_id]);
    } else {
      throw new Error('Invalid action');
    }

    await client.query('COMMIT');
    res.json({ success: true, message: "Request " + action + "d successfully" });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ==========================================
// 5. TASK MANAGEMENT
// ==========================================

router.get('/tasks/live', async (req, res) => {
  try {
    const query = `
      SELECT * FROM tasks 
      WHERE is_active = true
      ORDER BY created_at DESC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tasks/create', async (req, res) => {
  const { title, subtitle, type, reward_tasky, action_url, verification_type, icon, telegram_chat_id, category } = req.body;
  try {
    const query = `
      INSERT INTO tasks (title, subtitle, type, reward_tasky, action_url, verification_type, icon, telegram_chat_id, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [title, subtitle, type, reward_tasky, action_url, verification_type, icon || 'Default', telegram_chat_id || null, category || 'internal']);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  const taskId = req.params.id;
  try {
    const query = `UPDATE tasks SET is_active = false WHERE id = $1 RETURNING *`;
    const { rows } = await pool.query(query, [taskId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 6. AD STATISTICS
// ==========================================
router.get('/ads/stats', async (req, res) => {
  try {
    const query = `
      SELECT
        COUNT(*) as total_ads,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as ads_today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE) as ads_yesterday
      FROM ad_views
    `;
    const { rows } = await pool.query(query);
    
    // Get last 7 days for chart
    const chartQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM ad_views
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    const chartRes = await pool.query(chartQuery);

    res.json({
      stats: rows[0],
      chart: chartRes.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 7. USER MANAGEMENT
// ==========================================
router.get('/users', async (req, res) => {
  try {
    const sortBy = req.query.sortBy === 'newest' ? 'created_at DESC' : 'balance DESC';
    const query = `
      SELECT 
        u.id, u.telegram_id, u.username, u.first_name, u.balance, u.total_referrals, u.valid_referrals, u.streak_days, u.is_banned, u.created_at, u.spins_available, u.withdrawal_ads_watched, u.total_ads_watched, u.gram_wallet_address,
        (SELECT COUNT(*) FROM user_tasks ut JOIN tasks t ON ut.task_id = t.id WHERE ut.telegram_id = u.telegram_id AND t.verification_type = 'auto_ad' AND ut.status = 'approved') as task_ads_watched
      FROM users u
      ORDER BY u.${sortBy}
      LIMIT 1000
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:id/history', async (req, res) => {
  const telegramId = req.params.id;
  try {
    const query = `
      SELECT t.title, t.reward_tasky as reward, ut.completed_at 
      FROM user_tasks ut
      JOIN tasks t ON ut.task_id = t.id
      WHERE ut.telegram_id = $1
      ORDER BY ut.completed_at DESC
      LIMIT 200
    `;
    const { rows } = await pool.query(query, [telegramId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:id/ban', async (req, res) => {
  const telegramId = req.params.id;
  const { is_banned } = req.body;
  try {
    await pool.query('UPDATE users SET is_banned = $1 WHERE telegram_id = $2', [is_banned, telegramId]);
    res.json({ success: true, message: `User ${is_banned ? 'banned' : 'unbanned'} successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:id/balance', async (req, res) => {
  const telegramId = req.params.id;
  const { balance } = req.body;
  if (typeof balance !== 'number') return res.status(400).json({ error: 'Invalid balance' });
  try {
    await pool.query('UPDATE users SET balance = $1 WHERE telegram_id = $2', [balance, telegramId]);
    res.json({ success: true, message: 'Balance updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:id/spins', async (req, res) => {
  const telegramId = req.params.id;
  const { spins_to_add } = req.body;
  if (typeof spins_to_add !== 'number') return res.status(400).json({ error: 'Invalid spin count' });
  try {
    await pool.query('UPDATE users SET spins_available = spins_available + $1 WHERE telegram_id = $2', [spins_to_add, telegramId]);
    res.json({ success: true, message: 'Spins added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:id/gram-wallet', async (req, res) => {
  const telegramId = req.params.id;
  const { gram_wallet_address } = req.body;
  try {
    const cleanAddress = gram_wallet_address ? gram_wallet_address.trim() : null;
    await pool.query('UPDATE users SET gram_wallet_address = $1 WHERE telegram_id = $2', [cleanAddress, telegramId]);
    res.json({ success: true, message: 'Gram wallet address updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:id/ton-wallet', async (req, res) => {
  const telegramId = req.params.id;
  const { ton_wallet_address } = req.body;
  try {
    const cleanAddress = ton_wallet_address ? ton_wallet_address.trim() : null;
    await pool.query('UPDATE users SET wallet_address = $1 WHERE telegram_id = $2', [cleanAddress, telegramId]);
    res.json({ success: true, message: 'TON wallet address updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:id/broadcast', async (req, res) => {
  const telegramId = req.params.id;
  const { message } = req.body;
  try {
    if (bot && bot.sendMessage) {
      await bot.sendMessage(telegramId, message, { parse_mode: 'HTML', disable_web_page_preview: true });
      res.json({ success: true, message: 'Message sent successfully' });
    } else {
      res.status(500).json({ error: 'Bot is not configured' });
    }
  } catch (error) {
    console.error('Broadcast failed:', error.message);
    res.status(500).json({ error: 'Failed to send message: ' + error.message });
  }
});

router.post('/users/:id/reset-ads', async (req, res) => {
  const telegramId = req.params.id;
  try {
    await pool.query('UPDATE users SET withdrawal_ads_watched = 0 WHERE telegram_id = $1', [telegramId]);
    res.json({ success: true, message: 'Ads progress reset to 0' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 7. BROADCAST
// ==========================================
router.post('/broadcast', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });
  
  try {
    const { rows } = await pool.query('SELECT telegram_id FROM users WHERE is_banned = FALSE');
    let successCount = 0;
    
    // Asynchronously send to all (don't block response)
    res.json({ success: true, message: `Broadcast started to ${rows.length} users` });

    for (let user of rows) {
      try {
        await bot.sendMessage(user.telegram_id, message, { parse_mode: 'HTML' });
        successCount++;
        // Sleep slightly to avoid rate limiting
        await new Promise(r => setTimeout(r, 50));
      } catch (err) {
        console.error(`Failed to send to ${user.telegram_id}`, err.message);
      }
    }
    console.log(`Broadcast finished: ${successCount} successful`);
  } catch (error) {
    console.error('Broadcast Error:', error);
  }
});

// ==========================================
// 8. SYSTEM SETTINGS
// ==========================================
router.get('/system/maintenance', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM system_settings WHERE key = 'maintenance'");
    if (rows.length > 0) {
      res.json(rows[0].value);
    } else {
      res.json({ active: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/system/maintenance', async (req, res) => {
  const { active } = req.body;
  try {
    await pool.query(
      "INSERT INTO system_settings (key, value) VALUES ('maintenance', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [JSON.stringify({ active: !!active })]
    );
    res.json({ success: true, active: !!active });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 9. MACHINES MANAGEMENT
// ==========================================
router.get('/machines', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM machines ORDER BY sort_order ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/machines', async (req, res) => {
  const { name, rarity, min_holding, speed_bonus_percent, icon_key, reveal_at_holding, sort_order } = req.body;
  try {
    const query = `
      INSERT INTO machines (name, rarity, min_holding, speed_bonus_percent, icon_key, reveal_at_holding, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [name, rarity, min_holding, speed_bonus_percent, icon_key, reveal_at_holding, sort_order]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/machines/:id', async (req, res) => {
  const id = req.params.id;
  const { name, rarity, min_holding, speed_bonus_percent, icon_key, reveal_at_holding, sort_order } = req.body;
  try {
    const query = `
      UPDATE machines 
      SET name = $1, rarity = $2, min_holding = $3, speed_bonus_percent = $4, icon_key = $5, reveal_at_holding = $6, sort_order = $7
      WHERE id = $8 RETURNING *
    `;
    const { rows } = await pool.query(query, [name, rarity, min_holding, speed_bonus_percent, icon_key, reveal_at_holding, sort_order, id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Machine not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/machines/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM user_machines WHERE machine_id = $1', [id]);
    const query = `DELETE FROM machines WHERE id = $1 RETURNING *`;
    const { rows } = await pool.query(query, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Machine not found' });
    res.json({ success: true, message: 'Machine deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 10. SPECIAL OFFER CLAIMS
// ==========================================

// GET /admin/special-offers — list all claims
router.get('/special-offers', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        soc.id, soc.telegram_id, soc.offer_id, soc.status,
        soc.valid_referrals_at_claim, soc.claimed_at, soc.reviewed_at, soc.rejection_reason,
        u.username, u.first_name, u.balance, u.valid_referrals as current_valid_referrals
      FROM special_offer_claims soc
      JOIN users u ON soc.telegram_id = u.telegram_id
      ORDER BY soc.claimed_at DESC
      LIMIT 500
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /admin/special-offers/review — approve or reject
router.post('/special-offers/review', async (req, res) => {
  const { claim_id, action, rejection_reason } = req.body;
  const OFFER_REWARD = 20000;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const claimRes = await client.query(
      "SELECT telegram_id, status FROM special_offer_claims WHERE id = $1",
      [claim_id]
    );
    if (claimRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Claim not found' });
    }

    const { telegram_id, status } = claimRes.rows[0];
    if (status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Claim is not in pending state' });
    }

    if (action === 'approve') {
      await client.query(
        "UPDATE special_offer_claims SET status = 'approved', reviewed_at = NOW() WHERE id = $1",
        [claim_id]
      );
      await client.query(
        'UPDATE users SET balance = balance + $1 WHERE telegram_id = $2',
        [OFFER_REWARD, telegram_id]
      );
      // Notify via Telegram bot
      if (bot && bot.sendMessage) {
        try {
          await bot.sendMessage(
            telegram_id,
            `🎉 <b>Congratulations!</b>\n\nYour Special Offer claim has been <b>approved</b>!\n\n<b>+20,000 TASKY</b> has been added to your balance! 🚀\n\nKeep inviting friends to unlock more rewards!`,
            { parse_mode: 'HTML' }
          );
        } catch (e) {
          console.error('Failed to notify user:', e.message);
        }
      }
    } else if (action === 'reject') {
      await client.query(
        "UPDATE special_offer_claims SET status = 'rejected', rejection_reason = $2, reviewed_at = NOW() WHERE id = $1",
        [claim_id, rejection_reason || 'Requirements not met']
      );
      // Notify user of rejection
      if (bot && bot.sendMessage) {
        try {
          await bot.sendMessage(
            telegram_id,
            `❌ <b>Special Offer Update</b>\n\nYour claim for the <b>Invite 20 Friends</b> offer was not approved.\n\nReason: ${rejection_reason || 'Requirements not met'}\n\nIf you believe this is a mistake, please contact support.`,
            { parse_mode: 'HTML' }
          );
        } catch (e) {
          console.error('Failed to notify user:', e.message);
        }
      }
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid action' });
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `Claim ${action}d successfully` });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ==========================================
// 10. PROMO CODES
// ==========================================
router.get('/promos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM promo_codes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/promos', async (req, res) => {
  const { code, reward_amount, max_uses, expires_at } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO promo_codes (code, reward_amount, max_uses, expires_at) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [code.toUpperCase(), reward_amount, max_uses, expires_at || null]
    );
    res.json({ success: true, promo: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/promos/:id', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE promo_codes SET is_active = $1 WHERE id = $2 RETURNING *`,
      [is_active, id]
    );
    res.json({ success: true, promo: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/promos/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM user_promo_claims WHERE promo_id = $1', [id]);
    await client.query('DELETE FROM promo_codes WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ==========================================
// 11. GRAM CLAIMS (0.02 GRAM REWARD)
// ==========================================
router.get('/gram/claims/pending', async (req, res) => {
  try {
    const query = `
      SELECT 
        gc.id as claim_id, gc.gram_wallet_address, gc.amount, gc.requested_at,
        u.telegram_id, u.username, u.first_name
      FROM gram_claims gc
      JOIN users u ON gc.telegram_id = u.telegram_id
      WHERE gc.status = 'pending'
      ORDER BY gc.requested_at ASC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/gram/claims/history', async (req, res) => {
  try {
    const query = `
      SELECT 
        gc.id as claim_id, gc.gram_wallet_address, gc.amount, gc.requested_at, gc.status, gc.rejection_reason, gc.processed_at,
        u.telegram_id, u.username, u.first_name
      FROM gram_claims gc
      JOIN users u ON gc.telegram_id = u.telegram_id
      WHERE gc.status IN ('approved', 'rejected')
      ORDER BY gc.processed_at DESC
      LIMIT 500
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/gram/claims/review', async (req, res) => {
  const { claim_id, action, rejection_reason } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const claimRes = await client.query('SELECT telegram_id, amount FROM gram_claims WHERE id = $1 AND status = \'pending\'', [claim_id]);
    if (claimRes.rows.length === 0) throw new Error('Claim not found or already processed');

    const { telegram_id, amount } = claimRes.rows[0];

    if (action === 'approve') {
      await client.query(`UPDATE gram_claims SET status = 'approved', processed_at = NOW() WHERE id = $1`, [claim_id]);
      if (bot && bot.sendMessage) {
        try {
          await bot.sendMessage(
            telegram_id,
            `🎉 <b>Gram Reward Approved & Paid!</b> 🎉\n\nYour request for the <b>${amount} GRAM</b> reward has been successfully approved and the payment has been sent to your wallet! 🚀\n\n⚠️ <b>COMPULSORY REQUIREMENT:</b>\nYou <b>MUST</b> take a screenshot of your received payment and share it in our <a href="https://t.me/TaskyOfficialCommunity">Official Community Group</a> immediately.\n\n<i>Failure to share your payment proof will result in a permanent ban from all future rewards!</i>`,
            { parse_mode: 'HTML', disable_web_page_preview: true }
          );
        } catch (e) {
          console.error('Failed to notify user of Gram claim approval:', e.message);
        }
      }
    } else if (action === 'reject') {
      await client.query(`UPDATE gram_claims SET status = 'rejected', rejection_reason = $2, processed_at = NOW() WHERE id = $1`, [claim_id, rejection_reason]);
      if (bot && bot.sendMessage) {
        try {
          await bot.sendMessage(
            telegram_id,
            `❌ <b>Gram Reward Rejected</b>\n\nYour request for the <b>${amount} GRAM</b> reward was rejected.\n\n<b>Reason:</b> ${rejection_reason || 'Did not meet requirements'}\n\nPlease contact support if you think this is an error.`,
            { parse_mode: 'HTML' }
          );
        } catch (e) {
          console.error('Failed to notify user of Gram claim rejection:', e.message);
        }
      }
    } else {
      throw new Error('Invalid action');
    }

    await client.query('COMMIT');
    res.json({ success: true, message: "Claim " + action + "d successfully" });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;


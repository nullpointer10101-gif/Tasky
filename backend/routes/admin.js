const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bot = require('../bot');
const TelegramBot = require('node-telegram-bot-api');
const { broadcastPayoutProof } = require('../utils/payoutChannel');

function getActiveTelegramBot() {
  // Prefer the existing bot instance (already initialized with polling on Render)
  if (bot && !bot.isDummy && typeof bot.sendMessage === 'function') {
    return bot;
  }
  // Only create a fresh standalone instance if the main bot is a dummy
  const candidateTokens = [
    process.env.TELEGRAM_BOT_TOKEN,
    process.env.BOT_TOKEN,
    process.env.TG_BOT_TOKEN,
    process.env.TELEGRAM_TOKEN
  ].filter(t => t && t !== 'your_bot_token_here' && t.trim() !== '');

  if (candidateTokens.length > 0) {
    const fallbackBot = new TelegramBot(candidateTokens[0], { polling: false });
    fallbackBot.isDummy = false;
    return fallbackBot;
  }
  return null;
}

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
    const gramBalanceRes = await pool.query("SELECT COALESCE(SUM(gram_balance), 0) as sum FROM users");

    const gramAdsRes = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE) as yesterday
      FROM ad_views
      WHERE ad_type = 'gram_ad'
    `);
    const todayGramAds = parseInt(gramAdsRes.rows[0].today, 10) || 0;
    const yesterdayGramAds = parseInt(gramAdsRes.rows[0].yesterday, 10) || 0;

    const onlineIds = global.onlineUsers ? Array.from(global.onlineUsers.keys()) : [];
    let activeUsersList = [];
    if (onlineIds.length > 0) {
      const usersDetailsRes = await pool.query(
        'SELECT telegram_id, username, first_name, balance FROM users WHERE telegram_id = ANY($1)',
        [onlineIds.map(id => parseInt(id, 10))]
      );
      activeUsersList = usersDetailsRes.rows.map(u => {
        const tracker = global.onlineUsers.get(u.telegram_id.toString());
        return {
          ...u,
          lastAction: tracker?.lastAction || 'Active',
          timestamp: tracker?.timestamp || Date.now()
        };
      }).sort((a, b) => b.timestamp - a.timestamp);
    }

    const recentLogsList = (global.recentLogs || []).map(log => {
      const matchedUser = activeUsersList.find(u => u.telegram_id.toString() === log.telegram_id);
      return {
        ...log,
        username: matchedUser?.username || log.telegram_id,
        first_name: matchedUser?.first_name || 'User'
      };
    });

    // Pending gram claims & withdrawals for sidebar badges
    let pendingGramClaims = 0;
    let pendingGramWithdrawals = 0;
    try {
      const gcRes = await pool.query("SELECT COUNT(*) FROM gram_claims WHERE status = 'pending'");
      pendingGramClaims = parseInt(gcRes.rows[0].count, 10) || 0;
    } catch (_) {}
    try {
      const gwRes = await pool.query("SELECT COUNT(*) FROM gram_withdrawals WHERE status = 'pending'");
      pendingGramWithdrawals = parseInt(gwRes.rows[0].count, 10) || 0;
    } catch (_) {}

    // New users count today
    const newUsersCountRes = await pool.query(`
      SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE
    `);
    const newUsersToday = parseInt(newUsersCountRes.rows[0].count, 10) || 0;

    // New users list (increased limit to 2000)
    const newUsersRes = await pool.query(`
      SELECT telegram_id, username, first_name, created_at
      FROM users
      WHERE created_at >= CURRENT_DATE
      ORDER BY created_at DESC
      LIMIT 2000
    `);
    const newUsersList = newUsersRes.rows;

    res.json({
      totalUsers: parseInt(usersRes.rows[0].count),
      onlineUsers: global.onlineUsers ? global.onlineUsers.size : 0,
      pendingTasks: parseInt(tasksRes.rows[0].count),
      pendingWithdrawals: parseInt(withdrawalsRes.rows[0].count),
      pendingGramClaims,
      pendingGramWithdrawals,
      totalCirculatingTasky: parseFloat(balanceRes.rows[0].sum || 0),
      totalCirculatingGram: parseFloat(gramBalanceRes.rows[0].sum || 0),
      todayGramAds,
      yesterdayGramAds,
      activeUsersList,
      recentLogsList,
      newUsersToday,
      newUsersList
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. GRAM WATCHERS (Real-time today's viewers)
// ==========================================
router.get('/gram-watchers', async (req, res) => {
  try {
    // Get all users who watched gram ads in the last 48 hours or have pending claims
    const query = `
      WITH active_watchers AS (
        SELECT 
          av.telegram_id,
          COUNT(*) FILTER (WHERE av.claimed = FALSE) as ads_watched,
          MAX(av.created_at) as last_watch_time,
          MIN(av.created_at) as first_watch_time
        FROM ad_views av
        WHERE av.ad_type = 'gram_ad'
          AND av.created_at >= NOW() - INTERVAL '48 hours'
        GROUP BY av.telegram_id
      ),
      pending_claims AS (
        SELECT telegram_id FROM gram_claims WHERE requested_at >= NOW() - INTERVAL '48 hours'
      ),
      all_watchers AS (
        SELECT telegram_id FROM active_watchers
        UNION
        SELECT telegram_id FROM pending_claims
      )
      SELECT 
        aw.telegram_id,
        u.first_name,
        u.username,
        u.gram_wallet_address,
        u.wallet_address,
        COALESCE(aw_data.ads_watched, 0) as ads_watched,
        aw_data.last_watch_time,
        aw_data.first_watch_time,
        EXISTS (
          SELECT 1 FROM gram_claims gc 
          WHERE gc.telegram_id = aw.telegram_id 
            AND gc.status = 'pending'
        ) as has_pending_claim
      FROM all_watchers aw
      LEFT JOIN active_watchers aw_data ON aw_data.telegram_id = aw.telegram_id
      LEFT JOIN users u ON u.telegram_id = aw.telegram_id
      ORDER BY 
        EXISTS (
          SELECT 1 FROM gram_claims gc 
          WHERE gc.telegram_id = aw.telegram_id 
            AND gc.status = 'pending'
        ) DESC,
        COALESCE(aw_data.ads_watched, 0) DESC
    `;
    const watchersRes = await pool.query(query);

    // For each watcher, also check if they claimed in last 24h
    const telegramIds = watchersRes.rows.map(r => r.telegram_id);
    let claimedIds = new Set();
    if (telegramIds.length > 0) {
      const claimsRes = await pool.query(`
        SELECT DISTINCT telegram_id::text FROM gram_claims
        WHERE telegram_id = ANY($1::bigint[])
          AND requested_at >= NOW() - INTERVAL '24 hours'
          AND status IN ('pending', 'approved')
      `, [telegramIds]);
      claimedIds = new Set(claimsRes.rows.map(r => r.telegram_id));
    }

    const watchers = watchersRes.rows.map(r => {
      let adsWatched = parseInt(r.ads_watched, 10);
      const hasClaimedToday = claimedIds.has(r.telegram_id.toString());
      if (hasClaimedToday || r.has_pending_claim) {
        adsWatched = 60; // Force 60/60 if already claimed or pending
      } else {
        adsWatched = Math.min(adsWatched, 60); // Cap at 60 max
      }
      return {
        telegram_id: r.telegram_id,
        first_name: r.first_name || 'Unknown',
        username: r.username || null,
        ads_watched: adsWatched,
        last_watch_time: r.last_watch_time,
        first_watch_time: r.first_watch_time,
        wallet: r.gram_wallet_address || r.wallet_address || null,
        has_wallet: !!(r.gram_wallet_address || r.wallet_address),
        claimed_today: hasClaimedToday,
        has_pending_claim: r.has_pending_claim
      };
    });

    res.json({
      total: watchers.length,
      watchers: watchers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. DETAILED LEADERBOARD & USER ANALYTICS
// ==========================================
router.get('/leaderboard/detailed', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.telegram_id, u.username, u.first_name, u.balance, u.total_referrals, u.valid_referrals,
        u.created_at, u.last_active, u.mining_rate, u.is_banned,
        (SELECT COUNT(*) FROM user_tasks WHERE telegram_id = u.telegram_id AND status = 'approved') as tasks_completed,
        (SELECT COUNT(*) FROM swaps WHERE telegram_id = u.telegram_id AND status = 'done') as swaps_done,
        (SELECT COALESCE(SUM(receive_amount), 0) FROM swaps WHERE telegram_id = u.telegram_id AND status = 'done') as total_withdrawn_usdt
      FROM users u
      ORDER BY u.balance DESC
      LIMIT 100
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. CONFIGURATION (GLOBAL SETTINGS)
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
        SET min_withdrawal_tasky = $1, fee_percent = $2, usdt_rate = $3,
            adsgram_block_id = $4, adsgram_ratio = $5, gigapub_ratio = $6,
            auto_payout_enabled = $7,
            payout_channel_id = $8,
            payout_channel_enabled = $9
      `, [
        withdrawal.min_withdrawal_tasky, 
        withdrawal.fee_percent, 
        withdrawal.usdt_rate,
        withdrawal.adsgram_block_id !== undefined ? withdrawal.adsgram_block_id : '8223',
        withdrawal.adsgram_ratio !== undefined ? Number(withdrawal.adsgram_ratio) : 50,
        withdrawal.gigapub_ratio !== undefined ? Number(withdrawal.gigapub_ratio) : 50,
        withdrawal.auto_payout_enabled === true ? true : false,
        withdrawal.payout_channel_id !== undefined ? (withdrawal.payout_channel_id ? withdrawal.payout_channel_id.trim() : null) : null,
        withdrawal.payout_channel_enabled === false ? false : true
      ]);
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

// Test Telegram Payout Channel broadcast
router.post('/payout-channel/test', async (req, res) => {
  const { channel_id } = req.body;
  try {
    const result = await broadcastPayoutProof(bot, {
      type: 'Demo / Test Payout Proof',
      amount: '0.02',
      token: 'GRAM',
      wallet: 'UQD1_WjEGr_9GM901K9MrnqpMVsJXAN2YNmLNPZoFRJfFxM8',
      tx_hash: 'c5c8ff5c265e3170df6504a39b3628e8188173541dfa7051412fb1da1b827e85',
      telegram_id: '8433403003',
      username: 'TaskyOfficial',
      first_name: 'Test Admin'
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    if (result.skipped) {
      return res.status(400).json({ error: `Broadcast skipped: ${result.reason}. Make sure Payout Channel handle or ID is saved.` });
    }

    res.json({ success: true, message_id: result.message_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
        t.id as task_id, t.title, t.reward_tasky, COALESCE(t.reward_gram, 0) as reward_gram,
        t.verification_type, t.type as task_type, t.category,
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
      SELECT ut.telegram_id, t.reward_tasky, COALESCE(t.reward_gram, 0) as reward_gram, t.title 
      FROM user_tasks ut
      JOIN tasks t ON ut.task_id = t.id
      WHERE ut.id = $1 AND ut.status = 'pending'
    `, [user_task_id]);

    if (utRes.rows.length === 0) throw new Error('Task not found or already reviewed');
    
    const { telegram_id, reward_tasky, reward_gram, title } = utRes.rows[0];

    if (action === 'approve') {
      await client.query(`UPDATE user_tasks SET status = 'approved', reviewed_at = NOW() WHERE id = $1`, [user_task_id]);
      await client.query(`UPDATE users SET balance = balance + $1 WHERE telegram_id = $2`, [reward_tasky, telegram_id]);
      // Credit GRAM balance if task has a gram reward
      if (parseFloat(reward_gram) > 0) {
        await client.query(`UPDATE users SET gram_balance = COALESCE(gram_balance, 0) + $1 WHERE telegram_id = $2`, [reward_gram, telegram_id]);
      }
      
      if (bot && bot.sendMessage) {
        try {
          const gramNote = parseFloat(reward_gram) > 0 ? `\n<b>+${reward_gram} GRAM</b> also credited! 💎` : '';
          await bot.sendMessage(
            telegram_id,
            `🎉 <b>HOORAY! Task Approved!</b> 🎉\n\nYour submission for the task <b>"${title}"</b> has been successfully verified!\n\n<b>+${reward_tasky} TASKY</b> has been added to your balance. 🚀${gramNote}\n\nKeep completing tasks to earn more! 💸`,
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

// Review ALL tasks (with optional exclude_youtube flag)
router.post('/tasks/review-all', async (req, res) => {
  const { action, rejection_reason, exclude_youtube } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ytFilter = exclude_youtube ? "AND (t.type IS NULL OR LOWER(t.type) != 'youtube')" : "";

    if (action === 'approve') {
      const pendingRes = await client.query(`
        SELECT ut.id as user_task_id, ut.telegram_id, t.reward_tasky, COALESCE(t.reward_gram, 0) as reward_gram
        FROM user_tasks ut
        JOIN tasks t ON ut.task_id = t.id
        WHERE ut.status = 'pending' ${ytFilter}
      `);

      if (pendingRes.rows.length > 0) {
        const ids = pendingRes.rows.map(r => parseInt(r.user_task_id, 10));
        await client.query(`UPDATE user_tasks SET status = 'approved', reviewed_at = NOW() WHERE id = ANY($1)`, [ids]);
        
        // Group rewards by user
        const userTotals = {};
        for (const row of pendingRes.rows) {
          const tid = row.telegram_id ? row.telegram_id.toString() : null;
          if (!tid) continue;
          if (!userTotals[tid]) {
            userTotals[tid] = { tasky: 0, gram: 0 };
          }
          userTotals[tid].tasky += parseFloat(row.reward_tasky || 0);
          userTotals[tid].gram += parseFloat(row.reward_gram || 0);
        }

        for (const [tid, rewards] of Object.entries(userTotals)) {
          await client.query(
            `UPDATE users 
             SET balance = balance + $1, 
                 gram_balance = COALESCE(gram_balance, 0) + $2 
             WHERE telegram_id::text = $3::text`, 
            [rewards.tasky, rewards.gram, tid]
          );
        }
      }
      await client.query('COMMIT');
      res.json({ success: true, message: `Approved ${pendingRes.rows.length} pending tasks successfully` });
    } else if (action === 'reject') {
      const pendingRes = await client.query(`
        SELECT ut.id as user_task_id
        FROM user_tasks ut
        JOIN tasks t ON ut.task_id = t.id
        WHERE ut.status = 'pending' ${ytFilter}
      `);
      if (pendingRes.rows.length > 0) {
        const ids = pendingRes.rows.map(r => parseInt(r.user_task_id, 10));
        await client.query(`UPDATE user_tasks SET status = 'rejected', rejection_reason = $1, reviewed_at = NOW() WHERE id = ANY($2)`, [rejection_reason || 'Did not meet requirements', ids]);
      }
      await client.query('COMMIT');
      res.json({ success: true, message: `Rejected ${pendingRes.rows.length} pending tasks successfully` });
    } else {
      throw new Error('Invalid action');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in /tasks/review-all:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Review ALL tasks for a specific user (profile) with optional exclude_youtube flag
router.post('/tasks/review-user', async (req, res) => {
  const { telegram_id, action, rejection_reason, exclude_youtube } = req.body;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ytFilter = exclude_youtube ? "AND (t.type IS NULL OR LOWER(t.type) != 'youtube')" : "";

    const pendingRes = await client.query(`
      SELECT ut.id as user_task_id, t.reward_tasky, COALESCE(t.reward_gram, 0) as reward_gram, t.title
      FROM user_tasks ut
      JOIN tasks t ON ut.task_id = t.id
      WHERE ut.telegram_id::text = $1::text AND ut.status = 'pending' ${ytFilter}
    `, [telegram_id.toString()]);

    if (pendingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.json({ success: true, message: 'No matching pending tasks found for this profile', count: 0 });
    }

    const ids = pendingRes.rows.map(r => parseInt(r.user_task_id, 10));

    if (action === 'approve') {
      let totalReward = 0;
      let totalGram = 0;
      for (const row of pendingRes.rows) {
        totalReward += parseFloat(row.reward_tasky || 0);
        totalGram += parseFloat(row.reward_gram || 0);
      }

      await client.query(`
        UPDATE user_tasks 
        SET status = 'approved', reviewed_at = NOW() 
        WHERE id = ANY($1)
      `, [ids]);

      await client.query(
        `UPDATE users 
         SET balance = balance + $1, 
             gram_balance = COALESCE(gram_balance, 0) + $2 
         WHERE telegram_id::text = $3::text`,
        [totalReward, totalGram, telegram_id.toString()]
      );

      if (bot && bot.sendMessage) {
        try {
          const gramNote = totalGram > 0 ? `\n<b>+${totalGram} GRAM</b> also credited! 💎` : '';
          await bot.sendMessage(
            telegram_id,
            `🎉 <b>HOORAY! ${ids.length} Task(s) Approved!</b> 🎉\n\n<b>+${totalReward} TASKY</b> added to your balance. 🚀${gramNote}\n\nKeep completing tasks to earn more! 💸`,
            { parse_mode: 'HTML' }
          );
        } catch (e) {
          console.error('Failed to notify user of approval:', e.message);
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, message: `Approved ${ids.length} tasks for user`, count: ids.length, ids });
    } else if (action === 'reject') {
      await client.query(`
        UPDATE user_tasks 
        SET status = 'rejected', rejection_reason = $2, reviewed_at = NOW() 
        WHERE id = ANY($1)
      `, [ids, rejection_reason || 'Did not meet requirements']);

      if (bot && bot.sendMessage) {
        try {
          await bot.sendMessage(
            telegram_id,
            `❌ <b>${ids.length} Task(s) Rejected</b>\n\n<b>Reason:</b> ${rejection_reason || 'Did not meet requirements'}\n\nPlease ensure you follow all instructions carefully next time.`,
            { parse_mode: 'HTML' }
          );
        } catch (e) {
          console.error('Failed to notify user of rejection:', e.message);
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, message: `Rejected ${ids.length} tasks for user`, count: ids.length, ids });
    } else {
      throw new Error('Invalid action');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in /tasks/review-user:', error);
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
        s.is_flagged, s.flag_reason,
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
  const { withdrawal_id, action, rejection_reason, tx_hash } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const wRes = await client.query('SELECT telegram_id, tasky_amount, receive_amount, receive_token, wallet_address, tx_hash FROM swaps WHERE id = $1 AND status = \'pending\'', [withdrawal_id]);
    if (wRes.rows.length === 0) throw new Error('Swap not found or already processed');

    const { telegram_id, tasky_amount, receive_amount, receive_token, wallet_address } = wRes.rows[0];
    const finalTxHash = (tx_hash && tx_hash.trim()) ? tx_hash.trim() : (wRes.rows[0].tx_hash ? wRes.rows[0].tx_hash.trim() : null);

    if (action === 'approve') {
      if (!finalTxHash || !finalTxHash.trim()) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Transaction hash or Tonviewer link is mandatory to approve this payout.' });
      }
      await client.query(`UPDATE swaps SET status = 'done', processed_at = NOW(), tx_hash = $2 WHERE id = $1`, [withdrawal_id, finalTxHash.trim()]);
      await client.query(`UPDATE users SET has_unseen_approved_withdrawal = TRUE, withdrawal_popup_views = 0 WHERE telegram_id = $1`, [telegram_id]);
      
      // Fetch user profile for broadcast
      const userRes = await client.query('SELECT username, first_name FROM users WHERE telegram_id = $1', [telegram_id]);
      broadcastPayoutProof(bot, {
        type: 'Token Swap Payout',
        amount: receive_amount,
        token: receive_token || 'USDT',
        wallet: wallet_address,
        tx_hash: finalTxHash,
        telegram_id: telegram_id,
        username: userRes.rows[0]?.username,
        first_name: userRes.rows[0]?.first_name
      }).catch(e => console.error('[PayoutProof] Swap payout error:', e.message));
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
  const { title, subtitle, type, reward_tasky, action_url, verification_type, icon, telegram_chat_id, category, reward_gram, x_subtype } = req.body;
  try {
    const query = `
      INSERT INTO tasks (title, subtitle, type, reward_tasky, action_url, verification_type, icon, telegram_chat_id, category, reward_gram, x_subtype)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      title, 
      subtitle, 
      type, 
      reward_tasky || 0, 
      action_url, 
      verification_type, 
      icon || 'Default', 
      telegram_chat_id || null, 
      category || 'internal',
      reward_gram || 0,
      x_subtype || null
    ]);
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
    const { sortBy, search } = req.query;
    let orderClause = 'u.balance DESC';
    if (sortBy === 'newest') orderClause = 'u.created_at DESC';
    else if (sortBy === 'total_referrals' || sortBy === 'referrals') orderClause = 'u.total_referrals DESC';
    else if (sortBy === 'valid_referrals') orderClause = 'u.valid_referrals DESC';
    else if (sortBy === 'referrals_today') {
      orderClause = `(SELECT COUNT(*) FROM referrals WHERE referrer_telegram_id = u.telegram_id AND created_at >= NOW() - INTERVAL '24 hours') DESC`;
    }

    let whereClause = '';
    const queryParams = [];
    if (search && search.trim() !== '') {
      const isNumber = /^\d+$/.test(search.trim());
      if (isNumber) {
        whereClause = `
          WHERE u.telegram_id = $1
             OR u.username ILIKE $2
             OR u.first_name ILIKE $2
             OR u.wallet_address ILIKE $2
             OR u.gram_wallet_address ILIKE $2
        `;
        queryParams.push(parseInt(search.trim(), 10));
        queryParams.push(`%${search.trim()}%`);
      } else {
        whereClause = `
          WHERE u.username ILIKE $1
             OR u.first_name ILIKE $1
             OR u.wallet_address ILIKE $1
             OR u.gram_wallet_address ILIKE $1
        `;
        queryParams.push(`%${search.trim()}%`);
      }
    }

    const query = `
      SELECT 
        u.id, u.telegram_id, u.username, u.first_name, u.balance, u.gram_balance, u.total_referrals, u.valid_referrals, u.streak_days, u.is_banned, u.created_at, u.spins_available, u.withdrawal_ads_watched, u.total_ads_watched, u.gram_wallet_address, u.referrals_paused,
        (SELECT COUNT(*) FROM user_tasks ut JOIN tasks t ON ut.task_id = t.id WHERE ut.telegram_id = u.telegram_id AND t.verification_type = 'auto_ad' AND ut.status = 'approved') as task_ads_watched,
        (SELECT COUNT(*) FROM referrals WHERE referrer_telegram_id = u.telegram_id AND created_at >= NOW() - INTERVAL '24 hours') as referrals_today
      FROM users u
      ${whereClause}
      ORDER BY ${orderClause}
      LIMIT 1000
    `;
    const { rows } = await pool.query(query, queryParams);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:id/ad-views', async (req, res) => {
  const telegramId = req.params.id;
  const { ad_type } = req.query;
  try {
    const query = `
      SELECT id, created_at, claimed
      FROM ad_views
      WHERE telegram_id = $1 AND ad_type = $2
      ORDER BY created_at DESC
      LIMIT 200
    `;
    const { rows } = await pool.query(query, [telegramId, ad_type || 'gram_ad']);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:id/history', async (req, res) => {
  const telegramId = req.params.id;
  try {
    const taskQuery = `
      SELECT t.title, t.reward_tasky as reward, ut.completed_at 
      FROM user_tasks ut
      JOIN tasks t ON ut.task_id = t.id
      WHERE ut.telegram_id = $1
      ORDER BY ut.completed_at DESC
      LIMIT 200
    `;
    const tasksRes = await pool.query(taskQuery, [telegramId]);

    const adsRes = await pool.query(`
      SELECT id, ad_type, created_at, claimed
      FROM ad_views
      WHERE telegram_id = $1
      ORDER BY created_at DESC
      LIMIT 200
    `, [telegramId]);

    res.json({
      tasks: tasksRes.rows,
      ads: adsRes.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:id/referrals', async (req, res) => {
  const telegramId = req.params.id;
  try {
    const query = `
      SELECT 
        u.telegram_id, u.username, u.first_name, u.balance, u.created_at,
        r.reward_paid as is_valid
      FROM users u
      JOIN referrals r ON u.telegram_id = r.referred_telegram_id
      WHERE u.referred_by = $1
      ORDER BY u.created_at DESC
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

router.post('/users/:id/gram-balance', async (req, res) => {
  const telegramId = req.params.id;
  const { gram_balance } = req.body;
  if (typeof gram_balance !== 'number') return res.status(400).json({ error: 'Invalid GRAM balance' });
  try {
    await pool.query('UPDATE users SET gram_balance = $1 WHERE telegram_id = $2', [gram_balance, telegramId]);
    res.json({ success: true, message: 'GRAM balance updated successfully' });
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

router.post('/users/:id/pause-referrals', async (req, res) => {
  const telegramId = req.params.id;
  const { referrals_paused } = req.body;
  try {
    await pool.query('UPDATE users SET referrals_paused = $1 WHERE telegram_id = $2', [referrals_paused, telegramId]);
    res.json({ success: true, message: `Referrals ${referrals_paused ? 'paused' : 'unpaused'} successfully` });
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
    const insertRes = await pool.query(
      "INSERT INTO pending_broadcasts (message) VALUES ($1) RETURNING id",
      [message]
    );
    const broadcastId = insertRes.rows[0].id;

    if (bot && bot.sendMessage) {
      try {
        const adminId = '8823265955';
        const msg = `📢 *Global Broadcast Preview*\n\nMessage:\n\`\`\`\n${message}\n\`\`\`\n\nDo you want to send this to ALL users?`;
        bot.sendMessage(adminId, msg, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Approve & Send to All', callback_data: `broadcast_global_${broadcastId}` }]
            ]
          }
        });
      } catch (e) {
        console.error('Failed to send broadcast preview:', e.message);
      }
    }

    res.json({ success: true, message: 'Broadcast preview sent to your Telegram Admin Bot for approval!' });
  } catch (error) {
    console.error('Broadcast Error:', error);
    res.status(500).json({ error: 'Failed to start broadcast' });
  }
});

router.post('/broadcast/special-promo', async (req, res) => {
  try {
    const caption = `🚨 <b>NEW 24H OFFER UNLOCKED!</b> 🚨\n\nYou can now instantly claim a massive reward!\n🎁 <b>1 USDT + 20,000 TASKY!</b>\n\nAll you need is <b>10 friends</b>! 🤯`;
    
    const insertRes = await pool.query(
      "INSERT INTO pending_broadcasts (message) VALUES ($1) RETURNING id",
      [caption]
    );
    const broadcastId = insertRes.rows[0].id;

    if (bot && bot.sendMessage) {
      try {
        const adminId = '8823265955';
        const msg = `📢 *Special Promo Broadcast Preview*\n\nDo you want to send the 1 USDT + 20K TASKY promo broadcast (with photo) to ALL users?`;
        bot.sendMessage(adminId, msg, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Approve & Send to All', callback_data: `broadcast_special_promo_${broadcastId}` }]
            ]
          }
        });
      } catch (e) {
        console.error('Failed to send special promo preview:', e.message);
      }
    }

    res.json({ success: true, message: 'Special promo broadcast preview sent to your Telegram Admin Bot for approval!' });
  } catch (error) {
    console.error('Special Promo Broadcast Error:', error);
    res.status(500).json({ error: 'Failed to start special promo broadcast' });
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
  const { code, reward_amount, max_uses, expires_at, reward_gram, require_ref } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO promo_codes (code, reward_amount, max_uses, expires_at, reward_gram, require_ref) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [code.toUpperCase(), reward_amount, max_uses, expires_at || null, reward_gram || 0, require_ref === true]
    );
    const promo = result.rows[0];

    // Notify admin bot with broadcast button
    if (bot && bot.sendMessage) {
      try {
        const adminId = '8823265955';
        const STABLE_APP_URL = 'https://tasky-kohl-six.vercel.app';
        let rewardText = `<b>${promo.reward_amount} TASKY</b>`;
        if (parseFloat(promo.reward_gram || 0) > 0) {
          rewardText += ` & <b>${promo.reward_gram} GRAM</b>`;
        }
        let msg = `<b>[BROADCAST PREVIEW]</b>\n\n🎁 <b>New Daily Gift Code!</b>\n\nA new secret code has been dropped!\nUse the code below in the app to instantly claim <b>${rewardText}</b>!\n\n🎟 <b>Code:</b> <code>${promo.code}</code>\n⚡️ <b>Max Uses:</b> ${promo.max_uses}\n\n`;
        if (promo.require_ref) {
          msg += `⚠️ <b>Note:</b> You must invite 1 new user to claim this code!\n\n`;
        }
        msg += `<i>Hurry! The code expires once all uses are claimed.</i>\n\n---\n<b>Do you want to broadcast this gift code to all users?</b>`;
        
        bot.sendMessage(adminId, msg, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎁 Claim Now (Preview)', web_app: { url: STABLE_APP_URL } }],
              [{ text: '📢 Broadcast to All Users', callback_data: `broadcast_promo_${promo.id}` }]
            ]
          }
        });
      } catch (e) {
        console.error('Failed to send promo admin notification:', e.message);
      }
    }

    res.json({ success: true, promo });
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
        gc.id as claim_id, gc.gram_wallet_address, gc.amount, gc.requested_at, gc.tx_hash, gc.is_flagged, gc.flag_reason,
        u.telegram_id, u.username, u.first_name, u.created_at, u.total_referrals, u.valid_referrals, u.total_ads_watched,
        (SELECT COUNT(*) FROM swaps WHERE telegram_id = gc.telegram_id AND status = 'done') as approved_swaps_count,
        (SELECT COUNT(*) FROM withdrawals WHERE telegram_id = gc.telegram_id AND status = 'approved') as approved_withdrawals_count,
        (SELECT COUNT(*) FROM gram_claims WHERE telegram_id = gc.telegram_id AND status = 'approved') as approved_gram_claims_count,
        (SELECT COUNT(*) FROM gram_withdrawals WHERE telegram_id = gc.telegram_id AND status = 'approved') as approved_gram_withdrawals_count,
        (SELECT COUNT(*) FROM ad_views WHERE telegram_id = gc.telegram_id AND ad_type = 'gram_ad' AND created_at >= NOW() - INTERVAL '24 hours') as today_gram_ads_watched,
        (SELECT COUNT(*) FROM gram_claims WHERE telegram_id = gc.telegram_id AND requested_at <= gc.requested_at) as claim_seq,
        (SELECT COALESCE(processed_at, requested_at) FROM gram_claims WHERE telegram_id = gc.telegram_id AND status = 'approved' AND id != gc.id ORDER BY COALESCE(processed_at, requested_at) DESC LIMIT 1) as last_claim_at
      FROM gram_claims gc
      JOIN users u ON gc.telegram_id = u.telegram_id
      WHERE gc.status = 'pending'
      ORDER BY gc.requested_at ASC
    `;
    const { rows } = await pool.query(query);

    // Fetch live Telegram chat info to provide the latest real Telegram name
    const enrichedRows = await Promise.all(rows.map(async (row) => {
      let liveName = row.first_name || '';
      let liveUsername = row.username || '';
      let hasSuffix = false;
      try {
        if (bot && bot.getChat) {
          const chat = await bot.getChat(row.telegram_id);
          const fName = chat?.first_name || '';
          const lName = chat?.last_name || '';
          liveName = `${fName} ${lName}`.trim() || row.first_name || '';
          if (chat?.username) liveUsername = chat.username;
          
          const fullNameLower = `${fName} ${lName}`.toLowerCase();
          hasSuffix = fullNameLower.includes('tasky');
        }
      } catch (e) {
        // ignore bot errors
      }
      return {
        ...row,
        live_name: liveName,
        live_username: liveUsername,
        has_suffix: hasSuffix
      };
    }));

    res.json(enrichedRows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/gram/claims/history', async (req, res) => {
  try {
    const query = `
      SELECT 
        gc.id as claim_id, gc.gram_wallet_address, gc.amount, gc.requested_at, gc.status, gc.rejection_reason, gc.processed_at, gc.tx_hash, gc.is_flagged, gc.flag_reason,
        u.telegram_id, u.username, u.first_name, u.created_at, u.total_referrals, u.valid_referrals, u.total_ads_watched,
        (SELECT COUNT(*) FROM swaps WHERE telegram_id = gc.telegram_id AND status = 'done') as approved_swaps_count,
        (SELECT COUNT(*) FROM withdrawals WHERE telegram_id = gc.telegram_id AND status = 'approved') as approved_withdrawals_count,
        (SELECT COUNT(*) FROM gram_claims WHERE telegram_id = gc.telegram_id AND status = 'approved') as approved_gram_claims_count,
        (SELECT COUNT(*) FROM gram_withdrawals WHERE telegram_id = gc.telegram_id AND status = 'approved') as approved_gram_withdrawals_count,
        (SELECT COUNT(*) FROM ad_views WHERE telegram_id = gc.telegram_id AND ad_type = 'gram_ad' AND created_at >= gc.requested_at - INTERVAL '24 hours' AND created_at <= gc.requested_at) as today_gram_ads_watched,
        (SELECT COUNT(*) FROM gram_claims WHERE telegram_id = gc.telegram_id AND requested_at <= gc.requested_at) as claim_seq,
        (SELECT COALESCE(processed_at, requested_at) FROM gram_claims WHERE telegram_id = gc.telegram_id AND status = 'approved' AND id != gc.id AND (processed_at < gc.processed_at OR gc.processed_at IS NULL) ORDER BY COALESCE(processed_at, requested_at) DESC LIMIT 1) as last_claim_at
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
  const { claim_id, action, rejection_reason, tx_hash } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const claimRes = await client.query('SELECT telegram_id, amount, gram_wallet_address FROM gram_claims WHERE id = $1 AND status = \'pending\'', [claim_id]);
    if (claimRes.rows.length === 0) throw new Error('Claim not found or already processed');

    const { telegram_id, amount, gram_wallet_address } = claimRes.rows[0];

    if (action === 'approve') {
      if (!tx_hash || !tx_hash.trim()) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Transaction hash or Tonviewer link is mandatory to approve this Gram claim.' });
      }
      await client.query(`UPDATE gram_claims SET status = 'approved', processed_at = NOW(), tx_hash = $2 WHERE id = $1`, [claim_id, tx_hash.trim()]);
      
      // Check referral validity for the user who claimed
      const userRes = await client.query('SELECT referred_by, username, first_name FROM users WHERE telegram_id = $1', [telegram_id]);
      const referred_by = userRes.rows[0]?.referred_by;
      if (referred_by) {
        const { checkReferralValidity } = require('../utils/referral');
        await checkReferralValidity(client, telegram_id, referred_by);
      }

      if (bot && bot.sendMessage) {
        try {
          let txText = '';
          if (tx_hash) {
            const txLink = tx_hash.trim().startsWith('http') ? tx_hash.trim() : `https://tonviewer.com/transaction/${tx_hash.trim()}`;
            txText = `\n🔗 <b>Payment Proof:</b> <a href="${txLink}">View Transaction</a>`;
          }
          await bot.sendMessage(
            telegram_id,
            `🎉 <b>Gram Reward Approved & Paid!</b> 🎉\n\nYour request for the <b>${amount} GRAM</b> reward has been successfully approved and the payment has been sent to your wallet! 🚀${txText}\n\n⚠️ <b>COMPULSORY REQUIREMENT:</b>\nYou <b>MUST</b> take a screenshot of your received payment and share it in our <a href="https://t.me/TaskyOfficialCommunity">Official Community Group</a> immediately.\n\n<i>Failure to share your payment proof will result in a permanent ban from all future rewards!</i>`,
            { parse_mode: 'HTML', disable_web_page_preview: false }
          );
        } catch (e) {
          console.error('Failed to notify user of Gram claim approval:', e.message);
        }
      }

      // Broadcast verified payout proof to official Telegram Payout Channel
      const userFull = userRes.rows[0];
      broadcastPayoutProof(bot, {
        type: 'Daily Quest 0.02 GRAM',
        amount: amount || '0.02',
        token: 'GRAM',
        wallet: gram_wallet_address,
        tx_hash: tx_hash || null,
        telegram_id: telegram_id,
        username: userFull?.username,
        first_name: userFull?.first_name
      }).catch(e => console.error('[PayoutProof] Gram claim error:', e.message));

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

// Global tracking variables for promo & nft broadcasts
global.promoBroadcast = null;
global.nftBroadcast = null;

router.get('/broadcast/promo-status', (req, res) => {
  res.json(global.promoBroadcast);
});

router.get('/broadcast/nft-status', (req, res) => {
  res.json(global.nftBroadcast);
});

router.get('/broadcast/diagnostics', (req, res) => {
  const tokenKeys = ['TELEGRAM_BOT_TOKEN', 'BOT_TOKEN', 'TG_BOT_TOKEN', 'TELEGRAM_TOKEN'];
  const tokenInfo = {};
  tokenKeys.forEach(k => {
    const val = process.env[k];
    tokenInfo[k] = val ? `SET (length=${val.length}, starts=${val.substring(0, 8)}...)` : 'NOT SET';
  });

  const activeBot = getActiveTelegramBot();

  res.json({
    bot_isDummy: bot ? bot.isDummy : 'bot is null',
    bot_hasSendMessage: typeof bot?.sendMessage === 'function',
    bot_hasSendPhoto: typeof bot?.sendPhoto === 'function',
    activeBot_available: activeBot !== null,
    activeBot_isDummy: activeBot ? activeBot.isDummy : 'n/a',
    token_env: tokenInfo,
    node_env: process.env.NODE_ENV || 'not set',
    nft_banner_path_exists: require('fs').existsSync(require('path').join(__dirname, '../public/uploads/nft_banner_official.jpg')),
    last_nft_broadcast: global.nftBroadcast || null
  });
});

router.post('/broadcast/nft', async (req, res) => {
  const { message, target, image_url } = req.body;
  if (!message) return res.status(400).json({ error: 'Message content is required' });

  if (global.nftBroadcast && global.nftBroadcast.status === 'running' && (Date.now() - (global.nftBroadcast.startTime || 0) < 60000)) {
    return res.status(400).json({ error: 'Another NFT broadcast is currently in progress. Please wait 60s.' });
  }

  try {
    const adminIds = ['8823265955'];
    if (process.env.ADMIN_TELEGRAM_ID && !adminIds.includes(process.env.ADMIN_TELEGRAM_ID)) {
      adminIds.push(process.env.ADMIN_TELEGRAM_ID);
    }
    let targets = [];
    if (target === 'admin') {
      targets = adminIds;
    } else {
      const usersRes = await pool.query('SELECT telegram_id FROM users WHERE is_banned = false');
      targets = usersRes.rows.map(r => r.telegram_id);
    }

    console.log(`[NFT BROADCAST] Target: ${target}, Image: ${image_url || 'None'}, AdminIDs: ${adminIds.join(',')}, Targets Count: ${targets.length}`);

    global.nftBroadcast = {
      target,
      image_url: image_url || null,
      total: targets.length,
      success: 0,
      failed: 0,
      status: 'running',
      currentIdx: 0,
      startTime: Date.now()
    };

    // Process asynchronously in background
    (async () => {
      const BATCH_SIZE = 25;
      for (let i = 0; i < targets.length; i += BATCH_SIZE) {
        const batch = targets.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (tid) => {
          try {
            const activeBot = getActiveTelegramBot();
            if (activeBot) {
              const replyMarkup = {
                inline_keyboard: [
                  [{ text: '⚡ Claim Your NFT Miner Now 💎', url: 'https://t.me/TaskyAppbot/app' }]
                ]
              };

              let sent = false;
              if (image_url && typeof activeBot.sendPhoto === 'function') {
                // Always use the URL directly - it's a valid Render HTTPS URL
                // (local file path substitution removed - caused issues on Render)
                try {
                  await activeBot.sendPhoto(tid, image_url, {
                    caption: message,
                    parse_mode: 'HTML',
                    reply_markup: replyMarkup
                  });
                  sent = true;
                } catch (photoErr) {
                  console.warn(`[NFT BROADCAST] photo send error for ${tid}, falling back to text:`, photoErr.message);
                  global.nftBroadcast.lastError = photoErr.message;
                }
              }

              if (!sent && typeof activeBot.sendMessage === 'function') {
                try {
                  await activeBot.sendMessage(tid, message, {
                    parse_mode: 'HTML',
                    reply_markup: replyMarkup
                  });
                  sent = true;
                } catch (sendErr) {
                  console.error(`[NFT BROADCAST] text send error for ${tid}:`, sendErr.message);
                  global.nftBroadcast.lastError = sendErr.message;
                }
              }

              if (sent) {
                global.nftBroadcast.success++;
              } else {
                global.nftBroadcast.failed++;
              }
            } else {
              console.error(`[NFT BROADCAST] Bot instance missing or dummy bot for tid ${tid}`);
              global.nftBroadcast.failed++;
              global.nftBroadcast.lastError = 'Telegram Bot token not provided on server';
            }
          } catch (e) {
            console.error(`[NFT BROADCAST] Outer catch error for ${tid}:`, e.message, e.stack);
            if (global.nftBroadcast) {
              global.nftBroadcast.failed++;
              global.nftBroadcast.lastError = `[outer] ${e.message}`;
            }
          }
        }));

        global.nftBroadcast.currentIdx = Math.min(i + BATCH_SIZE, targets.length);
        await new Promise(r => setTimeout(r, 1000));
      }
      global.nftBroadcast.status = 'completed';
    })();

    res.json({ success: true, message: `NFT Broadcast started for ${targets.length} target(s).` });
  } catch (err) {
    console.error('Error starting NFT broadcast:', err);
    res.status(500).json({ error: 'Failed to start NFT broadcast' });
  }
});

router.post('/broadcast/promo', async (req, res) => {
  const { code, target } = req.body;
  if (!code) return res.status(400).json({ error: 'Promo code is required' });

  if (global.promoBroadcast && global.promoBroadcast.status === 'running' && (Date.now() - (global.promoBroadcast.startTime || 0) < 60000)) {
    return res.status(400).json({ error: 'Another broadcast is currently in progress.' });
  }

  const text = `🎉 <b>NEW PROMO CODE RELEASED!</b> 🎉\n\nClaim your reward now using this code inside the app:\n👉 <code>${code.toUpperCase()}</code> 👈\n<i>(Tap the code above to copy it)</i>\n\n🚀 Open the app and enter the code to redeem!`;

  try {
    const adminIds = ['8823265955'];
    if (process.env.ADMIN_TELEGRAM_ID && !adminIds.includes(process.env.ADMIN_TELEGRAM_ID)) {
      adminIds.push(process.env.ADMIN_TELEGRAM_ID);
    }
    let targets = [];
    if (target === 'admin') {
      targets = adminIds;
    } else {
      const usersRes = await pool.query('SELECT telegram_id FROM users WHERE is_banned = false');
      targets = usersRes.rows.map(r => r.telegram_id);
    }

    console.log(`[PROMO BROADCAST] Code: ${code}, Target: ${target}, AdminIDs: ${adminIds.join(',')}, Targets Count: ${targets.length}, Targets List:`, targets);

    global.promoBroadcast = {
      code: code.toUpperCase(),
      target,
      total: targets.length,
      success: 0,
      failed: 0,
      status: 'running',
      currentIdx: 0
    };

    // Process asynchronously in background
    (async () => {
      const BATCH_SIZE = 25;
      for (let i = 0; i < targets.length; i += BATCH_SIZE) {
        const batch = targets.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (tid) => {
          try {
            if (bot && bot.sendMessage) {
              await bot.sendMessage(tid, text, { 
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🎁 Open App & Claim Reward 🚀', url: 'https://t.me/TaskyAppbot/app' }]
                  ]
                }
              });
              global.promoBroadcast.success++;
            } else {
              throw new Error('Telegram Bot is not initialized');
            }
          } catch (err) {
            console.error(`[PROMO BROADCAST] Failed to send to ${tid}:`, err.message);
            global.promoBroadcast.failed++;
          }
        }));
        global.promoBroadcast.currentIdx = Math.min(i + BATCH_SIZE, targets.length);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      global.promoBroadcast.status = 'done';
      console.log(`[PROMO BROADCAST] Finished! Success: ${global.promoBroadcast.success}, Failed: ${global.promoBroadcast.failed}`);
    })();

    res.json({ success: true, message: 'Broadcast started' });
  } catch (error) {
    console.error('[PROMO BROADCAST] Error in route:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Global tracking variables for gram reminder broadcasts
global.gramReminderBroadcast = null;

router.get('/broadcast/gram-reminder-status', (req, res) => {
  res.json(global.gramReminderBroadcast);
});

router.post('/broadcast/gram-reminder', async (req, res) => {
  const { target, templateIndex } = req.body;

  if (global.gramReminderBroadcast && global.gramReminderBroadcast.status === 'running' && (Date.now() - (global.gramReminderBroadcast.startTime || 0) < 60000)) {
    return res.status(400).json({ error: 'Another Gram reminder broadcast is currently in progress.' });
  }

  const idx = parseInt(templateIndex, 10) || 0;
  const templates = [
    {
      text: `⚠️ <b>You have not claimed your daily GRAM reward yet!</b>\n\nGo complete your 60 daily ads now and claim your <b>0.02 GRAM</b> reward directly to your TON wallet!\n\n💎 <b>Claim your GRAM now:</b>`,
      button: "🎁 Claim GRAM 🚀"
    },
    {
      text: `🔥 <b>Free GRAM waiting to be claimed!</b>\n\nDon't miss out on your daily yield. Watch your 60 short ads now and unlock <b>0.02 GRAM</b> paid instantly to your wallet!\n\n⚡️ <b>Get your free GRAM tokens here:</b>`,
      button: "💎 Claim Free GRAM 🚀"
    },
    {
      text: `🚀 <b>Ad slots refreshed! Ready for GRAM?</b>\n\nWatch 60 ads inside the Tasky Mini App to grab your daily <b>0.02 GRAM</b> reward. Fast, easy, and direct to your TON wallet.\n\n👉 <b>Click below to start:</b>`,
      button: "📲 Watch & Earn GRAM 🎁"
    },
    {
      text: `🚨 <b>URGENT: Gram rewards are filling up fast!</b>\n\nDaily cap is reaching limit. Finish your 60 ads right now and secure your <b>0.02 GRAM</b> direct payout before it resets!\n\n💰 <b>Secure your payout here:</b>`,
      button: "⚡️ Secure My GRAM Now 💵"
    },
    {
      text: `🏆 <b>Boost your Tasky status with free GRAM!</b>\n\nDaily active miners are already claiming. Watch your 60 ads to unlock <b>0.02 GRAM</b> and increase your daily rank!\n\n💎 <b>Claim & Rank Up:</b>`,
      button: "🚀 Claim My Daily Yield 🏆"
    }
  ];

  const selectedTemplate = templates[idx] || templates[0];
  const text = selectedTemplate.text;
  const buttonText = selectedTemplate.button;

  try {
    const adminIds = ['8823265955'];
    if (process.env.ADMIN_TELEGRAM_ID && !adminIds.includes(process.env.ADMIN_TELEGRAM_ID)) {
      adminIds.push(process.env.ADMIN_TELEGRAM_ID);
    }
    let targets = [];
    if (target === 'admin') {
      targets = adminIds;
    } else {
      const query = `
        SELECT telegram_id FROM users 
        WHERE is_banned = false 
          AND telegram_id IS NOT NULL
          AND telegram_id NOT IN (
            SELECT telegram_id FROM gram_claims 
            WHERE telegram_id IS NOT NULL
              AND requested_at >= NOW() - INTERVAL '24 hours'
              AND status IN ('pending', 'approved')
          )
          AND telegram_id NOT IN (
            SELECT telegram_id FROM ad_views
            WHERE telegram_id IS NOT NULL
              AND ad_type = 'gram_ad'
              AND claimed = FALSE
              AND created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY telegram_id
            HAVING COUNT(*) >= 60
          )
      `;
      const usersRes = await pool.query(query);
      targets = usersRes.rows.map(r => r.telegram_id);
    }

    console.log(`[GRAM REMINDER BROADCAST] Target: ${target}, AdminIDs: ${adminIds.join(',')}, Targets Count: ${targets.length}`);

    global.gramReminderBroadcast = {
      target,
      total: targets.length,
      success: 0,
      failed: 0,
      status: 'running',
      currentIdx: 0,
      templateIndex: idx
    };

    // Process asynchronously in background
    (async () => {
      const BATCH_SIZE = 25;
      for (let i = 0; i < targets.length; i += BATCH_SIZE) {
        const batch = targets.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (tid) => {
          try {
            const activeBot = getActiveTelegramBot();
            if (activeBot) {
              await activeBot.sendMessage(tid, text, { 
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: buttonText, url: "https://t.me/TaskyAppbot/app" }]
                  ]
                }
              });
              global.gramReminderBroadcast.success++;
            } else {
              global.gramReminderBroadcast.failed++;
            }
          } catch (err) {
            console.error(`[GRAM BROADCAST] Failed for ${tid}:`, err.message);
            global.gramReminderBroadcast.failed++;
          }
        }));
        global.gramReminderBroadcast.currentIdx = Math.min(i + BATCH_SIZE, targets.length);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      global.gramReminderBroadcast.status = 'completed';
      console.log(`[GRAM BROADCAST] Finished! Success: ${global.gramReminderBroadcast.success}, Failed: ${global.gramReminderBroadcast.failed}`);
    })();

    res.json({ success: true, message: 'Gram reminder broadcast started' });
  } catch (error) {
    console.error('[GRAM BROADCAST] Error in route:', error.message);
    res.status(500).json({ error: error.message });
  }
});


// ─── GRAM CURRENCY WITHDRAWAL MANAGEMENT ─────────────────────────────────────

// GET /api/admin/gram-withdrawals — list all gram withdrawal requests
router.get('/gram-withdrawals', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT gw.*, u.username, u.first_name
      FROM gram_withdrawals gw
      LEFT JOIN users u ON gw.telegram_id = u.telegram_id
      ORDER BY gw.requested_at DESC
      LIMIT 200
    `);

    const enriched = await Promise.all(rows.map(async (r) => {
      let liveName = r.first_name || '';
      let liveUsername = r.username || '';
      let hasSuffix = false;
      try {
        if (bot && bot.getChat) {
          const chat = await bot.getChat(r.telegram_id);
          const fName = chat?.first_name || '';
          const lName = chat?.last_name || '';
          liveName = `${fName} ${lName}`.trim() || r.first_name || '';
          if (chat?.username) liveUsername = chat.username;
          const fullNameLower = `${fName} ${lName}`.toLowerCase();
          hasSuffix = fullNameLower.includes('tasky');
        }
      } catch (e) {}
      return {
        ...r,
        live_name: liveName,
        live_username: liveUsername,
        has_suffix: hasSuffix
      };
    }));

    res.json(enriched);
  } catch (err) {
    console.error('Error fetching gram withdrawals:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/gram-withdrawals/:id/approve
router.post('/gram-withdrawals/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { tx_hash } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const wRes = await client.query(
      `SELECT * FROM gram_withdrawals WHERE id = $1 AND status = 'pending' FOR UPDATE`,
      [id]
    );
    if (wRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Withdrawal not found or already processed' });
    }
    const w = wRes.rows[0];

    if (!tx_hash || !tx_hash.trim()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Transaction hash or Tonviewer link is mandatory to approve this GRAM withdrawal.' });
    }
    await client.query(
      `UPDATE gram_withdrawals SET status = 'approved', processed_at = NOW(), tx_hash = $2 WHERE id = $1`,
      [id, tx_hash.trim()]
    );

    // Check referral validity for the user who withdrew
    const userRes = await client.query('SELECT referred_by, username, first_name FROM users WHERE telegram_id = $1', [w.telegram_id]);
    const referred_by = userRes.rows[0]?.referred_by;
    if (referred_by) {
      const { checkReferralValidity } = require('../utils/referral');
      await checkReferralValidity(client, w.telegram_id, referred_by);
    }

    await client.query('COMMIT');
    // Notify user
    if (bot && bot.sendMessage) {
      try {
        let txText = '';
        if (tx_hash) {
          const txLink = tx_hash.trim().startsWith('http') ? tx_hash.trim() : `https://tonviewer.com/transaction/${tx_hash.trim()}`;
          txText = `\n🔗 <b>Payment Proof:</b> <a href="${txLink}">View Transaction</a>`;
        }
        bot.sendMessage(
          w.telegram_id,
          `💎 <b>GRAM Withdrawal Approved!</b> 💎\n\n💰 <b>Amount:</b> <code>${w.amount} GRAM</code>\n🏦 <b>Address:</b> <code>${w.wallet_address}</code>\n\n🚀 Your GRAM withdrawal request has been successfully approved and is on the way!${txText}\n\n📢 <b>SHARE PROOF TO GET REWARDS:</b>\nShare a screenshot of your payment proof in our community to qualify for future bonus rewards:\n👉 <a href="https://t.me/TaskyOfficialCommunity">Join Tasky Official Community</a>\n\nThank you! 💎`,
          { parse_mode: 'HTML', disable_web_page_preview: false }
        );
      } catch (e) {}
    }

    // Check if user owns an NFT card for special NFT Payout Proof branding
    let isNftUser = false;
    let userNftName = null;
    try {
      const nftCheck = await pool.query(`
        SELECT nc.name 
        FROM user_nft_cards unc 
        JOIN nft_cards nc ON unc.nft_id = nc.id 
        WHERE unc.telegram_id = $1 
        ORDER BY unc.purchased_at DESC LIMIT 1
      `, [w.telegram_id]);
      if (nftCheck.rows.length > 0) {
        isNftUser = true;
        userNftName = nftCheck.rows[0].name;
      }
    } catch (e) {
      console.error('[AdminApprove] NFT check error:', e.message);
    }

    // Broadcast to official Telegram Payout Channel
    broadcastPayoutProof(bot, {
      type: isNftUser ? 'NFT Miner Return' : 'Gram Balance Withdrawal',
      amount: w.amount,
      token: 'GRAM',
      wallet: w.wallet_address,
      tx_hash: tx_hash || null,
      telegram_id: w.telegram_id,
      username: userRes.rows[0]?.username,
      first_name: userRes.rows[0]?.first_name,
      is_nft: isNftUser,
      nft_name: userNftName
    }).catch(e => console.error('[PayoutProof] Gram withdrawal error:', e.message));

    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error approving gram withdrawal:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /api/admin/gram-withdrawals/:id/reject
router.post('/gram-withdrawals/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { rejection_reason } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const wRes = await client.query(
      `SELECT * FROM gram_withdrawals WHERE id = $1 AND status = 'pending' FOR UPDATE`,
      [id]
    );
    if (wRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Withdrawal not found or already processed' });
    }
    const w = wRes.rows[0];
    await client.query(
      `UPDATE gram_withdrawals SET status = 'rejected', rejection_reason = $2, processed_at = NOW() WHERE id = $1`,
      [id, rejection_reason || 'Rejected by admin']
    );
    // Refund gram_balance
    await client.query(
      `UPDATE users SET gram_balance = COALESCE(gram_balance, 0) + $1 WHERE telegram_id = $2`,
      [w.amount, w.telegram_id]
    );
    await client.query('COMMIT');
    // Notify user
    if (bot && bot.sendMessage) {
      try {
        bot.sendMessage(
          w.telegram_id,
          `❌ <b>GRAM Withdrawal Rejected</b>\n\nYour withdrawal of <b>${w.amount} GRAM</b> was rejected.\n<b>Reason:</b> ${rejection_reason || 'Did not meet requirements'}\n\nYour GRAM balance has been refunded. 💎`,
          { parse_mode: 'HTML' }
        );
      } catch (e) {}
    }
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error rejecting gram withdrawal:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /api/admin/send-gram-reminder/:telegram_id
router.post('/send-gram-reminder/:telegram_id', async (req, res) => {
  const { telegram_id } = req.params;
  
  if (bot && bot.sendMessage) {
    try {
      const msg = `⚠️ <b>You have not claimed your daily GRAM reward yet!</b>\n\nGo complete your 60 daily ads now and claim your <b>0.02 GRAM</b> reward directly to your TON wallet!\n\n💎 <b>Claim your GRAM now:</b>`;
      const opts = {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💎 Claim your GRAM', web_app: { url: 'https://tasky-kohl-six.vercel.app' } }]
          ]
        }
      };
      bot.sendMessage(telegram_id, msg, opts).catch(e => console.error('Bot send error', e));
      res.json({ success: true });
    } catch (err) {
      console.error('Error sending reminder:', err);
      res.status(500).json({ error: 'Failed to send message' });
    }
  } else {
    res.status(500).json({ error: 'Bot not configured' });
  }
});

// GET /api/admin/nft-holders
router.get('/nft-holders', async (req, res) => {
  try {
    const holdersQuery = `
      SELECT 
        unc.id as instance_id,
        unc.telegram_id,
        unc.purchased_at,
        unc.last_claimed_at,
        unc.claims_done,
        unc.total_earned_gram,
        unc.is_completed,
        unc.total_days,
        u.username,
        u.first_name,
        COALESCE(u.gram_balance, 0) as gram_balance,
        nc.id as nft_id,
        nc.name as nft_name,
        nc.price_gram,
        nc.daily_yield_gram,
        nc.duration_days,
        nc.total_yield_gram
      FROM user_nft_cards unc
      JOIN users u ON unc.telegram_id = u.telegram_id
      JOIN nft_cards nc ON unc.nft_id = nc.id
      ORDER BY unc.purchased_at DESC
    `;
    const { rows: rawHolders } = await pool.query(holdersQuery);

    const depositsQuery = `
      SELECT telegram_id, amount_gram, tx_hash, status, created_at
      FROM gram_deposits
      ORDER BY created_at DESC
    `;
    const { rows: rawDeposits } = await pool.query(depositsQuery).catch(() => ({ rows: [] }));

    const depositsByTelegramId = {};
    const totalDepositedByTelegramId = {};
    for (const dep of rawDeposits) {
      const tid = String(dep.telegram_id);
      if (!depositsByTelegramId[tid]) depositsByTelegramId[tid] = [];
      depositsByTelegramId[tid].push({
        amount_gram: parseFloat(dep.amount_gram || 0),
        tx_hash: dep.tx_hash,
        status: dep.status,
        created_at: dep.created_at
      });
      if (dep.status === 'approved') {
        totalDepositedByTelegramId[tid] = (totalDepositedByTelegramId[tid] || 0) + parseFloat(dep.amount_gram || 0);
      }
    }

    const holders = rawHolders.map(h => {
      const durationDays = parseInt(h.total_days || h.duration_days, 10) || 10;
      const dailyYield = parseFloat(h.daily_yield_gram) || 0;
      return {
        ...h,
        gram_balance: parseFloat(h.gram_balance || 0),
        duration_days: durationDays,
        total_yield_gram: durationDays * dailyYield
      };
    });

    // Group holders by telegram_id to build distinct users array
    const userMap = {};
    for (const h of holders) {
      const tid = String(h.telegram_id);
      if (!userMap[tid]) {
        userMap[tid] = {
          telegram_id: h.telegram_id,
          username: h.username,
          first_name: h.first_name,
          gram_balance: h.gram_balance,
          latest_purchased_at: h.purchased_at,
          total_deposited_gram: totalDepositedByTelegramId[tid] || 0,
          total_spent_gram: 0,
          total_daily_yield: 0,
          total_earned_gram: 0,
          miners_count: 0,
          active_miners_count: 0,
          max_withdrawal_limit: 0.02,
          miners: [],
          deposits: depositsByTelegramId[tid] || []
        };
      }

      const price = parseFloat(h.price_gram || 0);
      const dailyYield = parseFloat(h.daily_yield_gram || 0);
      const claimsDone = parseInt(h.claims_done || 0, 10);
      const durationDays = parseInt(h.duration_days || 10, 10);
      const isCompleted = claimsDone >= durationDays || h.is_completed;

      // Calculate max withdrawal limit for user based on highest tier owned
      if (price >= 5.0) {
        userMap[tid].max_withdrawal_limit = Math.max(userMap[tid].max_withdrawal_limit, 0.07);
      } else if (price >= 1.0) {
        userMap[tid].max_withdrawal_limit = Math.max(userMap[tid].max_withdrawal_limit, 0.05);
      } else if (price >= 0.5) {
        userMap[tid].max_withdrawal_limit = Math.max(userMap[tid].max_withdrawal_limit, 0.03);
      }

      userMap[tid].miners_count += 1;
      userMap[tid].total_spent_gram += price;
      userMap[tid].total_earned_gram += parseFloat(h.total_earned_gram || 0);

      if (!isCompleted) {
        userMap[tid].active_miners_count += 1;
        userMap[tid].total_daily_yield += dailyYield;
      }

      userMap[tid].miners.push({
        instance_id: h.instance_id,
        nft_id: h.nft_id,
        nft_name: h.nft_name,
        price_gram: price,
        daily_yield_gram: dailyYield,
        claims_done: claimsDone,
        duration_days: durationDays,
        total_earned_gram: parseFloat(h.total_earned_gram || 0),
        purchased_at: h.purchased_at,
        is_completed: isCompleted
      });
    }

    const users = Object.values(userMap);

    const statsQuery = `
      SELECT 
        COUNT(DISTINCT telegram_id) as total_unique_holders,
        COUNT(id) as total_miners_sold,
        COALESCE(SUM(total_earned_gram), 0) as total_yield_distributed
      FROM user_nft_cards
    `;
    const { rows: statsRows } = await pool.query(statsQuery);

    const balanceRes = await pool.query("SELECT COALESCE(SUM(gram_balance), 0) as total_gram_balance FROM users");
    const depositRes = await pool.query("SELECT COALESCE(SUM(amount_gram), 0) as total_gram_deposited FROM gram_deposits WHERE status = 'approved'");

    res.json({
      success: true,
      stats: {
        total_unique_holders: parseInt(statsRows[0].total_unique_holders, 10) || 0,
        total_miners_sold: parseInt(statsRows[0].total_miners_sold, 10) || 0,
        total_yield_distributed: parseFloat(statsRows[0].total_yield_distributed) || 0,
        total_gram_balance: parseFloat(balanceRes.rows[0].total_gram_balance) || 0,
        total_gram_deposited: parseFloat(depositRes.rows[0].total_gram_deposited) || 0
      },
      users,
      holders
    });
  } catch (err) {
    console.error('Error fetching admin NFT holders:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/gram-deposits
router.get('/gram-deposits', async (req, res) => {
  try {
    const depositsQuery = `
      SELECT 
        gd.id,
        gd.telegram_id,
        gd.amount_gram,
        gd.tx_hash,
        gd.auto_verified,
        gd.status,
        gd.created_at,
        u.username,
        u.first_name
      FROM gram_deposits gd
      LEFT JOIN users u ON gd.telegram_id = u.telegram_id
      ORDER BY gd.created_at DESC
    `;
    const { rows: deposits } = await pool.query(depositsQuery);

    const statsQuery = `
      SELECT 
        COUNT(id) as total_deposits,
        COALESCE(SUM(amount_gram), 0) as total_gram_deposited,
        COUNT(DISTINCT telegram_id) as total_depositors
      FROM gram_deposits
      WHERE status = 'approved'
    `;
    const { rows: statsRows } = await pool.query(statsQuery);

    res.json({
      success: true,
      stats: {
        total_deposits: parseInt(statsRows[0].total_deposits, 10) || 0,
        total_gram_deposited: parseFloat(statsRows[0].total_gram_deposited) || 0,
        total_depositors: parseInt(statsRows[0].total_depositors, 10) || 0
      },
      deposits
    });
  } catch (err) {
    console.error('Error fetching admin GRAM deposits:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

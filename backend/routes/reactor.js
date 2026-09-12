const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bot = require('../bot');

const STAGES = [
  { stage: 1, target: 20, reward_tasky: 5000, reward_grams: 0.20, reward_usdt: 0, title: 'Ignition Overdrive' },
  { stage: 2, target: 50, reward_tasky: 15000, reward_grams: 0.50, reward_usdt: 0, title: 'Plasma Pulse' },
  { stage: 3, target: 100, reward_tasky: 30000, reward_grams: 1.00, reward_usdt: 0, title: 'Turbine Velocity' },
  { stage: 4, target: 175, reward_tasky: 60000, reward_grams: 2.00, reward_usdt: 0, title: 'Supercharge Burst' },
  { stage: 5, target: 250, reward_tasky: 100000, reward_grams: 5.00, reward_usdt: 1.00, title: 'MAX CYBER JACKPOT' }
];

// In-memory anti-spam timestamp map (min 5s between ad view records)
const lastAdTimestampMap = new Map();

/**
 * GET /api/reactor/status/:telegram_id
 */
router.get('/status/:telegram_id', async (req, res) => {
  const { telegram_id } = req.params;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

  try {
    const tid = BigInt(telegram_id);

    // 1. Get user record
    const userRes = await pool.query(
      'SELECT id, telegram_id, first_name, username, balance, wallet_address, gram_wallet_address FROM users WHERE telegram_id = $1',
      [tid]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    // 2. Get latest claim if any
    const claimRes = await pool.query(
      `SELECT id, telegram_id, total_ads_watched, stage_reached, reward_usdt, reward_grams, reward_tasky,
              wallet_address, status, claimed_at, reviewed_at, payout_tx_hash, rejection_reason
       FROM reactor_claims
       WHERE telegram_id = $1
       ORDER BY claimed_at DESC
       LIMIT 1`,
      [tid]
    );
    const activeClaim = claimRes.rows[0] || null;

    // Filter ad views after last claim if there was one, or total reactor ad views
    let adViewsQuery = `
      SELECT COUNT(*) as total_ads
      FROM ad_views
      WHERE telegram_id = $1 AND ad_type IN ('reactor_usl', 'reactor_ad')
    `;
    const queryParams = [tid];

    if (activeClaim && activeClaim.claimed_at && activeClaim.status === 'approved') {
      adViewsQuery += ` AND created_at > $2`;
      queryParams.push(activeClaim.claimed_at);
    }

    const adsRes = await pool.query(adViewsQuery, queryParams);
    const total_ads = parseInt(adsRes.rows[0]?.total_ads || 0, 10);

    // Calculate current stage
    let current_stage = 0;
    for (let i = STAGES.length - 1; i >= 0; i--) {
      if (total_ads >= STAGES[i].target) {
        current_stage = STAGES[i].stage;
        break;
      }
    }

    const next_stage_info = STAGES.find(s => s.target > total_ads) || STAGES[STAGES.length - 1];

    res.json({
      success: true,
      total_ads,
      current_stage,
      next_target: next_stage_info.target,
      stages: STAGES,
      active_claim: activeClaim,
      user_wallet: user.wallet_address || user.gram_wallet_address || ''
    });
  } catch (err) {
    console.error('[Reactor] Error fetching status:', err);
    res.status(500).json({ error: 'Failed to fetch reactor status' });
  }
});

/**
 * POST /api/reactor/record-view
 */
router.post('/record-view', async (req, res) => {
  const { telegram_id } = req.body;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id is required' });

  try {
    const tid = BigInt(telegram_id);

    // Cooldown check (5s)
    const now = Date.now();
    const lastTime = lastAdTimestampMap.get(String(telegram_id)) || 0;
    if (now - lastTime < 5000) {
      return res.status(429).json({ error: 'Please wait a moment before recording next ad view.' });
    }
    lastAdTimestampMap.set(String(telegram_id), now);

    // Insert into ad_views
    await pool.query(
      'INSERT INTO ad_views (telegram_id, ad_type, created_at) VALUES ($1, $2, NOW())',
      [tid, 'reactor_usl']
    );

    // Get updated total ads for current cycle
    const claimRes = await pool.query(
      `SELECT claimed_at FROM reactor_claims WHERE telegram_id = $1 AND status = 'approved' ORDER BY claimed_at DESC LIMIT 1`,
      [tid]
    );
    const lastClaimAt = claimRes.rows[0]?.claimed_at;

    let adCountQuery = `SELECT COUNT(*) as count FROM ad_views WHERE telegram_id = $1 AND ad_type IN ('reactor_usl', 'reactor_ad')`;
    const countParams = [tid];
    if (lastClaimAt) {
      adCountQuery += ` AND created_at > $2`;
      countParams.push(lastClaimAt);
    }

    const countRes = await pool.query(adCountQuery, countParams);
    const newTotal = parseInt(countRes.rows[0]?.count || 0, 10);

    // Find if a stage was reached
    let stageReached = 0;
    for (let i = STAGES.length - 1; i >= 0; i--) {
      if (newTotal >= STAGES[i].target) {
        stageReached = STAGES[i].stage;
        break;
      }
    }

    res.json({
      success: true,
      total_ads: newTotal,
      stage: stageReached,
      can_claim: newTotal >= 20
    });
  } catch (err) {
    console.error('[Reactor] Error recording ad view:', err);
    res.status(500).json({ error: 'Failed to record ad view' });
  }
});

/**
 * POST /api/reactor/claim
 */
router.post('/claim', async (req, res) => {
  const { telegram_id, wallet_address } = req.body;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id is required' });
  if (!wallet_address || String(wallet_address).trim().length < 8) {
    return res.status(400).json({ error: 'Valid TON or USDT (TRC20/TON) wallet address required' });
  }

  try {
    const tid = BigInt(telegram_id);

    // Check for existing pending claim
    const pendingRes = await pool.query(
      `SELECT id FROM reactor_claims WHERE telegram_id = $1 AND status = 'pending'`,
      [tid]
    );
    if (pendingRes.rows.length > 0) {
      return res.status(400).json({ error: 'You already have a pending claim under review!' });
    }

    // Get total verified ad views
    const claimRes = await pool.query(
      `SELECT claimed_at FROM reactor_claims WHERE telegram_id = $1 AND status = 'approved' ORDER BY claimed_at DESC LIMIT 1`,
      [tid]
    );
    const lastClaimAt = claimRes.rows[0]?.claimed_at;

    let adCountQuery = `SELECT COUNT(*) as count FROM ad_views WHERE telegram_id = $1 AND ad_type IN ('reactor_usl', 'reactor_ad')`;
    const countParams = [tid];
    if (lastClaimAt) {
      adCountQuery += ` AND created_at > $2`;
      countParams.push(lastClaimAt);
    }

    const countRes = await pool.query(adCountQuery, countParams);
    const totalAds = parseInt(countRes.rows[0]?.count || 0, 10);

    if (totalAds < 20) {
      return res.status(400).json({ error: 'Minimum 20 USL ads required to claim Stage 1 reward!' });
    }

    // Calculate stage and rewards
    let stageInfo = STAGES[0];
    for (let i = STAGES.length - 1; i >= 0; i--) {
      if (totalAds >= STAGES[i].target) {
        stageInfo = STAGES[i];
        break;
      }
    }

    // Insert claim into database
    const insertRes = await pool.query(
      `INSERT INTO reactor_claims 
       (telegram_id, total_ads_watched, stage_reached, reward_usdt, reward_grams, reward_tasky, wallet_address, status, claimed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
       RETURNING *`,
      [
        tid,
        totalAds,
        stageInfo.stage,
        stageInfo.reward_usdt,
        stageInfo.reward_grams,
        stageInfo.reward_tasky,
        String(wallet_address).trim()
      ]
    );

    const newClaim = insertRes.rows[0];

    // Optionally notify Telegram admin if bot is active
    try {
      const adminId = process.env.ADMIN_TELEGRAM_ID;
      if (adminId && bot && bot.telegram) {
        bot.telegram.sendMessage(
          adminId,
          `⚡ *NEW CYBER REACTOR CLAIM!* ⚡\n\n` +
          `👤 User: \`${tid}\`\n` +
          `🎯 Stage: *${stageInfo.stage} (${stageInfo.title})*\n` +
          `📺 Ads Watched: *${totalAds} USL Ads*\n` +
          `💰 Reward: *${stageInfo.reward_usdt > 0 ? stageInfo.reward_usdt + ' USDT + ' : ''}${stageInfo.reward_grams} GRAM + ${stageInfo.reward_tasky.toLocaleString()} TASKY*\n` +
          `💳 Wallet: \`${wallet_address}\`\n\n` +
          `👉 Review in Admin Panel: [Tasky Admin](https://tasky3.onrender.com/admin)`,
          { parse_mode: 'Markdown' }
        ).catch(() => {});
      }
    } catch (e) {}

    res.json({
      success: true,
      message: 'Claim submitted successfully for Admin review!',
      claim: newClaim,
      unlock_days: 5
    });
  } catch (err) {
    console.error('[Reactor] Error submitting claim:', err);
    res.status(500).json({ error: 'Failed to submit reactor claim' });
  }
});

module.exports = router;

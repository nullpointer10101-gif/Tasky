const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../db');
const bot = require('../bot');

const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

/**
 * Validates Telegram WebApp initData HMAC-SHA256 signature
 */
function verifyTelegramInitData(initData) {
  if (!initData || !BOT_TOKEN) return false;
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return false;

    urlParams.delete('hash');
    const params = [];
    for (const [key, value] of urlParams.entries()) {
      params.push(`${key}=${value}`);
    }
    params.sort();
    const dataCheckString = params.join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) return false;

    const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) return false; // 24h freshness

    return true;
  } catch (e) {
    return false;
  }
}

const STAGES = [
  { stage: 1, target: 100, reward_tasky: 0, reward_grams: 0, reward_usdt: 0, title: 'Core Spark (10%)' },
  { stage: 2, target: 250, reward_tasky: 0, reward_grams: 0, reward_usdt: 0, title: 'Plasma Pulse (25%)' },
  { stage: 3, target: 500, reward_tasky: 0, reward_grams: 0, reward_usdt: 0, title: 'Fusion Overdrive (50%)' },
  { stage: 4, target: 750, reward_tasky: 0, reward_grams: 0, reward_usdt: 0, title: 'Quantum Surge (75%)' },
  { stage: 5, target: 1000, reward_tasky: 20000, reward_grams: 2.00, reward_usdt: 0, title: 'MAX REACTOR JACKPOT (100%)' }
];

// In-memory anti-spam session token map for reactor ads
global.reactorAdSessions = global.reactorAdSessions || new Map();
const lastStartReactorTime = new Map(); // telegram_id -> timestamp ms
const lastRecordReactorTime = new Map(); // telegram_id -> timestamp ms

/**
 * GET /api/reactor/status/:telegram_id
 * Returns current Cyber Reactor ad count, stage, active claim, and user wallet.
 */
router.get('/status/:telegram_id?', async (req, res) => {
  const telegram_id = req.params.telegram_id || req.query.telegram_id || req.query.id;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id is required' });

  try {
    const tid = BigInt(telegram_id);

    // Get last approved claim timestamp if any
    const claimRes = await pool.query(
      `SELECT claimed_at FROM reactor_claims WHERE telegram_id = $1 AND status = 'approved' ORDER BY claimed_at DESC LIMIT 1`,
      [tid]
    );
    const lastClaimAt = claimRes.rows[0]?.claimed_at;

    let adCountQuery = `SELECT COUNT(*) as count FROM ad_views WHERE telegram_id = $1 AND ad_type IN ('reactor_usl', 'reactor_ad', 'reactor_taddy')`;
    const countParams = [tid];
    if (lastClaimAt) {
      adCountQuery += ` AND created_at > $2`;
      countParams.push(lastClaimAt);
    }

    const countRes = await pool.query(adCountQuery, countParams);
    const total_ads = parseInt(countRes.rows[0]?.count || 0, 10);

    // Get active claim if any
    const activeClaimRes = await pool.query(
      `SELECT * FROM reactor_claims WHERE telegram_id = $1 AND status = 'pending' ORDER BY claimed_at DESC LIMIT 1`,
      [tid]
    );
    const active_claim = activeClaimRes.rows[0] || null;

    // Get user wallet
    const userRes = await pool.query(
      `SELECT wallet_address, gram_wallet_address FROM users WHERE telegram_id = $1`,
      [tid]
    );
    const user_wallet = userRes.rows[0]?.gram_wallet_address || userRes.rows[0]?.wallet_address || '';

    // Stage reached
    let current_stage = 0;
    for (let i = STAGES.length - 1; i >= 0; i--) {
      if (total_ads >= STAGES[i].target) {
        current_stage = STAGES[i].stage;
        break;
      }
    }

    res.json({
      success: true,
      total_ads,
      current_stage,
      can_claim: total_ads >= 1000 && !active_claim,
      active_claim,
      user_wallet,
      stages: STAGES
    });
  } catch (err) {
    console.error('[Reactor] Error fetching status:', err);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

/**
 * POST /api/reactor/start-view
 * Generates a server-side cryptographic session token for reactor ads.
 * Requires Telegram WebApp HMAC validation and 12s minimum cooldown between calls.
 */
router.post('/start-view', async (req, res) => {
  const { telegram_id } = req.body;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id is required' });

  const initData = req.headers['x-telegram-init-data'] || req.body.telegram_init_data;
  if (initData) {
    if (!verifyTelegramInitData(initData)) {
      return res.status(403).json({ error: 'Security verification failed. Please launch the app inside Telegram.' });
    }
  }

  const tidStr = String(telegram_id);
  const now = Date.now();

  const lastCall = lastStartReactorTime.get(tidStr) || 0;
  if (now - lastCall < 12000) {
    const wait = Math.ceil((12000 - (now - lastCall)) / 1000);
    return res.status(429).json({ error: `Please wait ${wait}s before starting another ad.` });
  }
  lastStartReactorTime.set(tidStr, now);

  const session_token = crypto.randomBytes(24).toString('hex');
  global.reactorAdSessions.set(session_token, {
    telegram_id: tidStr,
    created_at: now
  });

  // Auto-cleanup stale reactor sessions older than 5 minutes
  if (global.reactorAdSessions.size > 2000) {
    for (const [tok, data] of global.reactorAdSessions.entries()) {
      if (now - data.created_at > 300000) {
        global.reactorAdSessions.delete(tok);
      }
    }
  }

  res.json({ success: true, session_token });
});

/**
 * POST /api/reactor/record-view
 * Requires valid one-time session_token, minimum 15s elapsed watching time, and 20s cooldown between records.
 */
router.post('/record-view', async (req, res) => {
  const { telegram_id, session_token, provider = 'usl' } = req.body;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id is required' });

  const initData = req.headers['x-telegram-init-data'] || req.body.telegram_init_data;
  if (initData) {
    if (!verifyTelegramInitData(initData)) {
      return res.status(403).json({ error: 'Security verification failed. Please launch the app inside Telegram.' });
    }
  }

  const tidStr = String(telegram_id);
  const now = Date.now();

  // Rate limit: Enforce at least 15 seconds between recorded ads per user
  const lastRecord = lastRecordReactorTime.get(tidStr) || 0;
  if (now - lastRecord < 15000) {
    const wait = Math.ceil((15000 - (now - lastRecord)) / 1000);
    return res.status(429).json({ error: `Ad recorded too fast! Please wait ${wait}s.` });
  }

  // Validate session token
  if (!session_token || !global.reactorAdSessions.has(session_token)) {
    return res.status(403).json({ error: 'Invalid or expired ad session. Please launch ad from app.' });
  }

  const sessionData = global.reactorAdSessions.get(session_token);
  if (sessionData.telegram_id !== tidStr) {
    return res.status(403).json({ error: 'Session user mismatch.' });
  }

  // Enforce minimum 15 seconds watching duration
  const elapsed = (now - sessionData.created_at) / 1000;
  if (elapsed < 15.0) {
    return res.status(400).json({ error: 'Ad watched too fast! You must watch the complete video ad (at least 15s).' });
  }

  // Consume token (one-time use)
  global.reactorAdSessions.delete(session_token);
  lastRecordReactorTime.set(tidStr, now);

  try {
    const tid = BigInt(telegram_id);

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

    let adCountQuery = `SELECT COUNT(*) as count FROM ad_views WHERE telegram_id = $1 AND ad_type IN ('reactor_usl', 'reactor_ad', 'reactor_taddy')`;
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
      can_claim: newTotal >= 1000
    });
  } catch (err) {
    console.error('[Reactor] Error recording ad view:', err);
    res.status(500).json({ error: 'Failed to record ad view' });
  }
});

/**
 * POST /api/reactor/claim (ONLY allowed once user completes ALL 1,000 Ads!)
 */
router.post('/claim', async (req, res) => {
  const { telegram_id, wallet_address } = req.body;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id is required' });
  if (!wallet_address || String(wallet_address).trim().length < 8) {
    return res.status(400).json({ error: 'Valid TON or GRAM wallet address required' });
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

    let adCountQuery = `SELECT COUNT(*) as count FROM ad_views WHERE telegram_id = $1 AND ad_type IN ('reactor_usl', 'reactor_ad', 'reactor_taddy')`;
    const countParams = [tid];
    if (lastClaimAt) {
      adCountQuery += ` AND created_at > $2`;
      countParams.push(lastClaimAt);
    }

    const countRes = await pool.query(adCountQuery, countParams);
    const totalAds = parseInt(countRes.rows[0]?.count || 0, 10);

    // STRICT REQUIREMENT: Must reach 1,000 Ads to claim
    if (totalAds < 1000) {
      return res.status(400).json({ 
        error: `You need 1,000 ads to claim the 2.00 GRAM Jackpot! Current: ${totalAds} / 1,000 ads.` 
      });
    }

    const finalStage = STAGES[4]; // Stage 5: 1000 ads, 2.00 GRAM, 20,000 TASKY

    // Insert claim into database
    const insertRes = await pool.query(
      `INSERT INTO reactor_claims 
       (telegram_id, total_ads_watched, stage_reached, reward_usdt, reward_grams, reward_tasky, wallet_address, status, claimed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
       RETURNING *`,
      [
        tid,
        totalAds,
        5,
        0,
        2.0000,
        20000,
        String(wallet_address).trim()
      ]
    );

    const newClaim = insertRes.rows[0];

    // Notify Telegram admin
    try {
      const adminId = process.env.ADMIN_TELEGRAM_ID;
      if (adminId && bot && bot.telegram) {
        bot.telegram.sendMessage(
          adminId,
          `⚡ *NEW 1,000 ADS REACTOR JACKPOT CLAIM!* ⚡\n\n` +
          `👤 User: \`${tid}\`\n` +
          `🎯 Stage: *Stage 5 Complete (1,000 USL Ads)*\n` +
          `💰 Reward: *2.00 GRAM + 20,000 TASKY*\n` +
          `💳 Wallet: \`${wallet_address}\`\n\n` +
          `👉 Review in Admin Panel: [Tasky Admin](https://tasky-d81s.vercel.app)`,
          { parse_mode: 'Markdown' }
        ).catch(() => {});
      }
    } catch (e) {}

    res.json({
      success: true,
      message: 'Jackpot claim of 2.00 GRAM submitted successfully for Admin review!',
      claim: newClaim,
      unlock_days: 5
    });
  } catch (err) {
    console.error('[Reactor] Error submitting claim:', err);
    res.status(500).json({ error: 'Failed to submit reactor claim' });
  }
});

module.exports = router;


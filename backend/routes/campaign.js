const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../db');

const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

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
    if (now - authDate > 86400) return false;

    return true;
  } catch (e) {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIZE TIERS (Top 30 Users)
// 1st: 1.00 GRAM + 20,000 TASKY
// 2nd: 0.50 GRAM + 10,000 TASKY
// 3rd: 0.30 GRAM + 5,000 TASKY
// 4th-10th: 0.10 GRAM + 2,000 TASKY
// 11th-30th: 0.05 GRAM + 1,000 TASKY
// ─────────────────────────────────────────────────────────────────────────────
const PRIZE_STRUCTURE = [
  { rankMin: 1, rankMax: 1, gram: 1.00, tasky: 20000, label: '🥇 1st Place' },
  { rankMin: 2, rankMax: 2, gram: 0.50, tasky: 10000, label: '🥈 2nd Place' },
  { rankMin: 3, rankMax: 3, gram: 0.30, tasky: 5000, label: '🥉 3rd Place' },
  { rankMin: 4, rankMax: 10, gram: 0.10, tasky: 2000, label: '🏅 Ranks 4–10' },
  { rankMin: 11, rankMax: 30, gram: 0.05, tasky: 1000, label: '🎖️ Ranks 11–30' }
];

function getPrizeForRank(rank) {
  if (rank < 1 || rank > 30) return { gram: 0, tasky: 0, label: 'None' };
  const tier = PRIZE_STRUCTURE.find(t => rank >= t.rankMin && rank <= t.rankMax);
  return tier ? { gram: tier.gram, tasky: tier.tasky, label: tier.label } : { gram: 0, tasky: 0, label: 'None' };
}

// Ensure database tables exist
async function ensureTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_tournaments (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        start_at TIMESTAMPTZ NOT NULL,
        end_at TIMESTAMPTZ NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS campaign_payouts (
        id SERIAL PRIMARY KEY,
        tournament_id INT NOT NULL,
        telegram_id VARCHAR(100) NOT NULL,
        rank INT NOT NULL,
        gram_amount NUMERIC(10,4) DEFAULT 0,
        tasky_amount NUMERIC(15,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending_admin_approval',
        approved_by VARCHAR(100),
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (e) {
    console.error('[Campaign] Error creating tables:', e.message);
  }
}
ensureTables();

// Get active or create current 7-day tournament
// STRICT RULE: Tournaments NEVER auto-pay. When expired, status changes to ended_pending_admin_payout for manual admin review.
async function getActiveTournament() {
  const res = await pool.query(
    "SELECT * FROM campaign_tournaments WHERE status = 'active' ORDER BY id DESC LIMIT 1"
  );
  if (res.rows.length > 0) {
    const t = res.rows[0];
    if (new Date(t.end_at) > new Date()) {
      return t;
    } else {
      // Mark as ended awaiting manual admin review & payout
      await pool.query("UPDATE campaign_tournaments SET status = 'ended_pending_admin_payout' WHERE id = $1", [t.id]);
    }
  }

  // Create fresh 7-day tournament
  const title = `🔥 7-Day Ad Championship #${Date.now().toString().slice(-4)}`;
  const start_at = new Date();
  const end_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  const newRes = await pool.query(
    "INSERT INTO campaign_tournaments (title, start_at, end_at, status) VALUES ($1, $2, $3, 'active') RETURNING *",
    [title, start_at, end_at]
  );
  return newRes.rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/campaign/tournament — Leaderboard & Current User Status
// ─────────────────────────────────────────────────────────────────────────────
router.get('/tournament', async (req, res) => {
  const telegram_id = req.query.telegram_id ? String(req.query.telegram_id).trim() : null;

  try {
    const tournament = await getActiveTournament();
    const endMs = new Date(tournament.end_at).getTime();
    const nowMs = Date.now();
    const time_left_ms = Math.max(0, endMs - nowMs);

    // Query Top 30 Users by ad views during tournament timeframe
    const leaderboardRes = await pool.query(`
      SELECT 
        u.telegram_id,
        u.username,
        u.first_name,
        COUNT(a.id) as ads_watched
      FROM ad_views a
      JOIN users u ON u.telegram_id::text = a.telegram_id::text
      WHERE a.created_at >= $1 AND a.created_at <= $2
        AND u.is_banned = FALSE
      GROUP BY u.telegram_id, u.username, u.first_name
      ORDER BY ads_watched DESC, u.telegram_id ASC
      LIMIT 30
    `, [tournament.start_at, tournament.end_at]);

    const leaderboard = leaderboardRes.rows.map((row, idx) => {
      const rank = idx + 1;
      const prize = getPrizeForRank(rank);
      return {
        rank,
        telegram_id: row.telegram_id,
        username: row.username || null,
        first_name: row.first_name || 'Miner',
        ads_watched: parseInt(row.ads_watched || 0, 10),
        prize_gram: prize.gram,
        prize_tasky: prize.tasky
      };
    });

    let user_stats = {
      rank: null,
      ads_watched: 0,
      estimated_gram: 0,
      estimated_tasky: 0
    };

    if (telegram_id) {
      // Find user count in tournament window
      const userAdRes = await pool.query(`
        SELECT COUNT(*) as count
        FROM ad_views
        WHERE telegram_id::text = $1
          AND created_at >= $2 AND created_at <= $3
      `, [telegram_id, tournament.start_at, tournament.end_at]);

      const userAds = parseInt(userAdRes.rows[0]?.count || 0, 10);
      user_stats.ads_watched = userAds;

      if (userAds > 0) {
        // Calculate user's overall rank
        const rankRes = await pool.query(`
          SELECT COUNT(*) as higher_count
          FROM (
            SELECT telegram_id, COUNT(*) as cnt
            FROM ad_views
            WHERE created_at >= $1 AND created_at <= $2
            GROUP BY telegram_id
            HAVING COUNT(*) > $3
          ) sub
        `, [tournament.start_at, tournament.end_at, userAds]);

        const rank = parseInt(rankRes.rows[0]?.higher_count || 0, 10) + 1;
        user_stats.rank = rank;

        const prize = getPrizeForRank(rank);
        user_stats.estimated_gram = prize.gram;
        user_stats.estimated_tasky = prize.tasky;
      }
    }

    res.json({
      success: true,
      tournament: {
        id: tournament.id,
        title: tournament.title,
        start_at: tournament.start_at,
        end_at: tournament.end_at,
        time_left_ms,
        status: tournament.status
      },
      leaderboard,
      user_stats,
      prize_structure: PRIZE_STRUCTURE
    });
  } catch (err) {
    console.error('[Campaign] Error getting tournament leaderboard:', err.message);
    res.status(500).json({ error: 'Failed to load campaign leaderboard' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/campaign/start-watch — Create crypto session token for campaign ad
// ─────────────────────────────────────────────────────────────────────────────
global.campaignAdSessions = global.campaignAdSessions || new Map();

router.post('/start-watch', async (req, res) => {
  const { telegram_id, provider = 'adexium' } = req.body;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id is required' });

  try {
    const tidStr = String(telegram_id);
    const session_token = crypto.randomBytes(24).toString('hex');
    const normalizedProvider = (provider === 'adexium' || provider === 'monetag') ? 'adexium' : 'gigapub';

    global.campaignAdSessions.set(session_token, {
      telegram_id: tidStr,
      provider: normalizedProvider,
      created_at: Date.now()
    });

    if (global.campaignAdSessions.size > 2000) {
      const now = Date.now();
      for (const [tok, data] of global.campaignAdSessions.entries()) {
        if (now - data.created_at > 300000) {
          global.campaignAdSessions.delete(tok);
        }
      }
    }

    res.json({ success: true, session_token });
  } catch (err) {
    console.error('[Campaign] Error in /start-watch:', err);
    res.status(500).json({ error: 'Failed to initiate campaign ad session' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/campaign/watch-ad — Track ad view for active 7-day tournament
// ─────────────────────────────────────────────────────────────────────────────
router.post('/watch-ad', async (req, res) => {
  const { telegram_id, provider = 'gigapub', session_token } = req.body;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id is required' });

  const initData = req.headers['x-telegram-init-data'] || req.body.telegram_init_data;
  if (initData && !verifyTelegramInitData(initData)) {
    return res.status(403).json({ error: 'Security verification failed.' });
  }

  try {
    const userRes = await pool.query('SELECT telegram_id, is_banned FROM users WHERE telegram_id::text = $1', [String(telegram_id)]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    if (userRes.rows[0].is_banned) return res.status(403).json({ error: 'Account suspended' });

    // Server-Side Session Validation
    global.campaignAdSessions = global.campaignAdSessions || new Map();
    const sessionData = session_token ? global.campaignAdSessions.get(session_token) : null;

    if (!session_token || !sessionData) {
      return res.status(400).json({ error: 'Invalid or expired ad session. You must watch the full ad (at least 15s).' });
    }

    if (sessionData.telegram_id !== String(telegram_id)) {
      return res.status(403).json({ error: 'Session user mismatch' });
    }

    const elapsedSec = (Date.now() - sessionData.created_at) / 1000;
    global.campaignAdSessions.delete(session_token);

    const MIN_ELAPSED = 15.0;
    if (elapsedSec < MIN_ELAPSED) {
      const remaining = Math.ceil(MIN_ELAPSED - elapsedSec);
      return res.status(429).json({ error: `Ad view duration too short (${elapsedSec.toFixed(1)}s)! You must watch the complete sponsor ad (at least 15s) to earn credit. Please wait ${remaining}s.` });
    }

    const tournament = await getActiveTournament();

    // Database-level Cooldown Check (at least 14 seconds between ad views in DB)
    const lastAdRes = await pool.query(
      'SELECT created_at FROM ad_views WHERE telegram_id::text = $1 ORDER BY created_at DESC LIMIT 1',
      [String(telegram_id)]
    );
    if (lastAdRes.rows.length > 0) {
      const elapsedDb = (Date.now() - new Date(lastAdRes.rows[0].created_at).getTime()) / 1000;
      if (elapsedDb < 14.0) {
        const remaining = Math.ceil(14.0 - elapsedDb);
        return res.status(429).json({ error: `Ad watch too fast! Please wait ${remaining}s between watching ads.` });
      }
    }

    // Record ad view
    const adType = (provider === 'adexium' || provider === 'monetag') ? 'gram_adexium' : 'gram_gigapub';
    await pool.query('INSERT INTO ad_views (telegram_id, ad_type) VALUES ($1, $2)', [String(telegram_id), adType]);

    // Update user stats
    await pool.query('UPDATE users SET total_ads_watched = COALESCE(total_ads_watched, 0) + 1 WHERE telegram_id::text = $1', [String(telegram_id)]);

    // Get new count in active tournament
    const countRes = await pool.query(`
      SELECT COUNT(*) as count
      FROM ad_views
      WHERE telegram_id::text = $1
        AND created_at >= $2 AND created_at <= $3
    `, [String(telegram_id), tournament.start_at, tournament.end_at]);

    const newCount = parseInt(countRes.rows[0]?.count || 0, 10);

    res.json({
      success: true,
      message: 'Campaign ad view recorded!',
      campaign_ads_watched: newCount
    });
  } catch (err) {
    console.error('[Campaign] Error recording campaign ad view:', err.message);
    res.status(500).json({ error: 'Failed to record ad view' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS (Manual Winner Inspection & Payout Control)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/campaign/admin/overview — Full overview for Admin Panel
router.get('/admin/overview', async (req, res) => {
  try {
    const tournamentsRes = await pool.query(
      "SELECT * FROM campaign_tournaments ORDER BY id DESC LIMIT 20"
    );

    const tournaments = [];
    for (const t of tournamentsRes.rows) {
      const statsRes = await pool.query(`
        SELECT 
          COUNT(*) as total_ads_watched,
          COUNT(DISTINCT telegram_id) as total_participants
        FROM ad_views
        WHERE created_at >= $1 AND created_at <= $2
      `, [t.start_at, t.end_at]);

      const total_ads_watched = parseInt(statsRes.rows[0]?.total_ads_watched || 0, 10);
      const total_participants = parseInt(statsRes.rows[0]?.total_participants || 0, 10);

      const top30Res = await pool.query(`
        SELECT 
          u.telegram_id,
          u.username,
          u.first_name,
          u.wallet_address,
          u.is_banned,
          COUNT(a.id) as ads_watched
        FROM ad_views a
        JOIN users u ON u.telegram_id::text = a.telegram_id::text
        WHERE a.created_at >= $1 AND a.created_at <= $2
        GROUP BY u.telegram_id, u.username, u.first_name, u.wallet_address, u.is_banned
        ORDER BY ads_watched DESC, u.telegram_id ASC
        LIMIT 30
      `, [t.start_at, t.end_at]);

      const payoutsRes = await pool.query(
        "SELECT * FROM campaign_payouts WHERE tournament_id = $1",
        [t.id]
      );
      const paidMap = {};
      payoutsRes.rows.forEach(p => {
        paidMap[p.telegram_id] = p;
      });

      const winners = top30Res.rows.map((row, idx) => {
        const rank = idx + 1;
        const prize = getPrizeForRank(rank);
        const payout = paidMap[row.telegram_id];
        return {
          rank,
          telegram_id: row.telegram_id,
          username: row.username,
          first_name: row.first_name,
          wallet_address: row.wallet_address,
          is_banned: row.is_banned,
          ads_watched: parseInt(row.ads_watched || 0, 10),
          prize_gram: prize.gram,
          prize_tasky: prize.tasky,
          payout_status: payout ? payout.status : 'unpaid',
          approved_by: payout?.approved_by || null,
          approved_at: payout?.approved_at || null
        };
      });

      tournaments.push({
        ...t,
        total_ads_watched,
        total_participants,
        winners
      });
    }

    res.json({ success: true, tournaments });
  } catch (err) {
    console.error('[Campaign Admin] Overview error:', err.message);
    res.status(500).json({ error: 'Failed to fetch campaign admin overview' });
  }
});

// POST /api/campaign/admin/approve-payout — Admin manually inspects & pays winner
router.post('/admin/approve-payout', async (req, res) => {
  const { tournament_id, telegram_id, rank, admin_username = 'Admin' } = req.body;
  if (!tournament_id || !telegram_id || !rank) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const prize = getPrizeForRank(parseInt(rank, 10));
    if (prize.gram === 0 && prize.tasky === 0) {
      return res.status(400).json({ error: 'Invalid rank prize' });
    }

    // Check if already paid
    const existing = await pool.query(
      "SELECT * FROM campaign_payouts WHERE tournament_id = $1 AND telegram_id = $2",
      [tournament_id, String(telegram_id)]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Winner payout already processed for this tournament' });
    }

    // Credit winner's balance in database
    await pool.query(`
      UPDATE users 
      SET gram_balance = COALESCE(gram_balance, 0) + $1,
          balance = COALESCE(balance, 0) + $2
      WHERE telegram_id::text = $3
    `, [prize.gram, prize.tasky, String(telegram_id)]);

    // Record payout
    await pool.query(`
      INSERT INTO campaign_payouts (tournament_id, telegram_id, rank, gram_amount, tasky_amount, status, approved_by, approved_at)
      VALUES ($1, $2, $3, $4, $5, 'approved_and_paid', $6, NOW())
    `, [tournament_id, String(telegram_id), rank, prize.gram, prize.tasky, admin_username]);

    res.json({
      success: true,
      message: `Successfully paid Rank #${rank} (${prize.gram} GRAM + ${prize.tasky} TASKY) to Telegram ID ${telegram_id}!`
    });
  } catch (err) {
    console.error('[Campaign Admin] Approve payout error:', err.message);
    res.status(500).json({ error: 'Failed to approve payout' });
  }
});

module.exports = router;

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

// Ensure database table exists
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
    `);
  } catch (e) {
    console.error('[Campaign] Error creating tables:', e.message);
  }
}
ensureTables();

// Get active or create current 7-day tournament
async function getActiveTournament() {
  const res = await pool.query(
    "SELECT * FROM campaign_tournaments WHERE status = 'active' ORDER BY id DESC LIMIT 1"
  );
  if (res.rows.length > 0) {
    const t = res.rows[0];
    if (new Date(t.end_at) > new Date()) {
      return t;
    } else {
      // Mark as completed
      await pool.query("UPDATE campaign_tournaments SET status = 'completed' WHERE id = $1", [t.id]);
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

// GET /api/campaign/tournament — Leaderboard & Current User Status
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

// POST /api/campaign/watch-ad — Track ad view for active 7-day tournament
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

    const tournament = await getActiveTournament();

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
    console.error('[Campaign] Error recording campaign ad:', err.message);
    res.status(500).json({ error: 'Failed to record campaign ad' });
  }
});

module.exports = router;

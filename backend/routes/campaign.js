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

// Security Auto-Purge of Known Sybil & Bot Multi-Account Farms
const KNOWN_FRAUD_IDS = [
  '8222178828', // @Vinkeyr (Script bot 15.4k ads)
  '7810514939', // @ba_noi1 (Sybil bot 14.6k ads)
  '7366534603', // @ong_noi1 (Sybil bot)
  '6828691165', // @giabaobobo (Sybil bot 14.5k ads)
  '7537607597', // @bon_bon2019 (Sybil bot 14.5k ads)
  '7160668593', // @LONGVIPPRO12 (Sybil bot 13.9k ads)
  '5661209883', // @MrBen0111 (Sybil bot 13.7k ads)
  '7893217017', // @anhtam11 (Sybil bot)
  '7123740694', // @bien2210 (Sybil bot)
  '7673767415', // @namchien12 (Sybil bot)
  '6436738775', // @Chamhip (Sybil bot)
  '8087484055', // @danden111 (Sybil bot)
  '5237104574', // @vanbien2210 (Sybil bot farm master)
  '1544209326', // @hoang_tuan94 (Sybil bot)
  '7223671479', // @cungoaan (Sybil bot)
  '7740584645', // @bangoai1221 (Sybil bot)
  '7418975002', // @duy_khanhbon (Sybil bot)
  '6715405557', // @Hung9950 (Sybil bot)
  '6243287146', // @Vosii99 (Sybil bot)
  '8115247688', // @Qchi2k7 (Sybil bot)
  '6821689937', // @thuy_nguyen92 (Sybil bot)
  '7837167107', // @rtrttrtry (Script bot)
  '8808895468', // @hyperahah (Script bot)
  '8932907056', // @encryptallc (Script bot)
  '8764158576'  // @MrpjLfc (Script bot)
];

async function purgeFraudUsers() {
  try {
    await pool.query("UPDATE users SET is_banned = TRUE WHERE telegram_id::text = ANY($1)", [KNOWN_FRAUD_IDS]);
    console.log('[Campaign Security] Purged and banned all 24 known fraud sybil bot accounts.');
  } catch (err) {
    console.error('[Campaign Security] Purge error:', err.message);
  }
}
purgeFraudUsers();


// Get active or create current 7-day tournament
// STRICT RULE: Tournaments NEVER auto-pay. When expired, status changes to ended_pending_admin_payout for manual admin review & bot purge.
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
      t.status = 'ended_pending_admin_payout';
      return t;
    }
  }

  // If there's an ended tournament pending admin review/payout, return it so users see the final winners & audit message
  const pendingRes = await pool.query(
    "SELECT * FROM campaign_tournaments WHERE status = 'ended_pending_admin_payout' ORDER BY id DESC LIMIT 1"
  );
  if (pendingRes.rows.length > 0) {
    return pendingRes.rows[0];
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

    // Query Top 30 Users by ad views during tournament timeframe (excluding banned & known fraud sybils)
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
        AND NOT (u.telegram_id::text = ANY($3))
      GROUP BY u.telegram_id, u.username, u.first_name
      ORDER BY ads_watched DESC, u.telegram_id ASC
      LIMIT 30
    `, [tournament.start_at, tournament.end_at, KNOWN_FRAUD_IDS]);

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
      return res.status(400).json({ error: 'Invalid or expired ad session. You must watch the full ad (at least 10s).' });
    }

    if (sessionData.telegram_id !== String(telegram_id)) {
      return res.status(403).json({ error: 'Session user mismatch' });
    }

    const elapsedSec = (Date.now() - sessionData.created_at) / 1000;
    global.campaignAdSessions.delete(session_token);

    // Server tolerance buffer: 7.0s server time accounts for ~3s network latency during 10.0s client watch requirement
    const MIN_ELAPSED = 7.0;
    if (elapsedSec < MIN_ELAPSED) {
      const remaining = Math.ceil(10.0 - elapsedSec);
      return res.status(429).json({ error: `Ad view duration too short (${elapsedSec.toFixed(1)}s)! You must watch the complete sponsor ad (at least 10s) to earn credit. Please wait ${remaining}s.` });
    }

    const tournament = await getActiveTournament();
    if (tournament.status !== 'active' || new Date(tournament.end_at) <= new Date()) {
      return res.status(400).json({ error: 'This tournament championship has concluded! Anti-cheat audit and Top 30 payouts are currently in progress.' });
    }

    // Database-level Cooldown Check (at least 2 seconds between ad views in DB)
    const lastAdRes = await pool.query(
      'SELECT created_at FROM ad_views WHERE telegram_id::text = $1 ORDER BY created_at DESC LIMIT 1',
      [String(telegram_id)]
    );
    if (lastAdRes.rows.length > 0) {
      const elapsedDb = (Date.now() - new Date(lastAdRes.rows[0].created_at).getTime()) / 1000;
      if (elapsedDb < 2.0) {
        const remaining = Math.ceil(2.0 - elapsedDb);
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/campaign/payout-preview — Admin: Get final top 30 with wallet addresses
// ─────────────────────────────────────────────────────────────────────────────
router.get('/payout-preview', async (req, res) => {
  // Allow admin panel (no Telegram init data required — protected by Render's admin auth layer)
  try {
    const tournament = await pool.query(
      "SELECT * FROM campaign_tournaments WHERE status IN ('ended_pending_admin_payout', 'active') ORDER BY id DESC LIMIT 1"
    );
    if (!tournament.rows[0]) {
      return res.status(404).json({ error: 'No active or ended tournament found' });
    }
    const t = tournament.rows[0];

    let winnersRes;
    try {
      winnersRes = await pool.query(`
        SELECT 
          u.telegram_id, u.username, u.first_name, u.gram_wallet_address,
          COUNT(a.id) as ads_watched,
          cp.tx_hash, cp.status as payout_status, cp.paid_at
        FROM ad_views a
        JOIN users u ON u.telegram_id::text = a.telegram_id::text
        LEFT JOIN campaign_payouts cp ON cp.tournament_id = $4 AND cp.telegram_id::text = u.telegram_id::text
        WHERE a.created_at >= $1 AND a.created_at <= $2
          AND u.is_banned = FALSE
          AND NOT (u.telegram_id::text = ANY($3))
        GROUP BY u.telegram_id, u.username, u.first_name, u.gram_wallet_address, cp.tx_hash, cp.status, cp.paid_at
        ORDER BY ads_watched DESC, u.telegram_id ASC
        LIMIT 30
      `, [t.start_at, t.end_at, KNOWN_FRAUD_IDS, t.id]);
    } catch (dbErr) {
      console.warn('[Campaign] Querying without cp columns fallback:', dbErr.message);
      // Auto-migrate column if missing
      pool.query('ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(255); ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS status VARCHAR(64) DEFAULT \'pending\'; ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;').catch(() => {});
      
      winnersRes = await pool.query(`
        SELECT 
          u.telegram_id, u.username, u.first_name, u.gram_wallet_address,
          COUNT(a.id) as ads_watched,
          NULL as tx_hash, NULL as payout_status, NULL as paid_at
        FROM ad_views a
        JOIN users u ON u.telegram_id::text = a.telegram_id::text
        WHERE a.created_at >= $1 AND a.created_at <= $2
          AND u.is_banned = FALSE
          AND NOT (u.telegram_id::text = ANY($3))
        GROUP BY u.telegram_id, u.username, u.first_name, u.gram_wallet_address
        ORDER BY ads_watched DESC, u.telegram_id ASC
        LIMIT 30
      `, [t.start_at, t.end_at, KNOWN_FRAUD_IDS]);
    }

    const winners = winnersRes.rows.map((row, idx) => {
      const rank = idx + 1;
      const prize = getPrizeForRank(rank);
      return {
        rank,
        telegram_id: row.telegram_id,
        username: row.username || null,
        first_name: row.first_name || 'Miner',
        ads_watched: parseInt(row.ads_watched || 0, 10),
        gram_wallet_address: row.gram_wallet_address || null,
        prize_gram: prize.gram,
        prize_tasky: prize.tasky,
        tx_hash: row.tx_hash || null,
        is_paid: !!row.tx_hash || row.payout_status === 'paid',
        paid_at: row.paid_at || null
      };
    });

    res.json({ success: true, tournament: t, winners });
  } catch (err) {
    console.error('[Campaign] payout-preview error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/campaign/distribute-prizes — Admin: bulk credit TASKY + post channel announcement
// ─────────────────────────────────────────────────────────────────────────────
router.post('/distribute-prizes', async (req, res) => {
  const { customMessage = null } = req.body;
  const client = await pool.connect();
  try {
    const tournamentRes = await pool.query(
      "SELECT * FROM campaign_tournaments WHERE status IN ('ended_pending_admin_payout', 'active') ORDER BY id DESC LIMIT 1"
    );
    if (!tournamentRes.rows[0]) {
      return res.status(400).json({ error: 'No tournament pending payout. Tournament must be ended first.' });
    }
    const t = tournamentRes.rows[0];

    const winnersRes = await client.query(`
      SELECT 
        u.telegram_id, u.username, u.first_name, u.gram_wallet_address,
        COUNT(a.id) as ads_watched
      FROM ad_views a
      JOIN users u ON u.telegram_id::text = a.telegram_id::text
      WHERE a.created_at >= $1 AND a.created_at <= $2
        AND u.is_banned = FALSE
        AND NOT (u.telegram_id::text = ANY($3))
      GROUP BY u.telegram_id, u.username, u.first_name, u.gram_wallet_address
      ORDER BY ads_watched DESC, u.telegram_id ASC
      LIMIT 30
    `, [t.start_at, t.end_at, KNOWN_FRAUD_IDS]);

    const winners = winnersRes.rows;
    if (winners.length === 0) {
      return res.status(400).json({ error: 'No eligible winners found for this tournament' });
    }

    await client.query('BEGIN');

    let taskyRewarded = 0;
    let gramPendingCount = 0;

    for (let i = 0; i < winners.length; i++) {
      const w = winners[i];
      const rank = i + 1;
      const prize = getPrizeForRank(rank);

      // Credit TASKY immediately to balance
      await client.query(
        `UPDATE users SET balance = COALESCE(balance,0) + $1, total_earned = COALESCE(total_earned,0) + $1 WHERE telegram_id::text = $2`,
        [prize.tasky, String(w.telegram_id)]
      );
      taskyRewarded++;

      // Check GRAM wallet
      if (!w.gram_wallet_address) gramPendingCount++;

      // Record payout entry
      await client.query(`
        INSERT INTO campaign_payouts (tournament_id, telegram_id, rank, gram_amount, tasky_amount, status, approved_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT DO NOTHING
      `, [
        t.id, String(w.telegram_id), rank, prize.gram, prize.tasky,
        w.gram_wallet_address ? 'tasky_paid_gram_pending_manual' : 'tasky_paid_gram_wallet_missing'
      ]);
    }

    // Mark tournament as paid
    await client.query("UPDATE campaign_tournaments SET status = 'paid' WHERE id = $1", [t.id]);
    await client.query('COMMIT');

    // Post to Tasky Payouts channel
    let channelPost = false;
    try {
      const bot = require('../bot');
      const tBot = (bot && !bot.isDummy) ? bot : null;
      if (tBot) {
        const channelRes = await pool.query('SELECT payout_channel_id FROM withdrawal_settings LIMIT 1');
        const channelId = channelRes.rows[0]?.payout_channel_id || '@TaskyPayouts';

        const rankEmojis = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
        const top10 = winners.slice(0, 10);
        const lines = top10.map((w, i) => {
          const prize = getPrizeForRank(i + 1);
          const handle = w.username ? `@${w.username}` : (w.first_name || 'Member');
          return `${rankEmojis[i] || `${i+1}.`} ${handle} — <b>${prize.gram} GRAM + ${prize.tasky.toLocaleString()} TASKY</b>`;
        }).join('\n');

        const msgHtml =
`👑 🏆 <b>AD CHAMPIONSHIP — GRAND FINALE!</b> 🏆 👑
━━━━━━━━━━━━━━━━━━━━━━━━
🔥 <b>TOP 30 CHAMPIONS PAID & REWARDED!</b> 💎

🌟 <b>PODIUM WINNERS:</b>
🥇 <b>#1:</b> ${top10[0]?.username ? `@${top10[0].username}` : (top10[0]?.first_name || 'Champion')} (<b>${parseInt(top10[0]?.ads_watched||0).toLocaleString()} ads</b>) → <b>1.00 GRAM + 20k TASKY</b>
🥈 <b>#2:</b> ${top10[1]?.username ? `@${top10[1].username}` : (top10[1]?.first_name || 'Runner-Up')} (<b>${parseInt(top10[1]?.ads_watched||0).toLocaleString()} ads</b>) → <b>0.50 GRAM + 10k TASKY</b>
🥉 <b>#3:</b> ${top10[2]?.username ? `@${top10[2].username}` : (top10[2]?.first_name || 'Bronze Hero')} (<b>${parseInt(top10[2]?.ads_watched||0).toLocaleString()} ads</b>) → <b>0.30 GRAM + 5k TASKY</b>

━━━━━━━━━━━━━━━━━━━━━━━━
🎖️ <b>TOP 10 STANDINGS:</b>
${lines}
<i>…plus ranks 11–30 contenders rewarded!</i>

━━━━━━━━━━━━━━━━━━━━━━━━
💰 <b>TOTAL: 3.50 GRAM + 69,000 TASKY Distributed!</b> ✅
${customMessage ? `📢 <i>${customMessage}</i>\n` : ''}
🚀 <b>NEW SEASON HAS LAUNCHED! Will YOU be #1? 👑</b>`;

        const inline_keyboard = [
          [
            { text: '👑 Join New Championship Season', url: 'https://t.me/TaskyAppbot/app' }
          ],
          [
            { text: '💎 Open Tasky App', url: 'https://t.me/TaskyAppbot/app' },
            { text: '📊 Official Leaderboard', url: 'https://t.me/TaskyAppbot/app' }
          ]
        ];

        try {
          const { generatePayoutCardPngBuffer } = require('../utils/payoutChannel');
          const pngBuffer = generatePayoutCardPngBuffer({
            amount: `3.50 GRAM + 69k TASKY`,
            token: 'CHAMPIONSHIP POOL',
            recipient: 'Top 30 Grand Champions',
            wallet: 'Season Grand Finale',
            type: 'Ad Championship Grand Payout',
            dateStr: new Date().toUTCString().replace('GMT', 'UTC')
          });
          await tBot.sendPhoto(channelId, pngBuffer, {
            caption: msgHtml, parse_mode: 'HTML', reply_markup: { inline_keyboard }
          }, { filename: 'championship-payout.png', contentType: 'image/png' });
        } catch {
          await tBot.sendMessage(channelId, msgHtml, { parse_mode: 'HTML', reply_markup: { inline_keyboard } });
        }
        channelPost = true;
      }
    } catch (botErr) {
      console.error('[Campaign] Channel post error:', botErr.message);
    }

    res.json({
      success: true,
      taskyRewarded,
      gramPendingCount,
      channelPost,
      tournamentClosed: true,
      total: winners.length,
      message: `TASKY credited to ${taskyRewarded} users. ${gramPendingCount} GRAM sends pending manual action.`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Campaign] distribute-prizes error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/campaign/announce-winners — Admin: post winner announcement without paying
// ─────────────────────────────────────────────────────────────────────────────
router.post('/announce-winners', async (req, res) => {
  const { customMessage = null } = req.body;
  try {
    const tournamentRes = await pool.query(
      "SELECT * FROM campaign_tournaments WHERE status IN ('ended_pending_admin_payout','paid','active') ORDER BY id DESC LIMIT 1"
    );
    if (!tournamentRes.rows[0]) return res.status(404).json({ error: 'No tournament found' });
    const t = tournamentRes.rows[0];

    const winnersRes = await pool.query(`
      SELECT u.telegram_id, u.username, u.first_name, COUNT(a.id) as ads_watched
      FROM ad_views a
      JOIN users u ON u.telegram_id::text = a.telegram_id::text
      WHERE a.created_at >= $1 AND a.created_at <= $2
        AND u.is_banned = FALSE AND NOT (u.telegram_id::text = ANY($3))
      GROUP BY u.telegram_id, u.username, u.first_name
      ORDER BY ads_watched DESC LIMIT 10
    `, [t.start_at, t.end_at, KNOWN_FRAUD_IDS]);

    const bot = require('../bot');
    const tBot = (bot && !bot.isDummy) ? bot : null;
    if (!tBot) return res.status(500).json({ error: 'Bot not available' });

    const channelRes = await pool.query('SELECT payout_channel_id FROM withdrawal_settings LIMIT 1');
    const channelId = channelRes.rows[0]?.payout_channel_id || '@TaskyPayouts';

    const rankEmojis = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    const lines = winnersRes.rows.map((w, i) => {
      const prize = getPrizeForRank(i + 1);
      const handle = w.username ? `@${w.username}` : (w.first_name || 'Member');
      return `${rankEmojis[i]} ${handle} — <b>${prize.gram} GRAM + ${prize.tasky.toLocaleString()} TASKY</b>`;
    }).join('\n');

    const msgHtml =
`🏆 <b>AD CHAMPIONSHIP — FINAL STANDINGS!</b> 🏆
━━━━━━━━━━━━━━━━━━━━━━━━

👑 <b>TOP 10 WINNERS THIS SEASON:</b>

${lines}

${customMessage ? `\n💬 <i>${customMessage}</i>\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━
⚡ Prizes are being processed &amp; sent!
Watch ads every day to compete next season. 🔥`;

    const inline_keyboard = [[
      { text: '🏆 Compete Next Season', url: 'https://t.me/TaskyAppbot/app' }
    ]];

    try {
      const { generatePayoutCardPngBuffer } = require('../utils/payoutChannel');
      const pngBuffer = generatePayoutCardPngBuffer({
        amount: 'TOP 10', token: 'WINNERS',
        recipient: 'Ad Championship', wallet: 'Season Results',
        type: 'Championship Final Standings',
        dateStr: new Date().toUTCString().replace('GMT', 'UTC')
      });
      await tBot.sendPhoto(channelId, pngBuffer, { caption: msgHtml, parse_mode: 'HTML', reply_markup: { inline_keyboard } }, { filename: 'championship-winners.png', contentType: 'image/png' });
    } catch {
      await tBot.sendMessage(channelId, msgHtml, { parse_mode: 'HTML', reply_markup: { inline_keyboard } });
    }
    res.json({ success: true, message: 'VIP Championship Announcement posted to channel' });
  } catch (err) {
    console.error('[Campaign] announce-winners error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/campaign/submit-winner-payout — Admin: Submit manual on-chain GRAM TX proof for individual winner
// ─────────────────────────────────────────────────────────────────────────────
router.post('/submit-winner-payout', async (req, res) => {
  const {
    tournament_id,
    telegram_id,
    rank,
    gram_amount,
    wallet_address,
    tx_hash,
    notify_user = true,
    broadcast_channel = true
  } = req.body;

  if (!telegram_id || !tx_hash || !tx_hash.trim()) {
    return res.status(400).json({ error: 'Telegram ID and Transaction Hash / Tonviewer link are required' });
  }

  const client = await pool.connect();
  try {
    const cleanTxHash = tx_hash.trim();
    const targetTournamentId = tournament_id || 1;

    // 1. Record or update payout in DB
    await client.query(`
      INSERT INTO campaign_payouts (tournament_id, telegram_id, rank, gram_amount, wallet_address, tx_hash, status, paid_at, approved_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'paid', NOW(), NOW())
      ON CONFLICT (tournament_id, telegram_id) 
      DO UPDATE SET 
        tx_hash = EXCLUDED.tx_hash,
        wallet_address = EXCLUDED.wallet_address,
        status = 'paid',
        paid_at = NOW()
    `, [targetTournamentId, String(telegram_id), rank || 1, gram_amount || 0.05, wallet_address || null, cleanTxHash]);

    // 2. Fetch user details for notification & proof
    const userRes = await client.query('SELECT username, first_name FROM users WHERE telegram_id::text = $1', [String(telegram_id)]);
    const userFull = userRes.rows[0] || {};
    const handle = userFull.username ? `@${userFull.username}` : (userFull.first_name || 'Champion');

    const bot = require('../bot');
    const tBot = (bot && !bot.isDummy) ? bot : null;

    // 3. Notify user via Telegram Bot
    if (notify_user && tBot && tBot.sendMessage) {
      try {
        const txLink = cleanTxHash.startsWith('http') ? cleanTxHash : `https://tonviewer.com/transaction/${cleanTxHash}`;
        const userMsg = 
`🏆 <b>AD CHAMPIONSHIP PRIZE PAID!</b> 🏆

Congratulations <b>${userFull.first_name || 'Champion'}</b>! 🚀
Your <b>#${rank || 'Top'} Place</b> prize of <b>${gram_amount} GRAM</b> has been sent to your wallet on the TON Blockchain!

💳 <b>Wallet:</b> <code>${wallet_address || 'Connected Wallet'}</code>
🔗 <b>Payment Proof:</b> <a href="${txLink}">View on Tonviewer</a>

⚠️ <b>SHARE YOUR WIN:</b>
Take a screenshot of your payment proof and share it in <a href="https://t.me/TaskyOfficialCommunity">@TaskyOfficialCommunity</a>! 🔥`;

        await tBot.sendMessage(String(telegram_id), userMsg, {
          parse_mode: 'HTML',
          link_preview_options: { url: txLink, is_disabled: false }
        }).catch(e => console.warn('[CampaignPayout] Notify user warning:', e.message));
      } catch (userErr) {
        console.error('[CampaignPayout] User notify error:', userErr.message);
      }
    }

    // 4. Broadcast verified payout proof to official Telegram Payout Channel
    if (broadcast_channel && tBot) {
      const { broadcastPayoutProof } = require('../utils/payoutChannel');
      const rankLabel = rank === 1 ? '🥇 1st Place Champion' : rank === 2 ? '🥈 2nd Place Runner-Up' : rank === 3 ? '🥉 3rd Place Bronze' : `🏅 Rank #${rank} Finalist`;
      await broadcastPayoutProof(tBot, {
        type: `🏆 Ad Championship ${rankLabel}`,
        amount: `${gram_amount}`,
        token: 'GRAM',
        wallet: wallet_address || '',
        tx_hash: cleanTxHash,
        telegram_id: String(telegram_id),
        username: userFull.username || '',
        first_name: userFull.first_name || ''
      }).catch(e => console.error('[CampaignPayout] Channel proof error:', e.message));
    }

    res.json({
      success: true,
      message: `Payout of ${gram_amount} GRAM for Rank #${rank} (${handle}) recorded & broadcasted!`
    });
  } catch (err) {
    console.error('[Campaign] submit-winner-payout error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;


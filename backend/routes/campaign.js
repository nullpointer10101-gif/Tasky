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
// PRIZE TIERS (Top 20 Winners for Referral Championship)
// 1st: 1.50 GRAM + 30,000 TASKY
// 2nd: 0.75 GRAM + 15,000 TASKY
// 3rd: 0.40 GRAM + 8,000 TASKY
// 4th-10th: 0.15 GRAM + 3,000 TASKY
// 11th-20th: 0.08 GRAM + 1,500 TASKY
// ─────────────────────────────────────────────────────────────────────────────
const REFERRAL_PRIZE_STRUCTURE = [
  { rankMin: 1,  rankMax: 1,  gram: 1.50, tasky: 30000, label: '🥇 1st Place' },
  { rankMin: 2,  rankMax: 2,  gram: 0.75, tasky: 15000, label: '🥈 2nd Place' },
  { rankMin: 3,  rankMax: 3,  gram: 0.40, tasky: 8000,  label: '🥉 3rd Place' },
  { rankMin: 4,  rankMax: 10, gram: 0.15, tasky: 3000,  label: '🏅 Ranks 4–10' },
  { rankMin: 11, rankMax: 20, gram: 0.08, tasky: 1500,  label: '🎖️ Ranks 11–20' }
];

const AD_PRIZE_STRUCTURE = [
  { rankMin: 1, rankMax: 1, gram: 1.00, tasky: 20000, label: '🥇 1st Place' },
  { rankMin: 2, rankMax: 2, gram: 0.50, tasky: 10000, label: '🥈 2nd Place' },
  { rankMin: 3, rankMax: 3, gram: 0.30, tasky: 5000, label: '🥉 3rd Place' },
  { rankMin: 4, rankMax: 10, gram: 0.10, tasky: 2000, label: '🏅 Ranks 4–10' },
  { rankMin: 11, rankMax: 30, gram: 0.05, tasky: 1000, label: '🎖️ Ranks 11–30' }
];

function getPrizeForRank(rank, tournamentType = 'referral', maxWinners = 20) {
  const limit = maxWinners || (tournamentType === 'referral' ? 20 : 30);
  if (rank < 1 || rank > limit) return { gram: 0, tasky: 0, label: 'None' };
  
  const structure = tournamentType === 'referral' ? REFERRAL_PRIZE_STRUCTURE : AD_PRIZE_STRUCTURE;
  const tier = structure.find(t => rank >= t.rankMin && rank <= t.rankMax);
  return tier ? { gram: tier.gram, tasky: tier.tasky, label: tier.label } : { gram: 0, tasky: 0, label: 'None' };
}

// Ensure database tables exist with columns
async function ensureTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_tournaments (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        start_at TIMESTAMPTZ NOT NULL,
        end_at TIMESTAMPTZ NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        tournament_type VARCHAR(50) DEFAULT 'referral',
        winners_count INTEGER DEFAULT 20,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS campaign_payouts (
        id SERIAL PRIMARY KEY,
        tournament_id INT NOT NULL,
        telegram_id VARCHAR(100) NOT NULL,
        rank INT NOT NULL,
        gram_amount NUMERIC(10,4) DEFAULT 0,
        tasky_amount NUMERIC(15,2) DEFAULT 0,
        wallet_address VARCHAR(255),
        tx_hash VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        paid_at TIMESTAMPTZ,
        approved_by VARCHAR(100),
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (tournament_id, telegram_id)
      );
    `);
    await pool.query(`
      ALTER TABLE campaign_tournaments ADD COLUMN IF NOT EXISTS tournament_type VARCHAR(50) DEFAULT 'ad';
      ALTER TABLE campaign_tournaments ADD COLUMN IF NOT EXISTS winners_count INTEGER DEFAULT 30;
      ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS gram_amount NUMERIC(10,4) DEFAULT 0;
      ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS tasky_amount NUMERIC(15,2) DEFAULT 0;
      ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS rank INT;
      ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(255);
      ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(255);
      ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
      ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
      ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);
      ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
      ALTER TABLE campaign_payouts ADD COLUMN IF NOT EXISTS ads_watched INT DEFAULT 0;
      ALTER TABLE campaign_payouts ALTER COLUMN ads_watched DROP NOT NULL;
      ALTER TABLE campaign_payouts ALTER COLUMN ads_watched SET DEFAULT 0;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_payouts_tourney_user ON campaign_payouts (tournament_id, telegram_id);
    `);
  } catch (e) {
    console.error('[Campaign] Error creating/updating tables:', e.message);
  }
}
ensureTables();

// Security Auto-Purge of Known Sybil & Bot Multi-Account Farms
const KNOWN_FRAUD_IDS = [
  '8222178828', '7810514939', '7366534603', '6828691165', '7537607597',
  '7160668593', '5661209883', '7893217017', '7123740694', '7673767415',
  '6436738775', '8087484055', '5237104574', '1544209326', '7223671479',
  '7740584645', '7418975002', '6715405557', '6243287146', '8115247688',
  '6821689937', '7837167107', '8808895468', '8932907056', '8764158576'
];

async function purgeFraudUsers() {
  try {
    await pool.query("UPDATE users SET is_banned = TRUE WHERE telegram_id::text = ANY($1)", [KNOWN_FRAUD_IDS]);
  } catch (err) {
    console.error('[Campaign Security] Purge error:', err.message);
  }
}
purgeFraudUsers();

// Get active tournament or create fresh 20-Day Referral Championship
async function getActiveTournament() {
  const res = await pool.query(
    "SELECT * FROM campaign_tournaments WHERE status = 'active' ORDER BY id DESC LIMIT 1"
  );
  if (res.rows.length > 0) {
    const t = res.rows[0];
    if (new Date(t.end_at) > new Date()) {
      return t;
    } else {
      await pool.query("UPDATE campaign_tournaments SET status = 'ended_pending_admin_payout' WHERE id = $1", [t.id]);
      t.status = 'ended_pending_admin_payout';
      return t;
    }
  }

  const pendingRes = await pool.query(
    "SELECT * FROM campaign_tournaments WHERE status = 'ended_pending_admin_payout' ORDER BY id DESC LIMIT 1"
  );
  if (pendingRes.rows.length > 0) {
    return pendingRes.rows[0];
  }

  // Create fresh 20-Day Referral Championship
  const title = `🚀 20-Day Referral Championship #${Date.now().toString().slice(-4)}`;
  const start_at = new Date();
  const end_at = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000); // 20 days

  const newRes = await pool.query(
    "INSERT INTO campaign_tournaments (title, start_at, end_at, status, tournament_type, winners_count) VALUES ($1, $2, $3, 'active', 'referral', 20) RETURNING *",
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
    const isReferral = (tournament.tournament_type === 'referral' || (tournament.title && tournament.title.toLowerCase().includes('referral'))) && !(tournament.title && tournament.title.toLowerCase().includes('ad')) && (tournament.tournament_type !== 'ad');
    const maxWinners = parseInt(tournament.winners_count || (isReferral ? 20 : 30), 10);

    let leaderboard = [];

    if (isReferral) {
      // 🚀 REFERRAL CHAMPIONSHIP:
      // Count ONLY referrals registered during tournament window who completed at least 1 task
      const leaderboardRes = await pool.query(`
        SELECT 
          referrer.telegram_id,
          referrer.username,
          referrer.first_name,
          COUNT(DISTINCT referred.telegram_id) as score
        FROM users referrer
        JOIN users referred ON referred.referred_by::text = referrer.telegram_id::text
        JOIN user_tasks ut ON ut.telegram_id::text = referred.telegram_id::text AND ut.status IN ('approved', 'done', 'completed')
        WHERE referred.created_at >= $1 AND referred.created_at <= $2
          AND referrer.is_banned = FALSE
          AND referred.is_banned = FALSE
          AND NOT (referrer.telegram_id::text = ANY($3))
        GROUP BY referrer.telegram_id, referrer.username, referrer.first_name
        ORDER BY score DESC, referrer.telegram_id ASC
        LIMIT $4
      `, [tournament.start_at, tournament.end_at, KNOWN_FRAUD_IDS, maxWinners]);

      leaderboard = leaderboardRes.rows.map((row, idx) => {
        const rank = idx + 1;
        const prize = getPrizeForRank(rank, 'referral', maxWinners);
        return {
          rank,
          telegram_id: row.telegram_id,
          username: row.username || null,
          first_name: row.first_name || 'Champion',
          score: parseInt(row.score || 0, 10),
          ads_watched: parseInt(row.score || 0, 10), // Backward compatibility for UI
          prize_gram: prize.gram,
          prize_tasky: prize.tasky
        };
      });
    } else {
      // AD CHAMPIONSHIP
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
        LIMIT $4
      `, [tournament.start_at, tournament.end_at, KNOWN_FRAUD_IDS, maxWinners]);

      leaderboard = leaderboardRes.rows.map((row, idx) => {
        const rank = idx + 1;
        const prize = getPrizeForRank(rank, 'ad', maxWinners);
        return {
          rank,
          telegram_id: row.telegram_id,
          username: row.username || null,
          first_name: row.first_name || 'Miner',
          ads_watched: parseInt(row.ads_watched || 0, 10),
          score: parseInt(row.ads_watched || 0, 10),
          prize_gram: prize.gram,
          prize_tasky: prize.tasky
        };
      });
    }

    let user_stats = {
      rank: null,
      score: 0,
      ads_watched: 0,
      estimated_gram: 0,
      estimated_tasky: 0
    };

    if (telegram_id) {
      if (isReferral) {
        const userScoreRes = await pool.query(`
          SELECT COUNT(DISTINCT referred.telegram_id) as count
          FROM users referred
          JOIN user_tasks ut ON ut.telegram_id::text = referred.telegram_id::text AND ut.status IN ('approved', 'done', 'completed')
          WHERE referred.referred_by::text = $1
            AND referred.created_at >= $2 AND referred.created_at <= $3
            AND referred.is_banned = FALSE
        `, [telegram_id, tournament.start_at, tournament.end_at]);

        const userScore = parseInt(userScoreRes.rows[0]?.count || 0, 10);
        user_stats.score = userScore;
        user_stats.ads_watched = userScore;

        if (userScore > 0) {
          const rankRes = await pool.query(`
            SELECT COUNT(*) as higher_count
            FROM (
              SELECT referrer.telegram_id, COUNT(DISTINCT referred.telegram_id) as cnt
              FROM users referrer
              JOIN users referred ON referred.referred_by::text = referrer.telegram_id::text
              JOIN user_tasks ut ON ut.telegram_id::text = referred.telegram_id::text AND ut.status IN ('approved', 'done', 'completed')
              WHERE referred.created_at >= $1 AND referred.created_at <= $2
                AND referrer.is_banned = FALSE AND referred.is_banned = FALSE
              GROUP BY referrer.telegram_id
              HAVING COUNT(DISTINCT referred.telegram_id) > $3
            ) sub
          `, [tournament.start_at, tournament.end_at, userScore]);

          const rank = parseInt(rankRes.rows[0]?.higher_count || 0, 10) + 1;
          user_stats.rank = rank;

          const prize = getPrizeForRank(rank, 'referral', maxWinners);
          user_stats.estimated_gram = prize.gram;
          user_stats.estimated_tasky = prize.tasky;
        }
      } else {
        const userAdRes = await pool.query(`
          SELECT COUNT(*) as count
          FROM ad_views
          WHERE telegram_id::text = $1
            AND created_at >= $2 AND created_at <= $3
        `, [telegram_id, tournament.start_at, tournament.end_at]);

        const userAds = parseInt(userAdRes.rows[0]?.count || 0, 10);
        user_stats.ads_watched = userAds;
        user_stats.score = userAds;

        if (userAds > 0) {
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

          const prize = getPrizeForRank(rank, 'ad', maxWinners);
          user_stats.estimated_gram = prize.gram;
          user_stats.estimated_tasky = prize.tasky;
        }
      }
    }

    res.json({
      success: true,
      tournament: {
        id: tournament.id,
        title: tournament.title,
        tournament_type: isReferral ? 'referral' : 'ad',
        winners_count: maxWinners,
        start_at: tournament.start_at,
        end_at: tournament.end_at,
        time_left_ms,
        status: tournament.status
      },
      leaderboard,
      user_stats,
      prize_structure: isReferral ? REFERRAL_PRIZE_STRUCTURE : AD_PRIZE_STRUCTURE
    });
  } catch (err) {
    console.error('[Campaign] Error in /tournament:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Backward compatibility alias
router.get('/leaderboard', (req, res) => {
  res.redirect('/api/campaign/tournament' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''));
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/campaign/payout-preview — Admin: Get final winners with wallet addresses
// ─────────────────────────────────────────────────────────────────────────────
router.get('/payout-preview', async (req, res) => {
  try {
    const tournament = await pool.query(
      "SELECT * FROM campaign_tournaments WHERE status IN ('ended_pending_admin_payout', 'active') ORDER BY id DESC LIMIT 1"
    );
    if (!tournament.rows[0]) {
      return res.status(404).json({ error: 'No active or ended tournament found' });
    }
    const t = tournament.rows[0];
    const isReferral = (t.tournament_type === 'referral' || (t.title && t.title.toLowerCase().includes('referral'))) && !(t.title && t.title.toLowerCase().includes('ad')) && (t.tournament_type !== 'ad');
    const maxWinners = isReferral ? parseInt(t.winners_count || 20, 10) : 30;

    let winnersRes;

    if (isReferral) {
      try {
        winnersRes = await pool.query(`
          SELECT 
            referrer.telegram_id, referrer.username, referrer.first_name, referrer.gram_wallet_address,
            COUNT(DISTINCT referred.telegram_id) as ads_watched,
            cp.tx_hash, cp.status as payout_status, cp.paid_at
          FROM users referrer
          JOIN users referred ON referred.referred_by::text = referrer.telegram_id::text
          JOIN user_tasks ut ON ut.telegram_id::text = referred.telegram_id::text AND ut.status IN ('approved', 'done', 'completed')
          LEFT JOIN campaign_payouts cp ON cp.tournament_id = $4 AND cp.telegram_id::text = referrer.telegram_id::text
          WHERE referred.created_at >= $1 AND referred.created_at <= $2
            AND referrer.is_banned = FALSE AND referred.is_banned = FALSE
            AND NOT (referrer.telegram_id::text = ANY($3))
          GROUP BY referrer.telegram_id, referrer.username, referrer.first_name, referrer.gram_wallet_address, cp.tx_hash, cp.status, cp.paid_at
          ORDER BY ads_watched DESC, referrer.telegram_id ASC
          LIMIT $5
        `, [t.start_at, t.end_at, KNOWN_FRAUD_IDS, t.id, maxWinners]);
      } catch (err) {
        winnersRes = await pool.query(`
          SELECT 
            referrer.telegram_id, referrer.username, referrer.first_name, referrer.gram_wallet_address,
            COUNT(DISTINCT referred.telegram_id) as ads_watched,
            NULL as tx_hash, NULL as payout_status, NULL as paid_at
          FROM users referrer
          JOIN users referred ON referred.referred_by::text = referrer.telegram_id::text
          JOIN user_tasks ut ON ut.telegram_id::text = referred.telegram_id::text AND ut.status IN ('approved', 'done', 'completed')
          WHERE referred.created_at >= $1 AND referred.created_at <= $2
            AND referrer.is_banned = FALSE AND referred.is_banned = FALSE
            AND NOT (referrer.telegram_id::text = ANY($3))
          GROUP BY referrer.telegram_id, referrer.username, referrer.first_name, referrer.gram_wallet_address
          ORDER BY ads_watched DESC, referrer.telegram_id ASC
          LIMIT $4
        `, [t.start_at, t.end_at, KNOWN_FRAUD_IDS, maxWinners]);
      }
    } else {
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
          LIMIT $5
        `, [t.start_at, t.end_at, KNOWN_FRAUD_IDS, t.id, maxWinners]);
      } catch (err) {
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
          LIMIT $4
        `, [t.start_at, t.end_at, KNOWN_FRAUD_IDS, maxWinners]);
      }
    }

    const winners = winnersRes.rows.map((row, idx) => {
      const rank = idx + 1;
      const prize = getPrizeForRank(rank, isReferral ? 'referral' : 'ad', maxWinners);
      return {
        rank,
        telegram_id: row.telegram_id,
        username: row.username || null,
        first_name: row.first_name || 'Champion',
        ads_watched: parseInt(row.ads_watched || 0, 10),
        score: parseInt(row.ads_watched || 0, 10),
        gram_wallet_address: row.gram_wallet_address || null,
        prize_gram: prize.gram,
        prize_tasky: prize.tasky,
        tx_hash: row.tx_hash || null,
        is_paid: !!row.tx_hash || row.payout_status === 'paid',
        paid_at: row.paid_at || null
      };
    });

    res.json({
      success: true,
      tournament: {
        ...t,
        tournament_type: isReferral ? 'referral' : 'ad',
        winners_count: maxWinners
      },
      winners,
      prize_structure: isReferral ? REFERRAL_PRIZE_STRUCTURE : AD_PRIZE_STRUCTURE,
      tournament_type: isReferral ? 'referral' : 'ad',
      winners_count: maxWinners
    });
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
    const isReferral = (t.tournament_type === 'referral') || (t.title && t.title.toLowerCase().includes('referral'));
    const maxWinners = parseInt(t.winners_count || (isReferral ? 20 : 30), 10);

    let winnersRes;
    if (isReferral) {
      winnersRes = await client.query(`
        SELECT 
          referrer.telegram_id, referrer.username, referrer.first_name, referrer.gram_wallet_address,
          COUNT(DISTINCT referred.telegram_id) as score
        FROM users referrer
        JOIN users referred ON referred.referred_by::text = referrer.telegram_id::text
        JOIN user_tasks ut ON ut.telegram_id::text = referred.telegram_id::text AND ut.status IN ('approved', 'done', 'completed')
        WHERE referred.created_at >= $1 AND referred.created_at <= $2
          AND referrer.is_banned = FALSE AND referred.is_banned = FALSE
          AND NOT (referrer.telegram_id::text = ANY($3))
        GROUP BY referrer.telegram_id, referrer.username, referrer.first_name, referrer.gram_wallet_address
        ORDER BY score DESC, referrer.telegram_id ASC
        LIMIT $4
      `, [t.start_at, t.end_at, KNOWN_FRAUD_IDS, maxWinners]);
    } else {
      winnersRes = await client.query(`
        SELECT 
          u.telegram_id, u.username, u.first_name, u.gram_wallet_address,
          COUNT(a.id) as score
        FROM ad_views a
        JOIN users u ON u.telegram_id::text = a.telegram_id::text
        WHERE a.created_at >= $1 AND a.created_at <= $2
          AND u.is_banned = FALSE AND NOT (u.telegram_id::text = ANY($3))
        GROUP BY u.telegram_id, u.username, u.first_name, u.gram_wallet_address
        ORDER BY score DESC, u.telegram_id ASC
        LIMIT $4
      `, [t.start_at, t.end_at, KNOWN_FRAUD_IDS, maxWinners]);
    }

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
      const prize = getPrizeForRank(rank, isReferral ? 'referral' : 'ad', maxWinners);

      // Credit TASKY immediately to balance
      await client.query(
        `UPDATE users SET balance = COALESCE(balance,0) + $1, total_earned = COALESCE(total_earned,0) + $1 WHERE telegram_id::text = $2`,
        [prize.tasky, String(w.telegram_id)]
      );
      taskyRewarded++;

      if (!w.gram_wallet_address) gramPendingCount++;

      await client.query(`
        INSERT INTO campaign_payouts (tournament_id, telegram_id, rank, gram_amount, tasky_amount, status, approved_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (tournament_id, telegram_id) DO NOTHING
      `, [
        t.id, String(w.telegram_id), rank, prize.gram, prize.tasky,
        w.gram_wallet_address ? 'tasky_paid_gram_pending_manual' : 'tasky_paid_gram_wallet_missing'
      ]);
    }

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
          const prize = getPrizeForRank(i + 1, isReferral ? 'referral' : 'ad', maxWinners);
          const handle = w.username ? `@${w.username}` : (w.first_name || 'Member');
          return `${rankEmojis[i] || `${i+1}.`} ${handle} (${w.score} ref) — <b>${prize.gram} GRAM + ${prize.tasky.toLocaleString()} TASKY</b>`;
        }).join('\n');

        const msgHtml =
`👑 🏆 <b>REFERRAL CHAMPIONSHIP — GRAND FINALE!</b> 🏆 👑
━━━━━━━━━━━━━━━━━━━━━━━━
🔥 <b>TOP ${maxWinners} CHAMPIONS PAID & REWARDED!</b> 💎

🌟 <b>PODIUM WINNERS:</b>
🥇 <b>#1:</b> ${top10[0]?.username ? `@${top10[0].username}` : (top10[0]?.first_name || 'Champion')} (<b>${top10[0]?.score || 0} valid refs</b>) → <b>1.50 GRAM + 30k TASKY</b>
🥈 <b>#2:</b> ${top10[1]?.username ? `@${top10[1].username}` : (top10[1]?.first_name || 'Runner-Up')} (<b>${top10[1]?.score || 0} valid refs</b>) → <b>0.75 GRAM + 15k TASKY</b>
🥉 <b>#3:</b> ${top10[2]?.username ? `@${top10[2].username}` : (top10[2]?.first_name || 'Bronze Hero')} (<b>${top10[2]?.score || 0} valid refs</b>) → <b>0.40 GRAM + 8k TASKY</b>

━━━━━━━━━━━━━━━━━━━━━━━━
🎖️ <b>TOP 10 STANDINGS:</b>
${lines}
<i>…plus ranks 11–${maxWinners} contenders rewarded!</i>

━━━━━━━━━━━━━━━━━━━━━━━━
💰 <b>TOTAL: 4.50 GRAM + 76,000 TASKY Distributed!</b> ✅
${customMessage ? `📢 <i>${customMessage}</i>\n` : ''}
🚀 <b>NEW SEASON HAS LAUNCHED! Invite friends & claim #1! 👑</b>`;

        const inline_keyboard = [
          [{ text: '👑 Join New Championship Season', url: 'https://t.me/TaskyAppbot/app' }],
          [{ text: '💎 Open Tasky App', url: 'https://t.me/TaskyAppbot/app' }]
        ];

        try {
          const { generatePayoutCardPngBuffer } = require('../utils/payoutChannel');
          const pngBuffer = generatePayoutCardPngBuffer({
            amount: `4.50 GRAM + 76k TASKY`,
            token: 'CHAMPIONSHIP POOL',
            recipient: `Top ${maxWinners} Champions`,
            wallet: 'Referral Season Finale',
            type: 'Referral Championship Grand Payout',
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
// POST /api/campaign/submit-winner-payout — Admin: Submit manual on-chain GRAM TX proof
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

    const existing = await client.query(
      'SELECT id FROM campaign_payouts WHERE tournament_id = $1 AND telegram_id::text = $2',
      [targetTournamentId, String(telegram_id)]
    );

    if (existing.rows.length > 0) {
      await client.query(`
        UPDATE campaign_payouts
        SET tx_hash = $1, wallet_address = $2, status = 'paid', paid_at = NOW(), gram_amount = $3, rank = $4
        WHERE id = $5
      `, [cleanTxHash, wallet_address || null, gram_amount || 0.05, rank || 1, existing.rows[0].id]);
    } else {
      await client.query(`
        INSERT INTO campaign_payouts (tournament_id, telegram_id, rank, gram_amount, wallet_address, tx_hash, status, paid_at, approved_at, ads_watched)
        VALUES ($1, $2, $3, $4, $5, $6, 'paid', NOW(), NOW(), 0)
      `, [targetTournamentId, String(telegram_id), rank || 1, gram_amount || 0.05, wallet_address || null, cleanTxHash]);
    }

    const userRes = await client.query('SELECT username, first_name FROM users WHERE telegram_id::text = $1', [String(telegram_id)]);
    const userFull = userRes.rows[0] || {};
    const handle = userFull.username ? `@${userFull.username}` : (userFull.first_name || 'Champion');

    const bot = require('../bot');
    const tBot = (bot && !bot.isDummy) ? bot : null;

    if (notify_user && tBot && tBot.sendMessage) {
      try {
        const txLink = cleanTxHash.startsWith('http') ? cleanTxHash : `https://tonviewer.com/transaction/${cleanTxHash}`;
        const userMsg = 
`🏆 <b>LEADERBOARD CHAMPIONSHIP PRIZE PAID!</b> 🏆

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

    if (broadcast_channel && tBot) {
      const { broadcastPayoutProof } = require('../utils/payoutChannel');
      const rankLabel = rank === 1 ? '🥇 1st Place Champion' : rank === 2 ? '🥈 2nd Place Runner-Up' : rank === 3 ? '🥉 3rd Place Bronze' : `🏅 Rank #${rank} Finalist`;
      await broadcastPayoutProof(tBot, {
        type: `🏆 Leaderboard ${rankLabel}`,
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/campaign/create-tournament — Admin: Start a new tournament
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create-tournament', async (req, res) => {
  const { title, duration_days = 20, tournament_type = 'referral', winners_count = 20 } = req.body;
  try {
    // End active ones
    await pool.query("UPDATE campaign_tournaments SET status = 'ended_pending_admin_payout' WHERE status = 'active'");

    const start_at = new Date();
    const end_at = new Date(Date.now() + parseInt(duration_days, 10) * 24 * 60 * 60 * 1000);
    const tournamentTitle = title || `🚀 ${duration_days}-Day Referral Championship #${Date.now().toString().slice(-4)}`;

    const newRes = await pool.query(
      `INSERT INTO campaign_tournaments (title, start_at, end_at, status, tournament_type, winners_count)
       VALUES ($1, $2, $3, 'active', $4, $5) RETURNING *`,
      [tournamentTitle, start_at, end_at, tournament_type, parseInt(winners_count, 10)]
    );

    res.json({ success: true, tournament: newRes.rows[0] });
  } catch (err) {
    console.error('[Campaign] create-tournament error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function getPrizeForRank(rank) {
  if (rank === 1) return { gram: 1.0, tasky: 20000, label: '🥇 1st Place' };
  if (rank === 2) return { gram: 0.5, tasky: 10000, label: '🥈 2nd Place' };
  if (rank === 3) return { gram: 0.3, tasky: 5000, label: '🥉 3rd Place' };
  if (rank >= 4 && rank <= 10) return { gram: 0.1, tasky: 2000, label: '🏅 Top 10' };
  if (rank >= 11 && rank <= 30) return { gram: 0.05, tasky: 1000, label: '🎖️ Top 30' };
  return { gram: 0, tasky: 0, label: 'None' };
}

async function run() {
  const client = await pool.connect();
  try {
    const tourneyRes = await client.query(
      "SELECT * FROM campaign_tournaments WHERE status = 'active' ORDER BY id DESC LIMIT 1"
    );
    const tournament = tourneyRes.rows[0];

    const leaderboardRes = await client.query(`
      SELECT 
        u.id as user_db_id,
        u.telegram_id,
        u.username,
        u.first_name,
        u.created_at as account_created_at,
        u.wallet_address,
        u.gram_wallet_address,
        u.is_banned,
        u.total_ads_watched,
        u.total_referrals,
        u.valid_referrals,
        u.mining_level,
        u.streak_days,
        COUNT(a.id) as tournament_ads
      FROM ad_views a
      JOIN users u ON u.telegram_id::text = a.telegram_id::text
      WHERE a.created_at >= $1 AND a.created_at <= $2
      GROUP BY u.id, u.telegram_id, u.username, u.first_name, u.created_at, u.wallet_address, u.gram_wallet_address, u.is_banned, u.total_ads_watched, u.total_referrals, u.valid_referrals, u.mining_level, u.streak_days
      ORDER BY tournament_ads DESC, u.telegram_id ASC
      LIMIT 30
    `, [tournament.start_at, tournament.end_at]);

    const results = [];
    const walletMap = new Map();

    for (let i = 0; i < leaderboardRes.rows.length; i++) {
      const row = leaderboardRes.rows[i];
      const rank = i + 1;
      const tid = String(row.telegram_id);
      const prize = getPrizeForRank(rank);

      if (row.wallet_address) {
        if (!walletMap.has(row.wallet_address)) walletMap.set(row.wallet_address, []);
        walletMap.get(row.wallet_address).push({ rank, tid, username: row.username });
      }

      const adsRes = await client.query(`
        SELECT created_at, ad_type
        FROM ad_views
        WHERE telegram_id::text = $1
          AND created_at >= $2 AND created_at <= $3
        ORDER BY created_at ASC
      `, [tid, tournament.start_at, tournament.end_at]);

      const adRows = adsRes.rows;
      let intervals = [];
      let sub8Count = 0;
      let sub10Count = 0;
      let sub12Count = 0;
      let hourlyBuckets = new Array(24).fill(0);
      let activeDaysSet = new Set();
      let activeHoursSet = new Set();

      for (let j = 0; j < adRows.length; j++) {
        const adTime = new Date(adRows[j].created_at);
        const hour = adTime.getUTCHours();
        hourlyBuckets[hour]++;

        const dayKey = adTime.toISOString().slice(0, 10);
        activeDaysSet.add(dayKey);
        activeHoursSet.add(`${dayKey}_${hour}`);

        if (j > 0) {
          const prevTime = new Date(adRows[j - 1].created_at);
          const diffSec = (adTime.getTime() - prevTime.getTime()) / 1000;
          intervals.push(diffSec);
          if (diffSec < 8.0) sub8Count++;
          if (diffSec < 10.0) sub10Count++;
          if (diffSec < 12.0) sub12Count++;
        }
      }

      let minInterval = intervals.length ? Math.min(...intervals) : 0;
      let maxInterval = intervals.length ? Math.max(...intervals) : 0;
      let avgInterval = intervals.length ? (intervals.reduce((a, b) => a + b, 0) / intervals.length) : 0;
      let medianInterval = 0;
      if (intervals.length) {
        const sorted = [...intervals].sort((a, b) => a - b);
        medianInterval = sorted[Math.floor(sorted.length / 2)];
      }

      const taskRes = await client.query(
        'SELECT COUNT(*) as completed_tasks FROM user_tasks WHERE telegram_id::text = $1 AND status = \'completed\'',
        [tid]
      );
      const completedTasks = parseInt(taskRes.rows[0]?.completed_tasks || 0, 10);

      const emptyHoursCount = hourlyBuckets.filter(c => c === 0).length;

      let flags = [];
      let riskScore = 0;

      if (row.is_banned) {
        flags.push('BANNED_IN_DB');
        riskScore += 100;
      }
      if (medianInterval < 10.0) {
        flags.push(`FAST_MEDIAN_${medianInterval.toFixed(1)}s`);
        riskScore += 30;
      }
      if (sub8Count > 10) {
        flags.push(`SUB8S_${sub8Count}`);
        riskScore += 30;
      }
      if (emptyHoursCount === 0 && adRows.length > 2000) {
        flags.push('NO_SLEEP_24H');
        riskScore += 35;
      }

      let verdict = 'REAL & GENUINE';
      let action = 'PAY';
      if (riskScore >= 70) {
        verdict = 'DEFINITE BOT / SCRIPT';
        action = 'DISQUALIFY & DO NOT PAY';
      } else if (riskScore >= 40) {
        verdict = 'HIGHLY SUSPICIOUS';
        action = 'HOLD / MANUAL CHECK';
      } else if (riskScore >= 20) {
        verdict = 'HEAVY HUMAN GRINDER';
        action = 'PAY';
      }

      results.push({
        rank,
        telegram_id: tid,
        username: row.username ? `@${row.username}` : 'No username',
        first_name: row.first_name || '',
        tournament_ads: adRows.length,
        lifetime_ads: row.total_ads_watched,
        prize_gram: prize.gram,
        prize_tasky: prize.tasky,
        prize_label: prize.label,
        account_age_days: ((Date.now() - new Date(row.account_created_at).getTime()) / (1000 * 86400)).toFixed(1),
        wallet: row.wallet_address || row.gram_wallet_address || 'None',
        median_gap_sec: parseFloat(medianInterval.toFixed(1)),
        avg_gap_sec: parseFloat(avgInterval.toFixed(1)),
        sub8s: sub8Count,
        sub10s: sub10Count,
        empty_utc_hours: emptyHoursCount,
        active_days: activeDaysSet.size,
        completed_tasks: completedTasks,
        total_referrals: row.total_referrals || 0,
        risk_score: riskScore,
        flags: flags.length ? flags : ['Clean'],
        verdict,
        action
      });
    }

    fs.writeFileSync('top30_audit_result.json', JSON.stringify({ tournament, results }, null, 2));
    console.log('Audit results written to top30_audit_result.json');
    
    // Print all 30
    console.log(JSON.stringify(results.map(r => ({
      Rank: r.rank,
      User: `${r.username} (${r.first_name})`,
      TGID: r.telegram_id,
      Ads: r.tournament_ads,
      Prize: `${r.prize_gram} GRAM`,
      MedianGap: `${r.median_gap_sec}s`,
      Sub8s: r.sub8s,
      SleepOff: `${r.empty_utc_hours}/24h`,
      Risk: r.risk_score,
      Action: r.action
    })), null, 2));

  } finally {
    client.release();
    await pool.end();
  }
}

run();

// TASKY SECURITY AUDIT SCRIPT
// Checks for: bot farms, duplicate claims, rapid-fire attacks, suspicious withdrawals,
// referral fraud, abnormal ad watching, impossible task completion speeds

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const DIVIDER = '─'.repeat(70);
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN  = '\x1b[32m';
const CYAN   = '\x1b[36m';
const RESET  = '\x1b[0m';

function flag(severity, label, rows) {
  const color = severity === 'HIGH' ? RED : severity === 'MED' ? YELLOW : GREEN;
  console.log(`\n${color}[${severity}] ${label}${RESET}`);
  if (rows.length === 0) {
    console.log('  ✓ Nothing suspicious found.');
  } else {
    console.table(rows);
  }
}

async function audit() {
  const client = await pool.connect();
  console.log(`\n${CYAN}${DIVIDER}`);
  console.log('  TASKY SECURITY AUDIT — ' + new Date().toLocaleString());
  console.log(`${DIVIDER}${RESET}`);

  try {

    // ══════════════════════════════════════════════════════════════
    // 1. RECENTLY REGISTERED USERS (last 24h) — overview
    // ══════════════════════════════════════════════════════════════
    console.log(`\n${CYAN}━━ 1. NEW USERS (LAST 24H) ━━${RESET}`);
    const newUsers = await client.query(`
      SELECT COUNT(*) as count,
             COUNT(CASE WHEN referred_by IS NOT NULL THEN 1 END) as via_referral
      FROM users WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    console.log(`  Total new: ${newUsers.rows[0].count}, Via referral: ${newUsers.rows[0].via_referral}`);

    // ══════════════════════════════════════════════════════════════
    // 2. BOT FARM DETECTION — users with zero activity but high balance
    // ══════════════════════════════════════════════════════════════
    console.log(`\n${CYAN}━━ 2. BOT FARM DETECTION ━━${RESET}`);
    const { rows: botSuspects } = await client.query(`
      SELECT u.telegram_id, u.username, u.balance, u.total_referrals, u.valid_referrals,
             u.created_at::date as joined,
             COUNT(ut.id) as tasks_done,
             u.last_checkin::date as last_checkin
      FROM users u
      LEFT JOIN user_tasks ut ON ut.telegram_id = u.telegram_id
      WHERE u.balance > 1000
        AND u.created_at > NOW() - INTERVAL '7 days'
        AND u.is_banned = false
      GROUP BY u.telegram_id, u.username, u.balance, u.total_referrals, u.valid_referrals, u.created_at, u.last_checkin
      HAVING COUNT(ut.id) = 0
      ORDER BY u.balance DESC
      LIMIT 30
    `);
    flag('HIGH', 'High balance + 0 tasks (last 7 days) — possible ghost accounts', botSuspects);

    // ══════════════════════════════════════════════════════════════
    // 3. REFERRAL FARMING — single referrer with many new accounts
    // ══════════════════════════════════════════════════════════════
    console.log(`\n${CYAN}━━ 3. REFERRAL FARMING ━━${RESET}`);
    const { rows: refFarm } = await client.query(`
      SELECT r.referrer_telegram_id,
             u.username,
             COUNT(*) as referrals_in_24h,
             COUNT(CASE WHEN r.reward_paid THEN 1 END) as paid_referrals
      FROM referrals r
      JOIN users u ON u.telegram_id = r.referrer_telegram_id
      WHERE r.created_at > NOW() - INTERVAL '24 hours'
      GROUP BY r.referrer_telegram_id, u.username
      HAVING COUNT(*) >= 5
      ORDER BY referrals_in_24h DESC
      LIMIT 20
    `);
    flag('HIGH', 'Users with 5+ referrals in last 24h — possible bot farm referral abuse', refFarm);

    // ══════════════════════════════════════════════════════════════
    // 4. SELF-REFERRAL DETECTION
    // ══════════════════════════════════════════════════════════════
    console.log(`\n${CYAN}━━ 4. SELF-REFERRAL DETECTION ━━${RESET}`);
    const { rows: selfRef } = await client.query(`
      SELECT r.referrer_telegram_id, r.referred_telegram_id,
             u1.username as referrer_name, u2.username as referred_name,
             r.created_at
      FROM referrals r
      JOIN users u1 ON u1.telegram_id = r.referrer_telegram_id
      JOIN users u2 ON u2.telegram_id = r.referred_telegram_id
      WHERE r.referrer_telegram_id = r.referred_telegram_id
      LIMIT 20
    `);
    flag('HIGH', 'Self-referrals (same user refers themselves)', selfRef);

    // ══════════════════════════════════════════════════════════════
    // 5. DUPLICATE CHECKIN ATTEMPTS (same user, same day)
    // ══════════════════════════════════════════════════════════════
    console.log(`\n${CYAN}━━ 5. RAPID CHECK-INS ━━${RESET}`);
    const { rows: rapidCheckin } = await client.query(`
      SELECT telegram_id, last_checkin, streak_days, balance
      FROM users
      WHERE last_checkin > NOW() - INTERVAL '1 hour'
      ORDER BY last_checkin DESC
      LIMIT 10
    `);
    console.log('  Last 10 check-ins (most recent):');
    console.table(rapidCheckin);

    // ══════════════════════════════════════════════════════════════
    // 6. AD WATCHING ABUSE — abnormally high ad views per user (last 24h)
    // ══════════════════════════════════════════════════════════════
    console.log(`\n${CYAN}━━ 6. AD WATCHING ABUSE ━━${RESET}`);
    const { rows: adAbuse } = await client.query(`
      SELECT av.telegram_id, u.username, COUNT(*) as ad_views_24h,
             u.total_ads_watched, u.withdrawal_ads_watched
      FROM ad_views av
      JOIN users u ON u.telegram_id = av.telegram_id
      WHERE av.created_at > NOW() - INTERVAL '24 hours'
      GROUP BY av.telegram_id, u.username, u.total_ads_watched, u.withdrawal_ads_watched
      HAVING COUNT(*) > 20
      ORDER BY ad_views_24h DESC
      LIMIT 20
    `);
    flag('MED', 'Users with >20 ad views in 24h — possible ad click abuse', adAbuse);

    // ══════════════════════════════════════════════════════════════
    // 7. SUSPICIOUS WITHDRAWALS / SWAPS (last 7 days)
    // ══════════════════════════════════════════════════════════════
    console.log(`\n${CYAN}━━ 7. RECENT SWAPS/WITHDRAWALS ━━${RESET}`);
    const { rows: recentSwaps } = await client.query(`
      SELECT s.id, s.telegram_id, u.username, s.tasky_amount,
             s.receive_token, s.receive_amount, s.wallet_address,
             s.status, s.requested_at::date as date, s.chain
      FROM swaps s
      JOIN users u ON u.telegram_id = s.telegram_id
      WHERE s.requested_at > NOW() - INTERVAL '7 days'
      ORDER BY s.requested_at DESC
      LIMIT 30
    `);
    flag('LOW', 'All swaps in last 7 days', recentSwaps);

    // ══════════════════════════════════════════════════════════════
    // 8. USERS WITH SUSPICIOUSLY HIGH BALANCE VS ACCOUNT AGE
    // ══════════════════════════════════════════════════════════════
    console.log(`\n${CYAN}━━ 8. HIGH BALANCE NEW ACCOUNTS ━━${RESET}`);
    const { rows: highBalNew } = await client.query(`
      SELECT telegram_id, username, balance, total_referrals, valid_referrals,
             EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_old,
             created_at::date as joined
      FROM users
      WHERE created_at > NOW() - INTERVAL '48 hours'
        AND balance > 5000
      ORDER BY balance DESC
      LIMIT 20
    `);
    flag('HIGH', 'Accounts <48h old with balance >5000 TASKY', highBalNew);

    // ══════════════════════════════════════════════════════════════
    // 9. TASK COMPLETION SPAM — many tasks in short time
    // ══════════════════════════════════════════════════════════════
    console.log(`\n${CYAN}━━ 9. TASK SPAM DETECTION ━━${RESET}`);
    const { rows: taskSpam } = await client.query(`
      SELECT ut.telegram_id, u.username, COUNT(*) as tasks_submitted_24h,
             COUNT(CASE WHEN ut.status = 'approved' THEN 1 END) as approved,
             COUNT(CASE WHEN ut.status = 'pending' THEN 1 END) as pending,
             COUNT(CASE WHEN ut.status = 'rejected' THEN 1 END) as rejected
      FROM user_tasks ut
      JOIN users u ON u.telegram_id = ut.telegram_id
      WHERE ut.submitted_at > NOW() - INTERVAL '24 hours'
      GROUP BY ut.telegram_id, u.username
      HAVING COUNT(*) >= 5
      ORDER BY tasks_submitted_24h DESC
      LIMIT 20
    `);
    flag('MED', 'Users submitting 5+ tasks in 24h — check for task farming', taskSpam);

    // ══════════════════════════════════════════════════════════════
    // 10. GRAM CLAIMS — check for double-claim attempts
    // ══════════════════════════════════════════════════════════════
    console.log(`\n${CYAN}━━ 10. GRAM CLAIM ABUSE ━━${RESET}`);
    const { rows: gramAbuse } = await client.query(`
      SELECT gc.telegram_id, u.username, COUNT(*) as claim_count,
             SUM(gc.amount) as total_claimed,
             STRING_AGG(gc.status, ', ') as statuses,
             MAX(gc.requested_at)::date as last_claim
      FROM gram_claims gc
      JOIN users u ON u.telegram_id = gc.telegram_id
      WHERE gc.requested_at > NOW() - INTERVAL '7 days'
      GROUP BY gc.telegram_id, u.username
      HAVING COUNT(*) > 1
      ORDER BY claim_count DESC
      LIMIT 20
    `);
    flag('MED', 'Users with multiple GRAM claims in 7 days', gramAbuse);

    // ══════════════════════════════════════════════════════════════
    // 11. PENDING CLAIMS BACKLOG (gram + swaps)
    // ══════════════════════════════════════════════════════════════
    console.log(`\n${CYAN}━━ 11. PENDING BACKLOG ━━${RESET}`);
    const { rows: pendingBacklog } = await client.query(`
      SELECT 'gram_claims' as type, COUNT(*) as pending_count,
             MIN(requested_at)::date as oldest
      FROM gram_claims WHERE status = 'pending'
      UNION ALL
      SELECT 'swaps', COUNT(*), MIN(requested_at)::date
      FROM swaps WHERE status = 'pending'
      UNION ALL
      SELECT 'user_tasks', COUNT(*), MIN(submitted_at)::date
      FROM user_tasks WHERE status = 'pending'
    `);
    flag('LOW', 'Pending backlog across all transaction types', pendingBacklog);

    // ══════════════════════════════════════════════════════════════
    // 12. BANNED USERS WITH ACTIVE SESSIONS / RECENT ACTIVITY
    // ══════════════════════════════════════════════════════════════
    console.log(`\n${CYAN}━━ 12. BANNED USER ACTIVITY ━━${RESET}`);
    const { rows: bannedActivity } = await client.query(`
      SELECT u.telegram_id, u.username, u.balance, u.is_banned,
             COUNT(ut.id) as tasks_submitted_total,
             u.last_checkin
      FROM users u
      LEFT JOIN user_tasks ut ON ut.telegram_id = u.telegram_id
      WHERE u.is_banned = true
      GROUP BY u.telegram_id, u.username, u.balance, u.is_banned, u.last_checkin
      HAVING COUNT(ut.id) > 0
      ORDER BY u.balance DESC
      LIMIT 20
    `);
    flag('HIGH', 'Banned users who submitted tasks (bypass attempts?)', bannedActivity);

    // ══════════════════════════════════════════════════════════════
    // 13. DUPLICATE WALLET ADDRESSES (multiple users, same wallet)
    // ══════════════════════════════════════════════════════════════
    console.log(`\n${CYAN}━━ 13. SHARED WALLET ADDRESSES ━━${RESET}`);
    const { rows: sharedWallets } = await client.query(`
      SELECT wallet_address, COUNT(*) as user_count,
             STRING_AGG(telegram_id::text, ', ') as user_ids,
             STRING_AGG(COALESCE(username,'?'), ', ') as usernames
      FROM users
      WHERE wallet_address IS NOT NULL AND wallet_address != ''
      GROUP BY wallet_address
      HAVING COUNT(*) > 1
      ORDER BY user_count DESC
      LIMIT 20
    `);
    flag('HIGH', 'Multiple users sharing same wallet address — possible Sybil attack', sharedWallets);

    // ══════════════════════════════════════════════════════════════
    // 14. OVERALL HEALTH STATS
    // ══════════════════════════════════════════════════════════════
    console.log(`\n${CYAN}━━ 14. OVERALL PLATFORM HEALTH ━━${RESET}`);
    const { rows: health } = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE is_banned = true) as banned_users,
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '24h') as new_24h,
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7d') as new_7d,
        (SELECT COUNT(*) FROM swaps WHERE status = 'pending') as pending_swaps,
        (SELECT COUNT(*) FROM gram_claims WHERE status = 'pending') as pending_gram,
        (SELECT COUNT(*) FROM user_tasks WHERE status = 'pending') as pending_tasks,
        (SELECT COALESCE(SUM(balance),0) FROM users) as total_tasky_in_circulation,
        (SELECT COUNT(*) FROM ad_views WHERE created_at > NOW() - INTERVAL '24h') as ad_views_24h
    `);
    console.log('\n  📊 Platform Health Snapshot:');
    console.table(health.rows);

    console.log(`\n${GREEN}${DIVIDER}`);
    console.log('  Audit Complete.');
    console.log(`${DIVIDER}${RESET}\n`);

  } catch (err) {
    console.error('Audit error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

audit();

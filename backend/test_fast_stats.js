const { pool } = require('./db');

async function testFastStats() {
  console.time('fast_stats');
  try {
    const [userStatsRes, pendingRes, gramAdsRes, newUsersRes] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) as total_users, 
          COALESCE(SUM(balance), 0) as total_tasky, 
          COALESCE(SUM(gram_balance), 0) as total_gram,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as new_users_today
        FROM users
      `),
      pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM user_tasks WHERE status = 'pending') as pending_tasks,
          (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending') as pending_withdrawals,
          (SELECT COUNT(*) FROM gram_claims WHERE status = 'pending') as pending_gram_claims,
          (SELECT COUNT(*) FROM gram_withdrawals WHERE status = 'pending') as pending_gram_withdrawals
      `),
      pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE) as yesterday,
          COUNT(*) FILTER (WHERE ad_type IN ('gram_ad', 'gram_gigapub') AND created_at >= CURRENT_DATE) as today_gigapub,
          COUNT(*) FILTER (WHERE ad_type = 'gram_monetag' AND created_at >= CURRENT_DATE) as today_monetag
        FROM ad_views
        WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND ad_type IN ('gram_ad', 'gram_gigapub', 'gram_monetag')
      `),
      pool.query(`
        SELECT telegram_id, username, first_name, created_at
        FROM users
        WHERE created_at >= CURRENT_DATE
        ORDER BY created_at DESC
        LIMIT 300
      `)
    ]);

    console.timeEnd('fast_stats');
    console.log('Result sample:', {
      totalUsers: userStatsRes.rows[0].total_users,
      pendingTasks: pendingRes.rows[0].pending_tasks,
      todayAds: gramAdsRes.rows[0].today,
      newUsers: newUsersRes.rows.length
    });
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

testFastStats();

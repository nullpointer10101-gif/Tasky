const { pool } = require('./db');

async function benchmark() {
  console.time('stats_sequential');
  try {
    const usersRes = await pool.query('SELECT COUNT(*) FROM users');
    const tasksRes = await pool.query("SELECT COUNT(*) FROM user_tasks WHERE status = 'pending'");
    const withdrawalsRes = await pool.query("SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'");
    const balanceRes = await pool.query('SELECT SUM(balance), COALESCE(SUM(gram_balance), 0) as gram_sum FROM users');
    const gramAdsRes = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE) as yesterday,
        COUNT(*) FILTER (WHERE ad_type IN ('gram_ad', 'gram_gigapub') AND created_at >= CURRENT_DATE) as today_gigapub,
        COUNT(*) FILTER (WHERE ad_type = 'gram_monetag' AND created_at >= CURRENT_DATE) as today_monetag
      FROM ad_views
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND ad_type IN ('gram_ad', 'gram_gigapub', 'gram_monetag')
    `);
    console.timeEnd('stats_sequential');
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

benchmark();

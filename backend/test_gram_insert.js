require('dotenv').config();
const { pool } = require('./db');

async function test() {
  const telegramId = '6513696097'; // user who already has 1 entry

  // Check current count
  const before = await pool.query(`
    SELECT COUNT(*) FROM user_tasks ut
    JOIN tasks t ON ut.task_id = t.id
    WHERE ut.telegram_id = $1 AND t.verification_type = 'gram_ad'
  `, [telegramId]);
  console.log('gram_ad entries BEFORE:', before.rows[0].count);

  // Check 24h count used by the duplicate check
  const adCountRes = await pool.query(
    `SELECT COUNT(*), MAX(submitted_at) as last_ad_time FROM user_tasks WHERE telegram_id = $1 AND task_id = 27 AND status IN ('approved', 'rejected', 'pending') AND submitted_at >= NOW() - INTERVAL '24 hours'`,
    [telegramId]
  );
  console.log('24h ad count (limit check):', adCountRes.rows[0].count, '| last_ad_time:', adCountRes.rows[0].last_ad_time);

  // Try manually inserting a second gram_ad entry
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertRes = await client.query(`
      INSERT INTO user_tasks (telegram_id, task_id, status, submitted_at, reviewed_at, proof_screenshot_url, rejection_reason, approved_by)
      VALUES ($1, 27, 'approved', NOW(), NOW(), 'auto_verified_by_bot', null, 'auto')
      RETURNING id
    `, [telegramId]);
    console.log('\nManual INSERT succeeded! New row id:', insertRes.rows[0].id);
    await client.query('ROLLBACK'); // Don't actually keep it
    console.log('(Rolled back - just testing)');
  } catch (e) {
    await client.query('ROLLBACK');
    console.log('Manual INSERT FAILED:', e.message);
  } finally {
    client.release();
  }

  // Check after
  const after = await pool.query(`
    SELECT COUNT(*) FROM user_tasks ut
    JOIN tasks t ON ut.task_id = t.id
    WHERE ut.telegram_id = $1 AND t.verification_type = 'gram_ad'
  `, [telegramId]);
  console.log('\ngram_ad entries AFTER:', after.rows[0].count);

  await pool.end();
}
test();

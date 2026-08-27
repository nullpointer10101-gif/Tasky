require('dotenv').config();
const { pool } = require('./db');

async function runTest() {
  const telegram_id = 999999999; // Using a dummy telegram ID for testing

  try {
    // 1. Ensure test user exists in db
    await pool.query(`
      INSERT INTO users (telegram_id, username, first_name, balance)
      VALUES ($1, 'test_gram_user', 'Test Gram', 100)
      ON CONFLICT (telegram_id) DO NOTHING
    `, [telegram_id]);

    // 2. Fetch the gram_ad task
    const taskRes = await pool.query("SELECT * FROM tasks WHERE verification_type = 'gram_ad' LIMIT 1");
    if (taskRes.rows.length === 0) {
      console.error('❌ Error: No task found with verification_type = gram_ad in database.');
      return;
    }
    const task = taskRes.rows[0];
    console.log(`ℹ️ Found Gram Ad Task: ID=${task.id}, Title="${task.title}"`);

    // Helper to get status from DB logic (simulating the status route query)
    const getStatus = async () => {
      const adCountRes = await pool.query(`
        SELECT COUNT(*) FROM user_tasks ut
        JOIN tasks t ON ut.task_id = t.id
        WHERE ut.telegram_id = $1 
          AND t.verification_type = 'gram_ad' 
          AND ut.status = 'approved' 
          AND ut.submitted_at >= NOW() - INTERVAL '24 hours'
      `, [telegram_id]);
      return parseInt(adCountRes.rows[0].count, 10);
    };

    const initialCount = await getStatus();
    console.log(`📊 Initial ads_watched_today (gram_ad): ${initialCount}`);

    // 3. Clean up any existing test completions for today to start fresh
    await pool.query(`
      DELETE FROM user_tasks 
      WHERE telegram_id = $1 AND task_id = $2
    `, [telegram_id, task.id]);

    const statusAfterClean = await getStatus();
    console.log(`🧹 Cleaned up. Count: ${statusAfterClean}`);

    // 4. Mock complete the task once
    console.log('⚡ Mocking completion of Gram Ad task...');
    await pool.query(`
      INSERT INTO user_tasks (telegram_id, task_id, status, submitted_at, reviewed_at, proof_screenshot_url, approved_by)
      VALUES ($1, $2, 'approved', NOW(), NOW(), 'auto_verified_by_bot', 'auto')
    `, [telegram_id, task.id]);

    // 5. Query status again
    const finalCount = await getStatus();
    console.log(`📊 Final ads_watched_today (gram_ad): ${finalCount}`);

    if (finalCount === 1) {
      console.log('✅ Success: Task completion registered and queried correctly as gram_ad!');
    } else {
      console.error(`❌ Failure: Expected count to be 1, but got ${finalCount}`);
    }

    // Clean up test data
    await pool.query(`
      DELETE FROM user_tasks WHERE telegram_id = $1 AND task_id = $2
    `, [telegram_id, task.id]);
    await pool.query('DELETE FROM users WHERE telegram_id = $1', [telegram_id]);
    console.log('🧹 Cleaned up test user and completions.');

  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    await pool.end();
  }
}

runTest();

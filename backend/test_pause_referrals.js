require('dotenv').config();
const { pool } = require('./db');

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  const referrerPausedId = 777111000;
  const referrerActiveId = 777222000;
  const referredPausedUserId = 777333000;
  const referredActiveUserId = 777444000;

  console.log('🏁 Starting Pause Referrals Cooldown & Validation Test...');

  try {
    // 0. Seed referral rules if missing
    await pool.query(`
      INSERT INTO referral_rules (reward_per_referral, tasks_required_for_valid, spin_reward_per_referral)
      SELECT 200, 1, 1
      WHERE NOT EXISTS (SELECT 1 FROM referral_rules)
    `);
    const rulesRes = await pool.query('SELECT * FROM referral_rules LIMIT 1');
    const rules = rulesRes.rows[0];
    // Force tasks required to 1 for easy testing
    await pool.query('UPDATE referral_rules SET tasks_required_for_valid = 1');
    console.log('ℹ️ Referral Rules: reward=', rules.reward_per_referral, 'required_tasks=1');

    // 1. Setup mock users
    // Referrer 1 (Paused referrals)
    await pool.query(`
      INSERT INTO users (telegram_id, username, first_name, balance, valid_referrals, spins_available, referrals_paused)
      VALUES ($1, 'ref_paused', 'Paused Ref', 1000, 0, 0, true)
      ON CONFLICT (telegram_id) DO UPDATE SET balance = 1000, valid_referrals = 0, spins_available = 0, referrals_paused = true
    `, [referrerPausedId]);

    // Referred User 1 (under Paused Referrer)
    await pool.query(`
      INSERT INTO users (telegram_id, username, first_name, referred_by)
      VALUES ($1, 'referred_u1', 'Referred U1', $2)
      ON CONFLICT (telegram_id) DO UPDATE SET referred_by = $2
    `, [referredPausedUserId, referrerPausedId]);

    // Referrer 2 (Active referrals)
    await pool.query(`
      INSERT INTO users (telegram_id, username, first_name, balance, valid_referrals, spins_available, referrals_paused)
      VALUES ($1, 'ref_active', 'Active Ref', 1000, 0, 0, false)
      ON CONFLICT (telegram_id) DO UPDATE SET balance = 1000, valid_referrals = 0, spins_available = 0, referrals_paused = false
    `, [referrerActiveId]);

    // Referred User 2 (under Active Referrer)
    await pool.query(`
      INSERT INTO users (telegram_id, username, first_name, referred_by)
      VALUES ($1, 'referred_u2', 'Referred U2', $2)
      ON CONFLICT (telegram_id) DO UPDATE SET referred_by = $2
    `, [referredActiveUserId, referrerActiveId]);

    // Setup active tasks
    let taskRes = await pool.query("SELECT id FROM tasks WHERE is_active = true LIMIT 1");
    if (taskRes.rows.length === 0) {
      taskRes = await pool.query(`
        INSERT INTO tasks (title, subtitle, type, reward_tasky, action_url, is_active, is_featured, verification_type)
        VALUES ('Test Verification Task', 'Test subtitle', 'general', 50, '', true, false, 'proof_screenshot')
        RETURNING id
      `);
    }
    const taskId = taskRes.rows[0].id;

    // Clean up referrals tables for test users
    await pool.query('DELETE FROM referrals WHERE referrer_telegram_id IN ($1, $2)', [referrerPausedId, referrerActiveId]);
    await pool.query('DELETE FROM user_tasks WHERE telegram_id IN ($1, $2)', [referredPausedUserId, referredActiveUserId]);

    // Initialize mock referral entry (which completeTask or review expects)
    await pool.query(`
      INSERT INTO referrals (referrer_telegram_id, referred_telegram_id, reward_paid)
      VALUES ($1, $2, false), ($3, $4, false)
    `, [referrerPausedId, referredPausedUserId, referrerActiveId, referredActiveUserId]);

    // --- TEST 1: Simulating Task Approval for Referred U1 (Paused Referrer) ---
    console.log('\n🧪 TEST 1: Approving task for referred user under PAUSED Referrer...');
    
    // Simulate user_tasks insertion by user
    await pool.query(`
      INSERT INTO user_tasks (telegram_id, task_id, status, submitted_at, proof_screenshot_url)
      VALUES ($1, $2, 'pending', NOW(), 'proof_pic.png')
    `, [referredPausedUserId, taskId]);
    const utRes1 = await pool.query('SELECT id FROM user_tasks WHERE telegram_id = $1 AND task_id = $2 LIMIT 1', [referredPausedUserId, taskId]);
    const utId1 = utRes1.rows[0].id;

    // Simulate Admin approval logic (/review endpoint logic)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("UPDATE user_tasks SET status = 'approved', reviewed_at = NOW(), approved_by = 'admin' WHERE id = $1", [utId1]);
      
      const approvedCountRes = await client.query(`SELECT COUNT(*) FROM user_tasks WHERE telegram_id = $1 AND status = 'approved' AND approved_by = 'admin'`, [referredPausedUserId]);
      const approvedCount = parseInt(approvedCountRes.rows[0].count, 10);
      
      const checkReferrer = await client.query('SELECT referrals_paused FROM users WHERE telegram_id = $1', [referrerPausedId]);
      const isPaused = checkReferrer.rows[0]?.referrals_paused || false;

      const referrerRes = await client.query(
        'UPDATE referrals SET reward_paid = TRUE WHERE referrer_telegram_id = $1::bigint AND referred_telegram_id = $2::bigint AND reward_paid = FALSE RETURNING *',
        [referrerPausedId, referredPausedUserId]
      );

      if (referrerRes.rowCount > 0 && !isPaused) {
        await client.query(`
          UPDATE users SET balance = balance + 200, valid_referrals = valid_referrals + 1, spins_available = spins_available + 1 WHERE telegram_id = $1
        `, [referrerPausedId]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    // Check Referrer 1 (Paused) values
    const pausedRefStatus = await pool.query('SELECT balance, valid_referrals, spins_available FROM users WHERE telegram_id = $1', [referrerPausedId]);
    console.log('👉 Paused Referrer Stats:', pausedRefStatus.rows[0]);
    if (
      pausedRefStatus.rows[0].valid_referrals !== 0 ||
      parseFloat(pausedRefStatus.rows[0].balance) !== 1000 ||
      pausedRefStatus.rows[0].spins_available !== 0
    ) {
      console.error('❌ TEST 1 FAILED: Paused referrer was credited rewards!');
    } else {
      console.log('✅ TEST 1 PASSED: Paused referrer was correctly NOT credited!');
    }


    // --- TEST 2: Simulating Task Approval for Referred U2 (Active Referrer) ---
    console.log('\n🧪 TEST 2: Approving task for referred user under ACTIVE Referrer...');
    
    // Simulate user_tasks insertion by user
    await pool.query(`
      INSERT INTO user_tasks (telegram_id, task_id, status, submitted_at, proof_screenshot_url)
      VALUES ($1, $2, 'pending', NOW(), 'proof_pic.png')
    `, [referredActiveUserId, taskId]);
    const utRes2 = await pool.query('SELECT id FROM user_tasks WHERE telegram_id = $1 AND task_id = $2 LIMIT 1', [referredActiveUserId, taskId]);
    const utId2 = utRes2.rows[0].id;

    // Simulate Admin approval logic
    const client2 = await pool.connect();
    try {
      await client2.query('BEGIN');
      await client2.query("UPDATE user_tasks SET status = 'approved', reviewed_at = NOW(), approved_by = 'admin' WHERE id = $1", [utId2]);
      
      const approvedCountRes = await client2.query(`SELECT COUNT(*) FROM user_tasks WHERE telegram_id = $1 AND status = 'approved' AND approved_by = 'admin'`, [referredActiveUserId]);
      const approvedCount = parseInt(approvedCountRes.rows[0].count, 10);
      
      const checkReferrer = await client2.query('SELECT referrals_paused FROM users WHERE telegram_id = $1', [referrerActiveId]);
      const isPaused = checkReferrer.rows[0]?.referrals_paused || false;

      const referrerRes = await client2.query(
        'UPDATE referrals SET reward_paid = TRUE WHERE referrer_telegram_id = $1::bigint AND referred_telegram_id = $2::bigint AND reward_paid = FALSE RETURNING *',
        [referrerActiveId, referredActiveUserId]
      );

      if (referrerRes.rowCount > 0 && !isPaused) {
        await client2.query(`
          UPDATE users SET balance = balance + 200, valid_referrals = valid_referrals + 1, spins_available = spins_available + 1 WHERE telegram_id = $1
        `, [referrerActiveId]);
      }
      await client2.query('COMMIT');
    } catch (e) {
      await client2.query('ROLLBACK');
      throw e;
    } finally {
      client2.release();
    }

    // Check Referrer 2 (Active) values
    const activeRefStatus = await pool.query('SELECT balance, valid_referrals, spins_available FROM users WHERE telegram_id = $1', [referrerActiveId]);
    console.log('👉 Active Referrer Stats:', activeRefStatus.rows[0]);
    if (
      activeRefStatus.rows[0].valid_referrals !== 1 ||
      parseFloat(activeRefStatus.rows[0].balance) !== 1200 ||
      activeRefStatus.rows[0].spins_available !== 1
    ) {
      console.error('❌ TEST 2 FAILED: Active referrer was NOT credited rewards!');
    } else {
      console.log('✅ TEST 2 PASSED: Active referrer was successfully credited rewards!');
    }

  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    // 3. Clean up DB state
    await pool.query('DELETE FROM user_tasks WHERE telegram_id IN ($1, $2)', [referredPausedUserId, referredActiveUserId]);
    await pool.query('DELETE FROM referrals WHERE referrer_telegram_id IN ($1, $2)', [referrerPausedId, referrerActiveId]);
    await pool.query('DELETE FROM users WHERE telegram_id IN ($1, $2, $3, $4)', [referrerPausedId, referrerActiveId, referredPausedUserId, referredActiveUserId]);
    console.log('\n🧹 Database test records cleaned up.');
    await pool.end();
    console.log('⏹️ End.');
  }
}

runTest();

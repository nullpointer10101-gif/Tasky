require('dotenv').config();
const { fork } = require('child_process');
const { pool } = require('./db');

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runApiTest() {
  const telegram_id = 888888888; // Test telegram ID
  const PORT = process.env.PORT || 3000;
  const baseUrl = `http://127.0.0.1:${PORT}/api`;

  console.log('🏁 Starting API Integration Test for Gram Ads...');

  // 1. Setup DB state first
  try {
    // Ensure test user exists
    await pool.query(`
      INSERT INTO users (telegram_id, username, first_name, balance, wallet_address)
      VALUES ($1, 'test_api_user', 'Test API', 100, 'UQDb...TestTONAddress')
      ON CONFLICT (telegram_id) DO UPDATE SET wallet_address = 'UQDb...TestTONAddress'
    `, [telegram_id]);

    // Ensure Gram Daily Ad task exists
    const taskRes = await pool.query("SELECT * FROM tasks WHERE verification_type = 'gram_ad' LIMIT 1");
    if (taskRes.rows.length === 0) {
      // Seed if missing
      await pool.query(`
        INSERT INTO tasks (title, subtitle, type, reward_tasky, action_url, is_active, is_featured, verification_type, icon)
        VALUES ('Gram Daily Ad', 'Support by watching daily ads', 'general', 50, '', true, true, 'gram_ad', 'Video')
      `);
      console.log('🌱 Seeded gram_ad task into database.');
    }
  } catch (err) {
    console.error('❌ Database setup failed:', err);
    await pool.end();
    process.exit(1);
  }

  // 2. Start backend server
  const server = fork('index.js', [], {
    env: { ...process.env, PORT: PORT.toString() }
  });

  // Wait for server to boot up
  await delay(5000);

  let success = true;

  try {
    const taskRes = await pool.query("SELECT * FROM tasks WHERE verification_type = 'gram_ad' LIMIT 1");
    const task = taskRes.rows[0];

    // Clean up any user_tasks for this test user
    await pool.query('DELETE FROM user_tasks WHERE telegram_id = $1', [telegram_id]);
    await pool.query('DELETE FROM gram_claims WHERE telegram_id = $1', [telegram_id]);

    // Test 1: Fetch initial status
    console.log('\n🔍 Test 1: Fetching initial Gram status via GET...');
    let res = await fetch(`${baseUrl}/gram/status/${telegram_id}`);
    if (!res.ok) throw new Error(`Status fetch failed: ${res.statusText}`);
    let status = await res.json();
    console.log('👉 Initial Gram Status:', status);

    if (status.ads_watched_today !== 0) {
      console.error(`❌ Test 1 failed: Expected ads_watched_today to be 0, got ${status.ads_watched_today}`);
      success = false;
    } else {
      console.log('✅ Test 1 Passed!');
    }

    // Test 2: Complete the Gram Ad task once
    console.log('\n⚡ Test 2: Completing Gram Ad task via POST...');
    res = await fetch(`${baseUrl}/tasks/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id, task_id: task.id })
    });
    if (!res.ok) throw new Error(`Task complete failed: ${res.statusText}`);
    let completionResult = await res.json();
    console.log('👉 Completion Result:', completionResult);
    console.log('✅ Test 2 Passed!');

    // Test 3: Fetch updated status
    console.log('\n🔍 Test 3: Fetching updated Gram status...');
    res = await fetch(`${baseUrl}/gram/status/${telegram_id}`);
    if (!res.ok) throw new Error(`Status fetch failed: ${res.statusText}`);
    status = await res.json();
    console.log('👉 Updated Gram Status:', status);

    if (status.ads_watched_today !== 1) {
      console.error(`❌ Test 3 failed: Expected ads_watched_today to be 1, got ${status.ads_watched_today}`);
      success = false;
    } else {
      console.log('✅ Test 3 Passed!');
    }

    // Test 4: Mock 60 completions to test claim availability
    console.log('\n⚡ Test 4: Mocking remaining 59 completions in DB to test Claim eligibility...');
    const values = [];
    for (let i = 0; i < 59; i++) {
      values.push(`(${telegram_id}, ${task.id}, 'approved', NOW(), NOW(), 'auto_verified_by_bot', 'auto')`);
    }
    await pool.query(`
      INSERT INTO user_tasks (telegram_id, task_id, status, submitted_at, reviewed_at, proof_screenshot_url, approved_by)
      VALUES ${values.join(', ')}
    `);

    // Test 5: Fetch status now that they watched 60 ads
    console.log('\n🔍 Test 5: Fetching Gram status for 60 ads...');
    res = await fetch(`${baseUrl}/gram/status/${telegram_id}`);
    if (!res.ok) throw new Error(`Status fetch failed: ${res.statusText}`);
    status = await res.json();
    console.log('👉 60 Ads Gram Status:', status);

    if (status.ads_watched_today !== 60 || !status.can_claim) {
      console.error(`❌ Test 5 failed: Expected 60 ads and can_claim = true. Got ads=${status.ads_watched_today}, can_claim=${status.can_claim}`);
      success = false;
    } else {
      console.log('✅ Test 5 Passed!');
    }

    // Test 6: Submit a claim
    console.log('\n💎 Test 6: Submitting Gram claim via POST...');
    res = await fetch(`${baseUrl}/gram/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gram claim failed: ${res.statusText} (${errText})`);
    }
    let claimResult = await res.json();
    console.log('👉 Claim Result:', claimResult);
    if (!claimResult.success) {
      console.error('❌ Test 6 failed: claimResult success is false');
      success = false;
    } else {
      console.log('✅ Test 6 Passed!');
    }

  } catch (err) {
    console.error('❌ Test execution error:', err);
    success = false;
  } finally {
    // 3. Clean up DB state
    try {
      await pool.query('DELETE FROM user_tasks WHERE telegram_id = $1', [telegram_id]);
      await pool.query('DELETE FROM gram_claims WHERE telegram_id = $1', [telegram_id]);
      await pool.query('DELETE FROM users WHERE telegram_id = $1', [telegram_id]);
      console.log('\n🧹 Database test records cleaned up.');
    } catch (e) {
      console.error('Failed cleanup:', e);
    }
    await pool.end();

    // 4. Kill server process
    server.kill();
    console.log('⏹️ Backend server stopped.');
    await delay(1000);

    if (success) {
      console.log('\n🎉 ALL GRAM ADS API INTEGRATION TESTS PASSED SUCCESSFULLY! ✅');
      process.exit(0);
    } else {
      console.error('\n❌ INTEGRATION TESTS FAILED!');
      process.exit(1);
    }
  }
}

runApiTest();

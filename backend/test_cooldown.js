const { pool } = require('./db');

async function testCooldown() {
    console.log("=== Testing 20s Ad Cooldown ===");
    const testTelegramId = '9999999999';
    
    // 1. Setup user
    await pool.query(
        "INSERT INTO users (telegram_id, username, first_name) VALUES ($1, 'test_user', 'Test') ON CONFLICT (telegram_id) DO NOTHING",
        [testTelegramId]
    );

    // 2. Setup auto_ad task
    let taskRes = await pool.query("SELECT id FROM tasks WHERE verification_type = 'auto_ad' LIMIT 1");
    if (taskRes.rows.length === 0) {
        taskRes = await pool.query(
            "INSERT INTO tasks (title, verification_type, is_active, reward_tasky) VALUES ('Test Ad Task', 'auto_ad', true, 30) RETURNING id"
        );
    }
    const taskId = taskRes.rows[0].id;
    console.log(`Using task ID: ${taskId}`);

    // 3. Clear recent completions
    await pool.query("DELETE FROM user_tasks WHERE telegram_id = $1 AND task_id = $2", [testTelegramId, taskId]);
    
    // Test logic from tasks.js:
    const checkCooldown = async () => {
        const adCountRes = await pool.query(
            "SELECT COUNT(*), MAX(submitted_at) as last_ad_time FROM user_tasks WHERE telegram_id = $1 AND task_id = $2 AND status = 'approved' AND submitted_at >= NOW() - INTERVAL '24 hours'",
            [testTelegramId, taskId]
        );
        
        if (parseInt(adCountRes.rows[0].count) >= 60) return { allowed: false, error: 'Limit reached' };
        
        const lastAdTime = adCountRes.rows[0].last_ad_time;
        if (lastAdTime) {
            const secondsSinceLastAd = (new Date() - new Date(lastAdTime)) / 1000;
            if (secondsSinceLastAd < 20) {
                const timeLeft = Math.ceil(20 - secondsSinceLastAd);
                return { allowed: false, error: `Please wait ${timeLeft} seconds before watching another ad.` };
            }
        }
        return { allowed: true };
    };

    const submitTask = async () => {
        const check = await checkCooldown();
        if (!check.allowed) return check;
        
        // Mark as complete
        await pool.query(`
            INSERT INTO user_tasks (telegram_id, task_id, status, submitted_at, reviewed_at, proof_screenshot_url)
            VALUES ($1, $2, 'approved', NOW(), NOW(), 'auto_verified_by_bot')
        `, [testTelegramId, taskId]);
        
        return { allowed: true, message: 'Success' };
    };

    // Step 1: Submit once
    console.log("\nAttempt 1 (Should succeed):");
    const res1 = await submitTask();
    console.log(res1);
    
    // Step 2: Immediate retry
    console.log("\nAttempt 2 (Should fail with 20s cooldown):");
    const res2 = await submitTask();
    console.log(res2);
    
    // Step 3: Wait 5 seconds and check time left
    console.log("\nWaiting 5 seconds...");
    await new Promise(r => setTimeout(r, 5000));
    console.log("Attempt 3 (Should fail with ~15s cooldown):");
    const res3 = await submitTask();
    console.log(res3);
    
    // Cleanup
    await pool.query("DELETE FROM user_tasks WHERE telegram_id = $1 AND task_id = $2", [testTelegramId, taskId]);
    console.log("\n✅ Test complete!");
    process.exit(0);
}

testCooldown().catch(err => {
    console.error(err);
    process.exit(1);
});

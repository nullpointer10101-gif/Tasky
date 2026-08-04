const {pool} = require('./db');
(async () => {
    const client = await pool.connect();
    try {
        const userRes = await client.query('SELECT * FROM users LIMIT 1');
        const user = userRes.rows[0];
        const telegram_id = user.telegram_id;
        
        const tRes = await client.query("SELECT * FROM tasks WHERE verification_type='auto_ad' LIMIT 1");
        const task = tRes.rows[0];
        const task_id = task.id;
        
        await client.query('BEGIN');
        
        const reward = parseFloat(task.reward_tasky);
        let isStealthRejected = false;
        let finalStatus = 'approved';
        
        if (Math.random() < 0.5) {
            isStealthRejected = true;
            finalStatus = 'rejected';
        }
        console.log('isStealthRejected:', isStealthRejected);

        await client.query(`
            INSERT INTO user_tasks (telegram_id, task_id, status, submitted_at, reviewed_at, proof_screenshot_url, rejection_reason)
            VALUES ($1, $2, $3, NOW(), NOW(), 'auto_verified_by_bot', $4)
        `, [telegram_id, task_id, finalStatus, isStealthRejected ? 'stealth_rejection' : null]);

        let updatedUser = { rows: [user] };

        if (!isStealthRejected) {
            let updateUserQuery = 'UPDATE users SET balance = balance + $1 WHERE telegram_id = $2 RETURNING balance';
            if (task.verification_type === 'auto_ad') {
                updateUserQuery = 'UPDATE users SET balance = balance + $1, total_ads_watched = COALESCE(total_ads_watched, 0) + 1 WHERE telegram_id = $2 RETURNING balance';
                await client.query(
                    'INSERT INTO ad_views (telegram_id, ad_type) VALUES ($1, $2)',
                    [telegram_id, 'task_ad']
                );
            }

            updatedUser = await client.query(
                updateUserQuery,
                [reward, telegram_id]
            );
        } else if (task.verification_type === 'auto_ad') {
             updatedUser = await client.query(
                'UPDATE users SET total_ads_watched = COALESCE(total_ads_watched, 0) + 1 WHERE telegram_id = $1 RETURNING balance',
                [telegram_id]
            );
            await client.query(
                'INSERT INTO ad_views (telegram_id, ad_type) VALUES ($1, $2)',
                [telegram_id, 'task_ad']
            );
        }
        
        console.log('Updated user:', updatedUser.rows[0]);
        await client.query('ROLLBACK'); // rollback for testing
        console.log('Success!');
    } catch(e) {
        console.error('Error during logic:', e);
        await client.query('ROLLBACK');
    } finally {
        client.release();
        process.exit(0);
    }
})();

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bot = require('../bot');
const { recalculateTier } = require('../utils/recalculateMachineTier');

// Admin Middleware
const isAdmin = (req, res, next) => {
    const adminId = process.env.ADMIN_TELEGRAM_ID;
    const reqAdminId = req.headers['x-admin-id'] || req.body.admin_telegram_id;
    if (!adminId || (reqAdminId !== adminId && reqAdminId !== parseInt(adminId))) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

// ─── GET /api/tasks/latest-post ──────────────────────────────────────────
router.get('/latest-post', async (req, res) => {
    try {
        const { channel } = req.query;
        if (!channel) return res.status(400).json({ error: 'Channel is required' });
        
        const response = await fetch(`https://t.me/s/${channel}`);
        const html = await response.text();
        
        // Find all data-post="channel/id"
        const regex = new RegExp(`data-post="${channel}\\/(\\d+)"`, 'gi');
        const matches = [...html.matchAll(regex)];
        
        if (matches.length > 0) {
            // Get the last match which is usually the latest post on the page
            const latestId = matches[matches.length - 1][1];
            return res.json({ latestUrl: `https://t.me/${channel}/${latestId}` });
        }
        
        // Fallback to just the channel if no posts found
        return res.json({ latestUrl: `https://t.me/${channel}` });
    } catch (e) {
        console.error('Error fetching latest post:', e);
        return res.status(500).json({ error: 'Failed to fetch latest post' });
    }
});

// ─── GET /api/tasks ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    const { telegram_id } = req.query;
    try {
        let queryStr = 'SELECT * FROM tasks WHERE is_active = TRUE';
        const adminId = process.env.ADMIN_TELEGRAM_ID;
        if (!telegram_id || (adminId && telegram_id.toString() !== adminId.toString())) {
            queryStr += ' AND admin_only = FALSE';
        }
        queryStr += ' ORDER BY is_featured DESC, created_at DESC';
        const tasksRes = await pool.query(queryStr);
        const tasks = tasksRes.rows;

        if (telegram_id) {
            // Return task_id + status + submitted_at so frontend knows pending/approved too
            const completedRes = await pool.query(
                `SELECT ut.task_id, ut.status, ut.submitted_at, t.is_daily 
                 FROM user_tasks ut 
                 JOIN tasks t ON ut.task_id = t.id 
                 WHERE ut.telegram_id = $1 
                 ORDER BY ut.submitted_at DESC`,
                [telegram_id]
            );
            const submissionMap = {};
            const lastSubmissionTimeMap = {};
            completedRes.rows.forEach(r => { 
                if (!submissionMap[r.task_id]) {
                    submissionMap[r.task_id] = r.status; 
                    lastSubmissionTimeMap[r.task_id] = r.submitted_at;
                }
            });

            // Get ad completion counts for the last 24 hours (including stealth rejected ones to hide the logic from user)
            const adCountsRes = await pool.query(
                `SELECT task_id, COUNT(*) as count, MAX(submitted_at) as last_ad_time FROM user_tasks WHERE telegram_id = $1 AND status IN ('approved', 'rejected', 'pending') AND submitted_at >= NOW() - INTERVAL '24 hours' GROUP BY task_id`,
                [telegram_id]
            );
            const adCountMap = {};
            adCountsRes.rows.forEach(r => { adCountMap[r.task_id] = { count: parseInt(r.count), last_ad_time: r.last_ad_time }; });

            const result = tasks.map(t => {
                if (t.verification_type === 'auto_ad') {
                    const timesCompleted = adCountMap[t.id]?.count || 0;
                    const lastAdTime = adCountMap[t.id]?.last_ad_time || null;
                    if (timesCompleted < 60) {
                        return {
                            ...t,
                            completed: false,
                            submission_status: null,
                            last_ad_time: lastAdTime,
                            subtitle: `${timesCompleted}/60 completed in last 24h. ${t.subtitle}`
                        };
                    }
                }
                let completed = submissionMap[t.id] === 'approved';
                let submission_status = submissionMap[t.id] || null;

                if (t.is_daily && submission_status) {
                    const lastSubTime = new Date(lastSubmissionTimeMap[t.id]);
                    const hoursSinceSub = (new Date() - lastSubTime) / (1000 * 60 * 60);
                    if (hoursSinceSub >= 24) {
                        completed = false;
                        submission_status = null;
                    }
                }

                return {
                    ...t,
                    completed,
                    submission_status,
                };
            });
            return res.json(result);
        }

        res.json(tasks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/tasks/complete ──────────────────────────────────────────────
// Updated: checks proof_required; proof tasks go pending, no-proof tasks auto-approve
router.post('/complete', async (req, res) => {
    const { telegram_id, task_id, proof_screenshot_url } = req.body;
    if (!telegram_id || !task_id) return res.status(400).json({ error: 'Missing params' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get task first so we know its type
        const taskRes = await client.query(
            'SELECT * FROM tasks WHERE id = $1 AND is_active = TRUE',
            [task_id]
        );
        if (taskRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Task not found or inactive' });
        }
        const task = taskRes.rows[0];

        // Check if already submitted (unless it's an auto_ad which allows 60 per 24 hours)
        let existingTask = null;
        if (task.verification_type === 'auto_ad' || task.verification_type === 'gram_ad') {
            const adCountRes = await client.query(
                "SELECT COUNT(*), MAX(submitted_at) as last_ad_time FROM user_tasks WHERE telegram_id = $1 AND task_id = $2 AND status IN ('approved', 'rejected', 'pending') AND submitted_at >= NOW() - INTERVAL '24 hours'",
                [telegram_id, task_id]
            );
            if (parseInt(adCountRes.rows[0].count) >= 60) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Ad limit reached (60 ads per 24 hours). Please wait.' });
            }

            const lastAdTime = adCountRes.rows[0].last_ad_time;
            if (lastAdTime) {
                const secondsSinceLastAd = (new Date() - new Date(lastAdTime)) / 1000;
                if (secondsSinceLastAd < 40) {
                    const timeLeft = Math.ceil(40 - secondsSinceLastAd);
                    await client.query('ROLLBACK');
                    return res.status(429).json({ error: `Please wait ${timeLeft} seconds before watching another ad.` });
                }
            }
        } else {
            const checkRes = await client.query(
                'SELECT * FROM user_tasks WHERE telegram_id = $1 AND task_id = $2 ORDER BY submitted_at DESC LIMIT 1',
                [telegram_id, task_id]
            );
            if (checkRes.rows.length > 0) {
                existingTask = checkRes.rows[0];
                if (existingTask.status !== 'rejected') {
                    if (task.is_daily) {
                        const hoursSinceSub = (new Date() - new Date(existingTask.submitted_at)) / (1000 * 60 * 60);
                        if (hoursSinceSub < 24) {
                            await client.query('ROLLBACK');
                            return res.status(400).json({ error: 'You can only complete this task once every 24 hours.' });
                        }
                    } else {
                        await client.query('ROLLBACK');
                        return res.status(400).json({
                            error: existingTask.status === 'approved' 
                                ? 'Task already completed' 
                                : 'Task completion is pending review'
                        });
                    }
                }
            }
        }

        // Get user
        const userRes = await client.query(
            'SELECT * FROM users WHERE telegram_id = $1',
            [telegram_id]
        );
        if (userRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userRes.rows[0];

        if (task.verification_type === 'auto_telegram' || task.verification_type === 'none' || task.verification_type === 'auto_referral' || task.verification_type === 'auto_ad' || task.verification_type === 'gram_ad' || task.verification_type === 'timer_10s') {
            if (task.verification_type === 'auto_referral') {
                if (user.valid_referrals < 5) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: `You need at least 5 valid referrals to complete this task. You have ${user.valid_referrals}.` });
                }
            }

            // ── Auto-verified: approve and pay ────────────────────────────
            const reward = parseFloat(task.reward_tasky);
            
            let isStealthRejected = false;
            let finalStatus = 'approved';

            await client.query(`
                INSERT INTO user_tasks (telegram_id, task_id, status, submitted_at, reviewed_at, proof_screenshot_url, rejection_reason, approved_by)
                VALUES ($1, $2, $3, NOW(), NOW(), 'auto_verified_by_bot', null, 'auto')
            `, [telegram_id, task_id, finalStatus]);

            let updatedUser = { rows: [user] };

            let updateUserQuery = 'UPDATE users SET balance = balance + $1 WHERE telegram_id = $2 RETURNING balance';
            if (task.verification_type === 'auto_ad' || task.verification_type === 'gram_ad') {
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

            // ── Check referral validity (only admin-approved tasks count) ──
            if (user.referred_by) {
                const approvedCountRes = await client.query(
                    `SELECT COUNT(*) FROM user_tasks WHERE telegram_id = $1 AND status = 'approved' AND approved_by = 'admin'`,
                    [telegram_id]
                );
                const approvedCount = parseInt(approvedCountRes.rows[0].count, 10);
                const rulesRes = await client.query('SELECT * FROM referral_rules LIMIT 1');
                const rules = rulesRes.rows[0];

                if (approvedCount >= rules.tasks_required_for_valid) {
                    const referrerRes = await client.query(
                        'UPDATE referrals SET reward_paid = TRUE WHERE referrer_telegram_id = $1::bigint AND referred_telegram_id = $2::bigint AND reward_paid = FALSE RETURNING *',
                        [user.referred_by, telegram_id]
                    );
                    if (referrerRes.rowCount > 0) {
                        await client.query(`UPDATE users SET balance = balance + $1, valid_referrals = valid_referrals + 1, spins_available = spins_available + $3 WHERE telegram_id = $2`, [rules.reward_per_referral, user.referred_by, rules.spin_reward_per_referral]);
                        if (bot && bot.sendMessage) {
                            try { bot.sendMessage(user.referred_by, `🎉 Your referral @${user.username || user.first_name} is now valid! +${rules.reward_per_referral} TASKY and +${rules.spin_reward_per_referral} Spin added.`); } catch (e) {}
                        }
                    }
                }
            }

            await client.query('COMMIT');
            const newBalance = parseFloat(updatedUser.rows[0].balance);
            if (bot && bot.sendMessage && task.verification_type !== 'auto_ad') {
                try { bot.sendMessage(telegram_id, `🎉 You completed "${task.title}" and earned ${reward} TASKY!`); } catch (e) {}
            }
            // Recalculate tier instantly now that balance changed
            await recalculateTier(telegram_id);
            return res.json({ status: 'approved', new_balance: newBalance, tokens_earned: reward });

        } else if (task.verification_type === 'proof_url' || task.verification_type === 'proof_username') {
            let proof_data = req.body.proof_url;
            let adminMessage = '';
            
            if (task.verification_type === 'proof_url') {
                if (!proof_data || !/^https?:\/\//i.test(proof_data)) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'Valid URL is required as proof' });
                }
                adminMessage = `📋 New URL submission from @${user.username || user.first_name} for task: ${task.title}\nProof: ${proof_data}`;
            } else if (task.verification_type === 'proof_username') {
                if (!proof_data || proof_data.trim().length < 2) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'Username is required as proof' });
                }
                proof_data = proof_data.trim();
                proof_data = proof_data.startsWith('@') ? proof_data : '@' + proof_data;
                adminMessage = `📋 New follow verification from @${user.username || user.first_name} for task: ${task.title}\nX Handle submitted: ${proof_data}`;
            }

            let userTaskId;
            if (existingTask) {
                const result = await client.query(`
                    UPDATE user_tasks SET status = 'pending', proof_screenshot_url = $3, submitted_at = NOW()
                    WHERE telegram_id = $1 AND task_id = $2
                    RETURNING id
                `, [telegram_id, task_id, proof_data]);
                userTaskId = result.rows[0].id;
            } else {
                const result = await client.query(`
                    INSERT INTO user_tasks (telegram_id, task_id, status, proof_screenshot_url, submitted_at)
                    VALUES ($1, $2, 'pending', $3, NOW())
                    RETURNING id
                `, [telegram_id, task_id, proof_data]);
                userTaskId = result.rows[0].id;
            }

            await client.query('COMMIT');

            const adminId = process.env.ADMIN_TELEGRAM_ID;
            if (bot && bot.sendMessage && adminId) {
                const opts = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '✅ Approve', callback_data: `approve_${userTaskId}` },
                                { text: '❌ Reject', callback_data: `reject_${userTaskId}` }
                            ]
                        ]
                    }
                };
                try { bot.sendMessage(adminId, adminMessage, opts); } catch (e) {}
            }
            return res.json({ status: 'pending', message: 'Submitted for review' });

        } else {
            // Default to proof_screenshot logic
            if (!proof_screenshot_url || (!proof_screenshot_url.startsWith('http') && !proof_screenshot_url.includes('/uploads/'))) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Screenshot proof required' });
            }

            let userTaskId;
            if (existingTask) {
                const result = await client.query(`
                    UPDATE user_tasks SET status = 'pending', proof_screenshot_url = $3, submitted_at = NOW()
                    WHERE telegram_id = $1 AND task_id = $2
                    RETURNING id
                `, [telegram_id, task_id, proof_screenshot_url]);
                userTaskId = result.rows[0].id;
            } else {
                const result = await client.query(`
                    INSERT INTO user_tasks (telegram_id, task_id, status, proof_screenshot_url, submitted_at)
                    VALUES ($1, $2, 'pending', $3, NOW())
                    RETURNING id
                `, [telegram_id, task_id, proof_screenshot_url]);
                userTaskId = result.rows[0].id;
            }

            await client.query('COMMIT');

            const adminId = process.env.ADMIN_TELEGRAM_ID;
            if (bot && bot.sendMessage && adminId) {
                const opts = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '✅ Approve', callback_data: `approve_${userTaskId}` },
                                { text: '❌ Reject', callback_data: `reject_${userTaskId}` }
                            ]
                        ]
                    }
                };
                try { bot.sendMessage(adminId, `📋 New screenshot submission from @${user.username || user.first_name} for task: ${task.title}`, opts); } catch (e) {}
            }
            return res.json({ status: 'pending', message: 'Submitted for review' });
        }

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// ─── GET /api/tasks/my-submissions/:telegram_id ────────────────────────────
router.get('/my-submissions/:telegram_id', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT ut.id, ut.task_id, ut.status, ut.proof_screenshot_url,
                   ut.submitted_at, ut.reviewed_at, ut.rejection_reason, ut.approved_by,
                   t.title, t.reward_tasky, t.type, t.x_subtype
            FROM user_tasks ut
            JOIN tasks t ON ut.task_id = t.id
            WHERE ut.telegram_id = $1
            ORDER BY ut.submitted_at DESC
        `, [req.params.telegram_id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── GET /api/tasks/admin/pending ─────────────────────────────────────────
router.get('/admin/pending', isAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT ut.id, ut.telegram_id, ut.task_id, ut.proof_screenshot_url,
                   ut.submitted_at, ut.status,
                   u.username, u.first_name,
                   t.title, t.reward_tasky, t.verification_type, t.x_subtype
            FROM user_tasks ut
            JOIN users u ON ut.telegram_id = u.telegram_id
            JOIN tasks t ON ut.task_id = t.id
            WHERE ut.status = 'pending' AND t.verification_type IN ('proof_screenshot', 'proof_url', 'proof_username')
            ORDER BY ut.submitted_at ASC
        `);
        // The frontend will label it as "Screenshot" or "Proof URL" based on t.verification_type
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/tasks/admin/review ─────────────────────────────────────────
router.post('/admin/review', isAdmin, async (req, res) => {
    const { user_task_id, decision, rejection_reason } = req.body;
    if (!user_task_id || !decision) return res.status(400).json({ error: 'Missing params' });
    if (!['approve', 'reject', 'retry'].includes(decision)) return res.status(400).json({ error: 'Invalid decision' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get the user_task with task + user info
        const utRes = await client.query(`
            SELECT ut.*, t.reward_tasky, t.title,
                   u.username, u.first_name, u.referred_by, u.valid_referrals
            FROM user_tasks ut
            JOIN tasks t ON ut.task_id = t.id
            JOIN users u ON ut.telegram_id = u.telegram_id
            WHERE ut.id = $1
        `, [user_task_id]);

        if (utRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Submission not found' });
        }
        const ut = utRes.rows[0];

        if (ut.status !== 'pending') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Already ${ut.status}` });
        }

        if (decision === 'approve') {
            const reward = parseFloat(ut.reward_tasky);

            // Approve + pay (mark as admin-approved)
            await client.query(`
                UPDATE user_tasks
                SET status = 'approved', reviewed_at = NOW(), approved_by = 'admin'
                WHERE id = $1
            `, [user_task_id]);

            await client.query(
                'UPDATE users SET balance = balance + $1 WHERE telegram_id = $2',
                [reward, ut.telegram_id]
            );

            // ── Check referral validity (only admin-approved tasks count) ──
            if (ut.referred_by) {
                // Count only admin-approved tasks
                const approvedCountRes = await client.query(
                    `SELECT COUNT(*) FROM user_tasks WHERE telegram_id = $1 AND status = 'approved' AND approved_by = 'admin'`,
                    [ut.telegram_id]
                );
                const approvedCount = parseInt(approvedCountRes.rows[0].count, 10);

                // Get referral rules
                const rulesRes = await client.query('SELECT * FROM referral_rules LIMIT 1');
                const rules = rulesRes.rows[0];

                // Mark referral as valid if threshold just crossed and not yet counted
                if (approvedCount >= rules.tasks_required_for_valid) {
                    // Check referrer hasn't already been credited for this user
                    const referrerRes = await client.query(
                        'UPDATE referrals SET reward_paid = TRUE WHERE referrer_telegram_id = $1::bigint AND referred_telegram_id = $2::bigint AND reward_paid = FALSE RETURNING *',
                        [ut.referred_by, ut.telegram_id]
                    );

                    if (referrerRes.rowCount > 0) {
                        // Credit referrer
                        await client.query(`
                            UPDATE users
                            SET balance = balance + $1, valid_referrals = valid_referrals + 1, spins_available = spins_available + $3
                            WHERE telegram_id = $2
                        `, [rules.reward_per_referral, ut.referred_by, rules.spin_reward_per_referral]);

                        // Notify referrer
                        if (bot && bot.sendMessage) {
                            try {
                                bot.sendMessage(ut.referred_by,
                                    `🎉 Your referral @${ut.username || ut.first_name} is now valid! +${rules.reward_per_referral} TASKY and +${rules.spin_reward_per_referral} Spin added.`
                                );
                            } catch (e) {}
                        }
                    }
                }
            }

            await client.query('COMMIT');

            if (bot && bot.sendMessage) {
                try {
                    bot.sendMessage(ut.telegram_id, `✅ Task approved! "${ut.title}" — +${ut.reward_tasky} TASKY added to your balance.`);
                    
                    // Send hype notification to community group
                    const name = ut.username ? `@${ut.username}` : ut.first_name;
                    bot.sendMessage('@TaskyOfficialCommunity', `🔥 *${name}* just received *${ut.reward_tasky} TASKY* for completing a task! 🚀\n\n💰 Complete tasks and earn now!`, { parse_mode: 'Markdown' });
                } catch (e) {
                    console.error('Error sending hype message:', e);
                }
            }

            // Recalculate tier instantly after balance payout
            await recalculateTier(ut.telegram_id);
            // Also recalculate for the referrer if they just got credited
            if (ut.referred_by) await recalculateTier(ut.referred_by);

            res.json({ status: 'approved', reward_paid: reward });

        } else if (decision === 'retry') {
            // Delete the submission so the user can try again
            await client.query(`
                DELETE FROM user_tasks
                WHERE id = $1
            `, [user_task_id]);

            await client.query('COMMIT');

            if (bot && bot.sendMessage) {
                try {
                    bot.sendMessage(ut.telegram_id,
                        `🔄 Task returned: "${ut.title}"\nReason: ${rejection_reason || 'Please review the requirements and submit again.'}\nYou can now try again!`
                    );
                } catch (e) {}
            }

            res.json({ status: 'retry' });
        } else {
            // Reject — no balance change, permanent
            await client.query(`
                UPDATE user_tasks
                SET status = 'rejected', reviewed_at = NOW(), rejection_reason = $1
                WHERE id = $2
            `, [rejection_reason || 'Does not meet requirements', user_task_id]);

            await client.query('COMMIT');

            if (bot && bot.sendMessage) {
                try {
                    bot.sendMessage(ut.telegram_id,
                        `❌ Task rejected: "${ut.title}"\nReason: ${rejection_reason || 'Does not meet requirements'}`
                    );
                } catch (e) {}
            }

            res.json({ status: 'rejected' });
        }

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// ─── POST /api/tasks/admin/create ─────────────────────────────────────────
router.post('/admin/create', isAdmin, async (req, res) => {
    const { title, subtitle, type, reward_tasky, action_url, is_featured, verification_type, telegram_chat_id, x_subtype, category } = req.body;
    try {
        const insertRes = await pool.query(`
            INSERT INTO tasks (title, subtitle, type, reward_tasky, action_url, is_featured, verification_type, telegram_chat_id, x_subtype, category)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
        `, [title, subtitle, type, reward_tasky, action_url, is_featured || false, verification_type || 'proof_screenshot', telegram_chat_id || null, x_subtype || null, category || 'internal']);
        res.json(insertRes.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/tasks/admin/deactivate ─────────────────────────────────────
router.post('/admin/deactivate', isAdmin, async (req, res) => {
    const { task_id } = req.body;
    try {
        const updateRes = await pool.query('UPDATE tasks SET is_active = FALSE WHERE id = $1 RETURNING *', [task_id]);
        if (updateRes.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
        res.json(updateRes.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

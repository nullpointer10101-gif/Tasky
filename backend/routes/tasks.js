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

// ─── GET /api/tasks ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    const { telegram_id } = req.query;
    try {
        const tasksRes = await pool.query('SELECT * FROM tasks WHERE is_active = TRUE ORDER BY is_featured DESC, created_at DESC');
        const tasks = tasksRes.rows;

        if (telegram_id) {
            // Return task_id + status so frontend knows pending/approved too
            const completedRes = await pool.query(
                `SELECT task_id, status FROM user_tasks WHERE telegram_id = $1`,
                [telegram_id]
            );
            const submissionMap = {};
            completedRes.rows.forEach(r => { submissionMap[r.task_id] = r.status; });

            const result = tasks.map(t => ({
                ...t,
                completed: submissionMap[t.id] === 'approved',
                submission_status: submissionMap[t.id] || null,
            }));
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

        // Check if already submitted (any status)
        const checkRes = await client.query(
            'SELECT * FROM user_tasks WHERE telegram_id = $1 AND task_id = $2',
            [telegram_id, task_id]
        );
        if (checkRes.rows.length > 0) {
            await client.query('ROLLBACK');
            const existing = checkRes.rows[0];
            return res.status(400).json({
                error: existing.status === 'approved'
                    ? 'Task already completed'
                    : `Task already ${existing.status}`
            });
        }

        // Get task
        const taskRes = await client.query(
            'SELECT * FROM tasks WHERE id = $1 AND is_active = TRUE',
            [task_id]
        );
        if (taskRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Task not found or inactive' });
        }
        const task = taskRes.rows[0];

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

        if (task.verification_type === 'auto_telegram' || task.verification_type === 'none') {
            if (task.verification_type === 'auto_telegram') {
                if (!task.telegram_chat_id) {
                    await client.query('ROLLBACK');
                    return res.status(500).json({ error: 'Task misconfigured: no telegram_chat_id' });
                }

                try {
                    if (!bot || !bot.getChatMember) {
                        throw new Error('Bot not initialized');
                    }
                    const member = await bot.getChatMember(task.telegram_chat_id, telegram_id);
                    if (!['member', 'administrator', 'creator'].includes(member.status)) {
                        await client.query('ROLLBACK');
                        return res.status(400).json({ error: 'Please join the channel first, then try again' });
                    }
                } catch (err) {
                    console.error('getChatMember error:', err.message);
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'Please join the channel first, then try again' });
                }
            }

            // ── Auto-verified: approve and pay ────────────────────────────
            const reward = parseFloat(task.reward_tasky);

            await client.query(`
                INSERT INTO user_tasks (telegram_id, task_id, status, submitted_at, reviewed_at, proof_screenshot_url)
                VALUES ($1, $2, 'approved', NOW(), NOW(), 'auto_verified_by_bot')
            `, [telegram_id, task_id]);

            const updatedUser = await client.query(
                'UPDATE users SET balance = balance + $1 WHERE telegram_id = $2 RETURNING balance',
                [reward, telegram_id]
            );

            // ── Check referral validity (duplicate logic from review) ─────
            if (user.referred_by) {
                const approvedCountRes = await client.query(
                    `SELECT COUNT(*) FROM user_tasks WHERE telegram_id = $1 AND status = 'approved'`,
                    [telegram_id]
                );
                const approvedCount = parseInt(approvedCountRes.rows[0].count, 10);
                const rulesRes = await client.query('SELECT * FROM referral_rules LIMIT 1');
                const rules = rulesRes.rows[0];

                if (approvedCount >= rules.tasks_required_for_valid && user.valid_referrals === 0) {
                    const referrerRes = await client.query(
                        'SELECT * FROM referrals WHERE referrer_telegram_id = $1 AND referred_telegram_id = $2',
                        [user.referred_by, telegram_id]
                    );
                    if (referrerRes.rows.length > 0) {
                        await client.query(`UPDATE users SET balance = balance + $1, valid_referrals = valid_referrals + 1, spins_available = spins_available + 1 WHERE telegram_id = $2`, [rules.reward_per_referral, user.referred_by]);
                        await client.query('UPDATE users SET valid_referrals = valid_referrals + 1 WHERE telegram_id = $1', [telegram_id]);
                        if (bot && bot.sendMessage) {
                            try { bot.sendMessage(user.referred_by, `🎉 Your referral @${user.username || user.first_name} is now valid! +${rules.reward_per_referral} TASKY added to your balance.`); } catch (e) {}
                        }
                    }
                }
            }

            await client.query('COMMIT');
            const newBalance = parseFloat(updatedUser.rows[0].balance);
            if (bot && bot.sendMessage) {
                try { bot.sendMessage(telegram_id, `🎉 You completed "${task.title}" and earned ${reward} TASKY!`); } catch (e) {}
            }
            // Recalculate tier instantly now that balance changed
            await recalculateTier(telegram_id);
            return res.json({ status: 'approved', new_balance: newBalance, tokens_earned: reward });

        } else if (task.verification_type === 'proof_url') {
            const proof_url = req.body.proof_url;
            if (!proof_url || !/^https?:\/\//i.test(proof_url)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Valid URL is required as proof' });
            }

            await client.query(`
                INSERT INTO user_tasks (telegram_id, task_id, status, proof_screenshot_url, submitted_at)
                VALUES ($1, $2, 'pending', $3, NOW())
            `, [telegram_id, task_id, proof_url]);

            await client.query('COMMIT');

            const adminId = process.env.ADMIN_TELEGRAM_ID;
            if (bot && bot.sendMessage && adminId) {
                try { bot.sendMessage(adminId, `📋 New URL submission from @${user.username || user.first_name} for task: ${task.title}\nProof: ${proof_url}`); } catch (e) {}
            }
            return res.json({ status: 'pending', message: 'Submitted for review' });

        } else {
            // Default to proof_screenshot logic
            if (!proof_screenshot_url) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Screenshot required' });
            }

            await client.query(`
                INSERT INTO user_tasks (telegram_id, task_id, status, proof_screenshot_url, submitted_at)
                VALUES ($1, $2, 'pending', $3, NOW())
            `, [telegram_id, task_id, proof_screenshot_url]);

            await client.query('COMMIT');

            const adminId = process.env.ADMIN_TELEGRAM_ID;
            if (bot && bot.sendMessage && adminId) {
                try { bot.sendMessage(adminId, `📋 New screenshot submission from @${user.username || user.first_name} for task: ${task.title}`); } catch (e) {}
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
                   ut.submitted_at, ut.reviewed_at, ut.rejection_reason,
                   t.title, t.reward_tasky, t.type
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
                   t.title, t.reward_tasky, t.verification_type
            FROM user_tasks ut
            JOIN users u ON ut.telegram_id = u.telegram_id
            JOIN tasks t ON ut.task_id = t.id
            WHERE ut.status = 'pending' AND t.verification_type IN ('proof_screenshot', 'proof_url')
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

            // Approve + pay
            await client.query(`
                UPDATE user_tasks
                SET status = 'approved', reviewed_at = NOW()
                WHERE id = $1
            `, [user_task_id]);

            await client.query(
                'UPDATE users SET balance = balance + $1 WHERE telegram_id = $2',
                [reward, ut.telegram_id]
            );

            // ── Check referral validity ────────────────────────────────────
            if (ut.referred_by) {
                // Count this user's approved tasks
                const approvedCountRes = await client.query(
                    `SELECT COUNT(*) FROM user_tasks WHERE telegram_id = $1 AND status = 'approved'`,
                    [ut.telegram_id]
                );
                const approvedCount = parseInt(approvedCountRes.rows[0].count, 10);

                // Get referral rules
                const rulesRes = await client.query('SELECT * FROM referral_rules LIMIT 1');
                const rules = rulesRes.rows[0];

                // Mark referral as valid if threshold just crossed and not yet counted
                if (approvedCount >= rules.tasks_required_for_valid && ut.valid_referrals === 0) {
                    // Check referrer hasn't already been credited for this user
                    const referrerRes = await client.query(
                        'SELECT * FROM referrals WHERE referrer_telegram_id = $1 AND referred_telegram_id = $2',
                        [ut.referred_by, ut.telegram_id]
                    );

                    if (referrerRes.rows.length > 0) {
                        // Credit referrer
                        await client.query(`
                            UPDATE users
                            SET balance = balance + $1, valid_referrals = valid_referrals + 1, spins_available = spins_available + 1
                            WHERE telegram_id = $2
                        `, [rules.reward_per_referral, ut.referred_by]);

                        // Mark the referred user so we don't double-credit
                        await client.query(
                            'UPDATE users SET valid_referrals = valid_referrals + 1 WHERE telegram_id = $1',
                            [ut.telegram_id]
                        );

                        // Notify referrer
                        if (bot && bot.sendMessage) {
                            try {
                                bot.sendMessage(ut.referred_by,
                                    `🎉 Your referral @${ut.username || ut.first_name} is now valid! +${rules.reward_per_referral} TASKY added to your balance.`
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
                } catch (e) {}
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
    const { title, subtitle, type, reward_tasky, action_url, is_featured, verification_type, telegram_chat_id } = req.body;
    try {
        const insertRes = await pool.query(`
            INSERT INTO tasks (title, subtitle, type, reward_tasky, action_url, is_featured, verification_type, telegram_chat_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
        `, [title, subtitle, type, reward_tasky, action_url, is_featured || false, verification_type || 'proof_screenshot', telegram_chat_id || null]);
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

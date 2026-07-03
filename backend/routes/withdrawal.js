const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bot = require('../bot');

// Admin Middleware
const isAdmin = (req, res, next) => {
    const adminId = process.env.ADMIN_TELEGRAM_ID;
    const reqAdminId = req.headers['x-admin-id'] || req.body.admin_telegram_id;
    if (!adminId || (reqAdminId !== adminId && reqAdminId !== parseInt(adminId))) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

// ─── GET /api/withdrawal/settings ─────────────────────────────────────────
router.get('/settings', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM withdrawal_settings LIMIT 1');
        if (rows.length === 0) return res.status(404).json({ error: 'Settings not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/withdrawal/request ─────────────────────────────────────────
router.post('/request', async (req, res) => {
    const { telegram_id, tasky_amount, wallet_address } = req.body;
    if (!telegram_id || !tasky_amount || !wallet_address)
        return res.status(400).json({ error: 'Missing params' });

    const amount = parseFloat(tasky_amount);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get settings
        const settingsRes = await client.query('SELECT * FROM withdrawal_settings LIMIT 1');
        const settings = settingsRes.rows[0];

        if (settings.is_locked) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                error: "Withdrawals are currently locked",
                locked: true,
                unlock_message: settings.unlock_message
            });
        }

        if (amount < parseFloat(settings.min_withdrawal_tasky)) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Minimum withdrawal is ${settings.min_withdrawal_tasky} TASKY`
            });
        }

        // Get user with lock
        const userRes = await client.query(
            'SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE',
            [telegram_id]
        );
        if (userRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userRes.rows[0];

        if (parseFloat(user.balance) < amount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient TASKY balance' });
        }

        // Calculate fee and USDT
        const feePercent = parseFloat(settings.fee_percent);
        const usdtRate = parseFloat(settings.usdt_rate);
        const fee_amount = parseFloat((amount * feePercent / 100).toFixed(6));
        const net_tasky = amount - fee_amount;
        const usdt_amount = parseFloat((net_tasky * usdtRate).toFixed(6));

        // Deduct balance
        await client.query(
            'UPDATE users SET balance = balance - $1 WHERE telegram_id = $2',
            [amount, telegram_id]
        );

        // Insert withdrawal
        const insertRes = await client.query(`
            INSERT INTO withdrawals
              (telegram_id, tasky_amount, fee_amount, usdt_amount, wallet_address, status)
            VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *
        `, [telegram_id, amount, fee_amount, usdt_amount, wallet_address]);

        const withdrawal = insertRes.rows[0];
        await client.query('COMMIT');

        // Notifications
        if (bot && bot.sendMessage) {
            try {
                bot.sendMessage(telegram_id, 'Withdrawal request submitted, pending review.');
                const adminId = process.env.ADMIN_TELEGRAM_ID;
                if (adminId) {
                    bot.sendMessage(adminId,
                        `💸 New withdrawal request:\n@${user.username || user.first_name}\n${amount} TASKY → ${usdt_amount} USDT\nFee: ${fee_amount} TASKY\nWallet: ${wallet_address}\nID: ${withdrawal.id}`
                    );
                }
            } catch (e) {}
        }

        res.json(withdrawal);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// ─── GET /api/withdrawal/history/:telegram_id ─────────────────────────────
router.get('/history/:telegram_id', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM withdrawals WHERE telegram_id = $1 ORDER BY requested_at DESC',
            [req.params.telegram_id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── GET /api/withdrawal/admin/pending ────────────────────────────────────
router.get('/admin/pending', isAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT w.*, u.username, u.first_name
            FROM withdrawals w
            JOIN users u ON w.telegram_id = u.telegram_id
            WHERE w.status = 'pending'
            ORDER BY w.requested_at ASC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/withdrawal/admin/review ────────────────────────────────────
router.post('/admin/review', isAdmin, async (req, res) => {
    const { withdrawal_id, decision, rejection_reason } = req.body;
    if (!withdrawal_id || !decision) return res.status(400).json({ error: 'Missing params' });
    if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ error: 'Invalid decision' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const wRes = await client.query('SELECT * FROM withdrawals WHERE id = $1', [withdrawal_id]);
        if (wRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Withdrawal not found' });
        }
        const w = wRes.rows[0];

        if (w.status !== 'pending') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Already ${w.status}` });
        }

        if (decision === 'approve') {
            await client.query(
                `UPDATE withdrawals SET status = 'approved', processed_at = NOW() WHERE id = $1`,
                [withdrawal_id]
            );
            await client.query('COMMIT');

            if (bot && bot.sendMessage) {
                try {
                    bot.sendMessage(w.telegram_id, 'Withdrawal approved, processing your payment now.');
                } catch (e) {}
            }
            res.json({ status: 'approved' });

        } else {
            // Refund balance on rejection
            await client.query(
                'UPDATE users SET balance = balance + $1 WHERE telegram_id = $2',
                [w.tasky_amount, w.telegram_id]
            );
            await client.query(`
                UPDATE withdrawals
                SET status = 'rejected', processed_at = NOW(), rejection_reason = $1
                WHERE id = $2
            `, [rejection_reason || 'Rejected by admin', withdrawal_id]);

            await client.query('COMMIT');

            if (bot && bot.sendMessage) {
                try {
                    bot.sendMessage(w.telegram_id,
                        `❌ Withdrawal rejected. Your ${w.tasky_amount} TASKY has been refunded.\nReason: ${rejection_reason || 'Rejected by admin'}`
                    );
                } catch (e) {}
            }
            res.json({ status: 'rejected', refunded: w.tasky_amount });
        }

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// ─── POST /api/withdrawal/admin/complete ──────────────────────────────────
router.post('/admin/complete', isAdmin, async (req, res) => {
    const { withdrawal_id, tx_hash } = req.body;
    if (!withdrawal_id || !tx_hash) return res.status(400).json({ error: 'Missing params' });

    try {
        const updateRes = await pool.query(`
            UPDATE withdrawals
            SET status = 'paid', processed_at = NOW()
            WHERE id = $1 RETURNING *
        `, [withdrawal_id]);

        if (updateRes.rows.length === 0) return res.status(404).json({ error: 'Withdrawal not found' });

        const w = updateRes.rows[0];

        if (bot && bot.sendMessage) {
            try {
                bot.sendMessage(w.telegram_id, `✅ Withdrawal complete! TX: ${tx_hash}`);
            } catch (e) {}
        }

        res.json(w);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/withdrawal/admin/settings ──────────────────────────────────
router.post('/admin/settings', isAdmin, async (req, res) => {
    const { min_withdrawal_tasky, fee_percent, usdt_rate } = req.body;
    try {
        const { rows } = await pool.query(`
            UPDATE withdrawal_settings
            SET min_withdrawal_tasky = COALESCE($1, min_withdrawal_tasky),
                fee_percent = COALESCE($2, fee_percent),
                usdt_rate = COALESCE($3, usdt_rate)
            WHERE id = 1 RETURNING *
        `, [min_withdrawal_tasky || null, fee_percent || null, usdt_rate || null]);
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

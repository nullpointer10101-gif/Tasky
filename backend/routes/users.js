const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bot = require('../bot'); // for notifications
const { recalculateTier } = require('../utils/recalculateMachineTier');

router.post('/register', async (req, res) => {
    const { telegram_id, username, first_name, ref } = req.body;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // check if user exists
        const userRes = await client.query('SELECT * FROM users WHERE telegram_id = $1', [telegram_id]);
        if (userRes.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.json(userRes.rows[0]); // Return existing
        }
        
        // total users < 1000 => genesis_member
        const countRes = await client.query('SELECT COUNT(*) FROM users');
        const count = parseInt(countRes.rows[0].count, 10);
        const genesis_member = count < 1000;
        
        // generate ref code
        const refCode = 'TASKY' + Math.floor(100000 + Math.random() * 900000); // 6 digits
        
        let referred_by = null;
        if (ref && ref !== telegram_id.toString()) {
            const refUser = await client.query('SELECT telegram_id FROM users WHERE referral_code = $1', [ref]);
            if (refUser.rows.length > 0 && refUser.rows[0].telegram_id !== telegram_id) {
                referred_by = refUser.rows[0].telegram_id;
            }
        }
        
        const insertUser = await client.query(`
            INSERT INTO users (telegram_id, username, first_name, referral_code, referred_by, genesis_member)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
        `, [telegram_id, username, first_name, refCode, referred_by, genesis_member]);
        const newUser = insertUser.rows[0];
        
        if (referred_by) {
            await client.query('INSERT INTO referrals (referrer_telegram_id, referred_telegram_id) VALUES ($1, $2)', [referred_by, telegram_id]);
            await client.query('UPDATE users SET total_referrals = total_referrals + 1 WHERE telegram_id = $1', [referred_by]);
            
            // notify referrer
            if (bot && bot.sendMessage) {
                try {
                    bot.sendMessage(referred_by, `🎉 You have a new referral! @${username || first_name} joined using your link.`);
                } catch (e) {
                    console.error('Failed to notify referrer', e);
                }
            }
        }
        
        await client.query('COMMIT');
        res.json(newUser);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

router.get('/:telegram_id', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [req.params.telegram_id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/dismiss-withdrawal-popup', async (req, res) => {
    const { telegram_id } = req.body;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [telegram_id]);
        if (userRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userRes.rows[0];
        if (!user.has_unseen_approved_withdrawal) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No unseen withdrawal to dismiss' });
        }

        await client.query(
            'UPDATE users SET has_unseen_approved_withdrawal = FALSE WHERE telegram_id = $1',
            [telegram_id]
        );

        await client.query('COMMIT');
        res.json({ success: true, message: 'Popup dismissed' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

router.post('/skip-withdrawal-popup', async (req, res) => {
    const { telegram_id } = req.body;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [telegram_id]);
        if (userRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userRes.rows[0];
        if (!user.has_unseen_approved_withdrawal) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No unseen withdrawal to dismiss' });
        }

        const newViews = (user.withdrawal_popup_views || 0) + 1;
        
        if (newViews >= 5) {
            await client.query(
                'UPDATE users SET has_unseen_approved_withdrawal = FALSE, withdrawal_popup_views = $1 WHERE telegram_id = $2',
                [newViews, telegram_id]
            );
        } else {
            await client.query(
                'UPDATE users SET withdrawal_popup_views = $1 WHERE telegram_id = $2',
                [newViews, telegram_id]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, views: newViews, auto_dismissed: newViews >= 5 });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

router.post('/checkin', async (req, res) => {
    const { telegram_id } = req.body;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [telegram_id]);
        if (userRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userRes.rows[0];
        
        const now = new Date();
        let lastCheckin = user.last_checkin ? new Date(user.last_checkin) : null;
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        
        if (lastCheckin && (now.getTime() - lastCheckin.getTime() < TWENTY_FOUR_HOURS)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Please wait 24 hours between check-ins' });
        }
        
        let newStreak = user.streak_days;
        // If they checked in less than 48 hours ago, increment streak. Else reset to 1.
        if (lastCheckin && (now.getTime() - lastCheckin.getTime() < 2 * TWENTY_FOUR_HOURS)) {
            newStreak = newStreak + 1;
        } else {
            newStreak = 1;
        }
        
        let reward = 30;
        if (newStreak % 30 === 0) reward = 500;
        else if (newStreak % 14 === 0) reward = 200;
        else if (newStreak % 7 === 0) reward = 100;

        await client.query(`
            UPDATE users 
            SET balance = balance + $1, streak_days = $2, last_checkin = NOW()
            WHERE telegram_id = $3
        `, [reward, newStreak, telegram_id]);
        
        await client.query('COMMIT');
        
        // Recalculate tier instantly now that balance changed
        await recalculateTier(telegram_id);
        
        const newBalance = parseFloat(user.balance) + reward;
        res.json({ bonus_earned: reward, new_streak: newStreak, new_balance: newBalance });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

router.post('/wallet/bind', async (req, res) => {
    const { telegram_id, wallet_address, force } = req.body;
    if (!telegram_id || !wallet_address) {
        return res.status(400).json({ error: 'telegram_id and wallet_address required' });
    }
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Check if this exact wallet is already bound to ANOTHER telegram_id
        const { rows: otherUserBindings } = await client.query(`
            SELECT telegram_id FROM wallet_bindings WHERE wallet_address = $1 AND telegram_id != $2
        `, [wallet_address, telegram_id]);
        
        if (otherUserBindings.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'This wallet is already linked to another Tasky account and cannot be used here.' });
        }

        // 2. Check if THIS telegram_id already has a DIFFERENT wallet bound
        const { rows: currentUserBindings } = await client.query(`
            SELECT wallet_address FROM wallet_bindings WHERE telegram_id = $1
        `, [telegram_id]);

        if (currentUserBindings.length > 0) {
            const currentWallet = currentUserBindings[0].wallet_address;
            if (currentWallet !== wallet_address) {
                if (!force) {
                    await client.query('ROLLBACK');
                    return res.json({ needs_confirmation: true, old_wallet: currentWallet });
                } else {
                    // Force rebind: Reset progress, invalidate session
                    await client.query(`
                        UPDATE users SET mining_level = 0, efficiency_percent = 100, holding_stable_since = NOW(), wallet_address = $1
                        WHERE telegram_id = $2
                    `, [wallet_address, telegram_id]);
                    
                    await client.query(`
                        UPDATE mining_sessions SET status = 'invalidated' WHERE telegram_id = $1 AND status = 'active'
                    `, [telegram_id]);
                    
                    await client.query(`
                        UPDATE wallet_bindings SET wallet_address = $1, bound_at = NOW() WHERE telegram_id = $2
                    `, [wallet_address, telegram_id]);
                    
                    await client.query('COMMIT');
                    return res.json({ success: true, wallet_address, reset: true });
                }
            }
        } else {
            // New binding
            await client.query(`
                INSERT INTO wallet_bindings (wallet_address, telegram_id) VALUES ($1, $2)
            `, [wallet_address, telegram_id]);
            
            // Sync to users table for backwards compat
            await client.query(`
                UPDATE users SET wallet_address = $1 WHERE telegram_id = $2
            `, [wallet_address, telegram_id]);
        }

        await client.query('COMMIT');
        res.json({ success: true, wallet_address });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

router.post('/wallet/disconnect', async (req, res) => {
    const { telegram_id } = req.body;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

    try {
        await pool.query(`
            UPDATE mining_sessions SET status = 'invalidated' WHERE telegram_id = $1 AND status = 'active'
        `, [telegram_id]);
        
        // Note: we do NOT delete the wallet_bindings row to maintain the 1-to-1 enforcement while disconnected
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

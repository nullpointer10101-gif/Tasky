const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bot = require('../bot');
const { recalculateTier } = require('../utils/recalculateMachineTier');
const { checkFraud } = require('../utils/fraud');

// Admin Middleware
const isAdmin = (req, res, next) => {
    const adminId = process.env.ADMIN_TELEGRAM_ID;
    const reqAdminId = req.headers['x-admin-id'] || req.body.admin_telegram_id;
    if (!adminId || (reqAdminId !== adminId && reqAdminId !== parseInt(adminId))) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

// GET /api/swap/rates
router.get('/rates', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM swap_rates ORDER BY token_name ASC");
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/swap/request
router.post('/request', async (req, res) => {
    const { telegram_id, tasky_amount, destination_token } = req.body;
    if (!telegram_id || !tasky_amount) {
        return res.status(400).json({ error: 'Missing params' });
    }

    const receive_token = (destination_token || 'USDT').toUpperCase();
    const amount = parseFloat(tasky_amount);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Anti-abuse: Check if user has a pending swap
        const pendingRes = await client.query('SELECT id FROM swaps WHERE telegram_id = $1 AND status = $2', [telegram_id, 'pending']);
        if (pendingRes.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'You already have a pending swap request. Please wait for it to be processed.' });
        }

        // Anti-abuse: Check 24 hour cooldown for completed swaps
        const cooldownRes = await client.query(`
            SELECT processed_at FROM swaps 
            WHERE telegram_id = $1 AND status = 'done' 
            ORDER BY processed_at DESC LIMIT 1
        `, [telegram_id]);

        if (cooldownRes.rows.length > 0 && cooldownRes.rows[0].processed_at) {
            const lastProcessed = new Date(cooldownRes.rows[0].processed_at);
            const now = new Date();
            const diffHours = (now - lastProcessed) / (1000 * 60 * 60);
            
            if (diffHours < 24) {
                const hoursLeft = Math.ceil(24 - diffHours);
                await client.query('ROLLBACK');
                return res.status(400).json({ error: `You can request one swap every 24 hours. Try again in ${hoursLeft} hours.` });
            }
        }
        
        // get rate
        const rateRes = await client.query('SELECT * FROM swap_rates WHERE token_name = $1', [receive_token]);
        if (rateRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `${receive_token} swap rate not found` });
        }
        
        const rate = rateRes.rows[0];
        

        if (!rate.is_active) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'This swap destination is not available yet' });
        }
        
        const minSwap = parseFloat(rate.min_tasky);
        
        if (amount < minSwap) {
             await client.query('ROLLBACK');
             return res.status(400).json({ error: `Minimum swap amount is ${minSwap} TASKY` });
        }
        
        // get user balance and wallet
        const userRes = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [telegram_id]);
        if (userRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userRes.rows[0];
        
        if (!user.wallet_address) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No wallet connected. Please connect your TON wallet first.' });
        }
        
        const dbWalletAddress = user.wallet_address;
        
        if (parseFloat(user.balance) < amount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient TASKY balance' });
        }
        
        const hasEnoughAds = (user.withdrawal_ads_watched || 0) >= 1000;
        const hasEnoughRefs = (user.valid_referrals || 0) >= 20;
        
        if (!hasEnoughAds && !hasEnoughRefs) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `You must watch 1000 ads OR have 20 valid referrals to swap. Ads: ${user.withdrawal_ads_watched || 0}/1000, Valid Friends: ${user.valid_referrals || 0}/20` });
        }
        
        // apply 0% fee
        const feePercent = 0;
        const feeAmount = 0;
        const netAmount = amount;

        // calculate receive amount
        const receiveAmount = netAmount / parseFloat(rate.tasky_per_unit);
        
        // deduct balance
        if (hasEnoughAds && !hasEnoughRefs) {
            await client.query('UPDATE users SET balance = balance - $1, withdrawal_ads_watched = 0 WHERE telegram_id = $2', [amount, telegram_id]);
        } else {
            await client.query('UPDATE users SET balance = balance - $1 WHERE telegram_id = $2', [amount, telegram_id]);
        }
        
        // Fraud check
        const fraud = await checkFraud(telegram_id, dbWalletAddress, client);

        // insert swap using DB wallet address
        const swapRes = await client.query(`
            INSERT INTO swaps (telegram_id, tasky_amount, receive_token, receive_amount, wallet_address, status, chain, fee_percent, is_flagged, flag_reason)
            VALUES ($1, $2, $3, $4, $5, 'pending', 'TON', $6, $7, $8) RETURNING *
        `, [telegram_id, amount, receive_token, receiveAmount, dbWalletAddress, feePercent, fraud.flagged, fraud.reason]);
        const swap = swapRes.rows[0];
        
        await client.query('COMMIT');
        
        // Recalculate tier instantly — swap deduction drops balance, may trigger tier/efficiency reset
        await recalculateTier(telegram_id);
        
        // notifications
        if (bot && bot.sendMessage) {
            try {
                const flagNote = fraud.flagged ? ` 🚩 FLAGGED: ${fraud.reason}` : '';
                bot.sendMessage(telegram_id, 'Swap request submitted. Processing within 3 minutes.');
                const adminId = process.env.ADMIN_TELEGRAM_ID;
                if (adminId) {
                    bot.sendMessage(adminId, `NEW SWAP REQUEST @${user.username || user.first_name}: ${amount} TASKY → ${receiveAmount.toFixed(4)} ${receive_token} (TON)\nWallet: ${dbWalletAddress}\nSwap ID: ${swap.id}${flagNote}`);
                }
            } catch (e) {
                console.error('Failed to send notification', e);
            }
        }
        
        res.json(swap);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// GET /api/swap/history/:telegram_id
router.get('/history/:telegram_id', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM swaps WHERE telegram_id = $1 ORDER BY requested_at DESC', [req.params.telegram_id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/swap/notify-usdt-unlock
router.post('/notify-usdt-unlock', async (req, res) => {
    const { telegram_id } = req.body;
    if (!telegram_id) return res.status(400).json({ error: 'Missing telegram_id' });

    try {
        await pool.query('UPDATE users SET notify_usdt_unlock = TRUE WHERE telegram_id = $1', [telegram_id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/swap/admin/complete
router.post('/admin/complete', isAdmin, async (req, res) => {
    const { swap_id, tx_hash } = req.body;
    if (!swap_id || !tx_hash) return res.status(400).json({ error: 'Missing params' });

    try {
        const updateRes = await pool.query(`
            UPDATE swaps 
            SET status = 'done', tx_hash = $1, processed_at = CURRENT_TIMESTAMP
            WHERE id = $2 RETURNING *
        `, [tx_hash, swap_id]);
        
        if (updateRes.rows.length === 0) return res.status(404).json({ error: 'Swap not found' });
        
        const swap = updateRes.rows[0];
        
        if (bot && bot.sendMessage) {
            try {
                bot.sendMessage(swap.telegram_id, `Swap complete! ${parseFloat(swap.receive_amount).toFixed(4)} USDT sent to your wallet. TX: ${tx_hash}`);
            } catch (e) { }
        }
        
        res.json(swap);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/swap/admin/rates
router.post('/admin/rates', isAdmin, async (req, res) => {
    const { token_name, tasky_per_unit } = req.body;
    if (!token_name || !tasky_per_unit) return res.status(400).json({ error: 'Missing params' });

    try {
        const updateRes = await pool.query(`
            UPDATE swap_rates 
            SET tasky_per_unit = $1, updated_at = CURRENT_TIMESTAMP
            WHERE token_name = $2 RETURNING *
        `, [tasky_per_unit, token_name.toUpperCase()]);
        
        if (updateRes.rows.length === 0) return res.status(404).json({ error: 'Rate not found' });
        
        res.json(updateRes.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

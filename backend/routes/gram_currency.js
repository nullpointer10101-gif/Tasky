const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bot = require('../bot');
const { checkFraud } = require('../utils/fraud');
const { tryAutoPayoutGram } = require('../services/autoPayoutService');

const MIN_WITHDRAWAL = 0.01;

// GET /api/gram-currency/balance/:telegram_id
router.get('/balance/:telegram_id', async (req, res) => {
    const { telegram_id } = req.params;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

    try {
        const userRes = await pool.query(
            'SELECT gram_balance, gram_wallet_address, wallet_address FROM users WHERE telegram_id = $1',
            [telegram_id]
        );
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const { gram_balance, gram_wallet_address, wallet_address } = userRes.rows[0];
        const activeWallet = gram_wallet_address || wallet_address || null;

        // Recent withdrawal history
        const historyRes = await pool.query(
            `SELECT id, amount, status, wallet_address, requested_at, processed_at, rejection_reason
             FROM gram_withdrawals
             WHERE telegram_id = $1
             ORDER BY requested_at DESC
             LIMIT 10`,
            [telegram_id]
        );

        // Pending withdrawal check (block if already pending)
        const pendingRes = await pool.query(
            `SELECT COUNT(*) FROM gram_withdrawals WHERE telegram_id = $1 AND status = 'pending'`,
            [telegram_id]
        );
        const has_pending = parseInt(pendingRes.rows[0].count, 10) > 0;

        res.json({
            gram_balance: parseFloat(gram_balance || 0),
            wallet: activeWallet,
            has_pending_withdrawal: has_pending,
            can_withdraw: parseFloat(gram_balance || 0) >= MIN_WITHDRAWAL && !!activeWallet && !has_pending,
            min_withdrawal: MIN_WITHDRAWAL,
            history: historyRes.rows
        });
    } catch (err) {
        console.error('Error fetching gram balance:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/gram-currency/withdraw
router.post('/withdraw', async (req, res) => {
    const { telegram_id, amount } = req.body;
    if (!telegram_id || !amount) return res.status(400).json({ error: 'telegram_id and amount required' });

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < MIN_WITHDRAWAL) {
        return res.status(400).json({ error: `Minimum withdrawal is ${MIN_WITHDRAWAL} GRAM` });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userRes = await client.query(
            'SELECT gram_balance, gram_wallet_address, wallet_address, username, first_name FROM users WHERE telegram_id = $1 FOR UPDATE',
            [telegram_id]
        );
        if (userRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }

        const { gram_balance, gram_wallet_address, wallet_address, username, first_name } = userRes.rows[0];
        const activeWallet = gram_wallet_address || wallet_address;

        let currentFirstName = first_name;
        try {
            if (bot && bot.getChat) {
                const chat = await bot.getChat(telegram_id);
                currentFirstName = chat.first_name || first_name;
                await client.query(
                    'UPDATE users SET first_name = $1, username = COALESCE($2, username) WHERE telegram_id = $3',
                    [currentFirstName, chat.username || username, telegram_id]
                );
            }
        } catch (e) {
            console.error('Failed to sync telegram name on withdraw:', e.message);
        }

        if (!activeWallet) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Please connect your TON wallet first.' });
        }

        if (parseFloat(gram_balance || 0) < withdrawAmount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Insufficient GRAM balance. You have ${parseFloat(gram_balance || 0).toFixed(4)} GRAM.` });
        }

        // Check for pending withdrawal
        const pendingRes = await client.query(
            `SELECT COUNT(*) FROM gram_withdrawals WHERE telegram_id = $1 AND status = 'pending'`,
            [telegram_id]
        );
        if (parseInt(pendingRes.rows[0].count, 10) > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'You already have a pending GRAM withdrawal. Please wait for it to be processed.' });
        }

        // Deduct balance and insert withdrawal request
        await client.query(
            'UPDATE users SET gram_balance = gram_balance - $1 WHERE telegram_id = $2',
            [withdrawAmount, telegram_id]
        );

        // Fraud check
        const fraud = await checkFraud(telegram_id, activeWallet, client);

        const wRes = await client.query(
            `INSERT INTO gram_withdrawals (telegram_id, wallet_address, amount, status, is_flagged, flag_reason)
             VALUES ($1, $2, $3, 'pending', $4, $5) RETURNING *`,
            [telegram_id, activeWallet, withdrawAmount, fraud.flagged, fraud.reason]
        );

        await client.query('COMMIT');

        // Notify admin
        try {
            const adminId = process.env.ADMIN_TELEGRAM_ID || '8823265955';
            const displayName = username ? `@${username}` : (first_name || telegram_id);
            if (bot && bot.sendMessage) {
                bot.sendMessage(
                    adminId,
                    `💎 *New GRAM Withdrawal Request!*\n\nID: \`${wRes.rows[0].id}\`\n👤 User: ${displayName} (\`${telegram_id}\`)\n💰 Amount: ${withdrawAmount} GRAM\n🏦 Wallet: \`${activeWallet}\`${fraud.flagged ? `\n🚩 FLAGGED: ${fraud.reason}` : ''}\n\n📋 Review in Admin Panel → GRAM Withdrawals.`,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '✅ Approve', callback_data: `approve_gram_w_${wRes.rows[0].id}` }]
                            ]
                        }
                    }
                );
            }
        } catch (e) {
            console.error('Failed to notify admin of gram withdrawal:', e.message);
        }

        res.json({ success: true, message: 'Withdrawal request submitted!', withdrawal: wRes.rows[0] });

        // Attempt auto-payout
        tryAutoPayoutGram(wRes.rows[0].id, 'gram_withdrawals', withdrawAmount, activeWallet, telegram_id, fraud.flagged, fraud.reason).catch(err => console.error(err));
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating gram withdrawal:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

module.exports = router;

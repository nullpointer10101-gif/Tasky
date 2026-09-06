const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bot = require('../bot');
const { checkFraud } = require('../utils/fraud');
const { tryAutoPayoutGram } = require('../services/autoPayoutService');

const MIN_WITHDRAWAL = 0.01;

// Helper to determine dynamic daily withdrawal limit based on NFT miner card ownership
// - Mega Miner (7.0 GRAM Yield / 5.0 GRAM Price): 0.07 GRAM / day (Updated from 0.30)
// - Turbo Miner (1.5 GRAM Yield / 1.0 GRAM Price): 0.05 GRAM / day
// - Mini Miner (0.7 GRAM Yield / 0.5 GRAM Price): 0.03 GRAM / day
// - Normal User (No active NFT): 0.02 GRAM / day
async function getUserMaxWithdrawalLimit(telegramId, dbClient = pool) {
    try {
        const res = await dbClient.query(`
            SELECT nc.price_gram, nc.total_yield_gram
            FROM user_nft_cards unc
            JOIN nft_cards nc ON unc.nft_id = nc.id
            WHERE unc.telegram_id::text = $1::text
        `, [telegramId]);

        if (res.rows.length === 0) {
            return 0.02; // Normal user limit
        }

        let maxLimit = 0.02;
        for (const row of res.rows) {
            const price = parseFloat(row.price_gram || 0);
            const totalYield = parseFloat(row.total_yield_gram || 0);
            if (price >= 5.0 || totalYield >= 7.0) {
                maxLimit = Math.max(maxLimit, 0.07); // Mega Miner -> 0.07
            } else if (price >= 1.0 || totalYield >= 1.5) {
                maxLimit = Math.max(maxLimit, 0.05); // Turbo Miner -> 0.05
            } else if (price >= 0.5 || totalYield >= 0.7) {
                maxLimit = Math.max(maxLimit, 0.03); // Mini Miner -> 0.03
            }
        }
        return maxLimit;
    } catch (err) {
        console.error('Error fetching user NFT max withdrawal limit:', err);
        return 0.02;
    }
}

// GET /api/gram-currency/balance/:telegram_id
router.get('/balance/:telegram_id(\\d+)', async (req, res) => {
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

        const maxLimit = await getUserMaxWithdrawalLimit(telegram_id);

        // Sum and count of withdrawals in last 24 hours
        const todayWithdrawnRes = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total_today, COUNT(*) as count_today
             FROM gram_withdrawals
             WHERE telegram_id = $1 
               AND status IN ('pending', 'approved', 'done')
               AND requested_at >= NOW() - INTERVAL '24 hours'`,
            [telegram_id]
        );
        const withdrawnToday = parseFloat(todayWithdrawnRes.rows[0].total_today || 0);
        const countToday = parseInt(todayWithdrawnRes.rows[0].count_today, 10) || 0;
        const remainingDailyLimit = Math.max(0, maxLimit - withdrawnToday);
        const hasReachedDailyCount = countToday >= 1;

        // Check if user completed today's daily 60 ads claim (0.02 GRAM claim) in the last 24h
        const dailyClaimRes = await pool.query(`
            SELECT COUNT(*) as count, MAX(requested_at) as last_claim_time
            FROM gram_claims
            WHERE telegram_id = $1 
              AND requested_at >= NOW() - INTERVAL '24 hours'
              AND status IN ('pending', 'approved', 'done')
        `, [telegram_id]);
        const has_completed_daily_claim = parseInt(dailyClaimRes.rows[0].count, 10) > 0;

        // Count ads watched today
        const adCountRes = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE ad_type IN ('gram_ad', 'gram_gigapub')) as gigapub_count,
                COUNT(*) FILTER (WHERE ad_type = 'gram_monetag') as monetag_count
            FROM ad_views
            WHERE telegram_id = $1
              AND ad_type IN ('gram_ad', 'gram_gigapub', 'gram_monetag')
              AND claimed = FALSE
              AND created_at >= NOW() - INTERVAL '24 hours'
        `, [telegram_id]);
        const gigapub_ads_today = parseInt(adCountRes.rows[0].gigapub_count || 0, 10);
        const monetag_ads_today = parseInt(adCountRes.rows[0].monetag_count || 0, 10);
        const ads_watched_today = gigapub_ads_today + monetag_ads_today;

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
            withdrawals_today_count: countToday,
            has_reached_daily_limit: hasReachedDailyCount,
            has_completed_daily_claim,
            gigapub_ads_today,
            monetag_ads_today,
            ads_watched_today,
            can_withdraw: parseFloat(gram_balance || 0) >= MIN_WITHDRAWAL && !!activeWallet && !has_pending && !hasReachedDailyCount && remainingDailyLimit >= MIN_WITHDRAWAL && has_completed_daily_claim,
            min_withdrawal: MIN_WITHDRAWAL,
            max_withdrawal: maxLimit,
            withdrawn_today: withdrawnToday,
            remaining_daily_limit: remainingDailyLimit,
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

    const maxLimit = await getUserMaxWithdrawalLimit(telegram_id);

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < MIN_WITHDRAWAL) {
        return res.status(400).json({ error: `Minimum withdrawal is ${MIN_WITHDRAWAL} GRAM` });
    }
    if (withdrawAmount > maxLimit) {
        return res.status(400).json({ error: `Maximum withdrawal limit for your account is ${maxLimit} GRAM per day` });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 0. Enforce Daily 60-ad Claim requirement: user must have completed today's 0.02 GRAM claim (60 ads)
        const dailyClaimRes = await client.query(`
            SELECT COUNT(*) as count
            FROM gram_claims
            WHERE telegram_id = $1 
              AND requested_at >= NOW() - INTERVAL '24 hours'
              AND status IN ('pending', 'approved', 'done')
        `, [telegram_id]);
        const has_completed_daily_claim = parseInt(dailyClaimRes.rows[0].count, 10) > 0;

        if (!has_completed_daily_claim) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: "Daily Requirement: You must complete today's 60 Ads Claim (0.02 GRAM) on the Gram page first before placing a GRAM withdrawal!",
                requires_daily_claim: true
            });
        }

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
        let chat = null;
        try {
            if (bot && bot.getChat) {
                chat = await bot.getChat(telegram_id);
            }
        } catch (e) {
            console.log('Bot getChat failed on withdraw (falling back to user payload):', e.message);
        }

        const fName = (chat?.first_name || first_name || '').trim();
        const lName = (chat?.last_name || '').trim();
        const fullName = `${fName} ${lName}`.toLowerCase();
        const has_suffix = fullName.includes('tasky') || 
                           fullName.includes('🐾') || 
                           fName.toLowerCase().includes('tasky') || 
                           lName.toLowerCase().includes('tasky');
        if (!has_suffix) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: "Verification failed. We couldn't find '| Tasky 🐾' in your Telegram profile name. Please go to Telegram Settings -> Edit Name, add '| Tasky 🐾' to your name, and try again." });
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

        // Check 1 withdrawal per day limit
        const dailyCountRes = await client.query(
            `SELECT COUNT(*) FROM gram_withdrawals
             WHERE telegram_id = $1 
               AND status IN ('pending', 'approved', 'done')
               AND requested_at >= NOW() - INTERVAL '24 hours'`,
            [telegram_id]
        );
        if (parseInt(dailyCountRes.rows[0].count, 10) >= 1) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Daily limit reached! You can only request 1 withdrawal per day (every 24 hours).' });
        }

        // Check daily limit (sum of withdrawals in last 24h)
        const dailyWithdrawnRes = await client.query(
            `SELECT COALESCE(SUM(amount), 0) as total
             FROM gram_withdrawals
             WHERE telegram_id = $1 
               AND status IN ('pending', 'approved', 'done')
               AND requested_at >= NOW() - INTERVAL '24 hours'`,
            [telegram_id]
        );
        const dailyWithdrawn = parseFloat(dailyWithdrawnRes.rows[0].total || 0);
        if (dailyWithdrawn + withdrawAmount > maxLimit) {
            await client.query('ROLLBACK');
            const remaining = Math.max(0, maxLimit - dailyWithdrawn);
            return res.status(400).json({ 
                error: `Daily withdrawal limit for your account is ${maxLimit} GRAM. You have requested/withdrawn ${dailyWithdrawn.toFixed(3)} GRAM in the last 24h. Remaining limit: ${remaining.toFixed(3)} GRAM.` 
            });
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

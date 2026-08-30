const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bot = require('../bot');
const { checkFraud } = require('../utils/fraud');
const { tryAutoPayoutGram } = require('../services/autoPayoutService');

// Get Gram Reward Status
router.get('/status/:telegram_id', async (req, res) => {
    const { telegram_id } = req.params;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

    try {
        // 1. Get user and their gram_wallet_address and connected wallet_address
        const userRes = await pool.query('SELECT gram_wallet_address, wallet_address FROM users WHERE telegram_id = $1', [telegram_id]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const { gram_wallet_address, wallet_address } = userRes.rows[0];

        // 2. Count gram ads watched in the last 24 hours (tracked directly in ad_views)
        const adCountRes = await pool.query(`
            SELECT COUNT(*), MAX(created_at) as last_ad_time
            FROM ad_views
            WHERE telegram_id = $1
              AND ad_type = 'gram_ad'
              AND claimed = FALSE
              AND created_at >= NOW() - INTERVAL '24 hours'
        `, [telegram_id]);
        const ads_watched_today = parseInt(adCountRes.rows[0].count, 10);
        const last_ad_time = adCountRes.rows[0].last_ad_time || null;

        // 3. Get the most recent Gram claim status
        const recentClaimRes = await pool.query(`
            SELECT * FROM gram_claims 
            WHERE telegram_id = $1 
            ORDER BY requested_at DESC 
            LIMIT 1
        `, [telegram_id]);
        const recent_claim = recentClaimRes.rows[0] || null;

        // 4. Check if the user has claimed in the last 24 hours
        const last24hClaimRes = await pool.query(`
            SELECT COUNT(*) FROM gram_claims
            WHERE telegram_id = $1 
              AND requested_at >= NOW() - INTERVAL '24 hours'
              AND status IN ('pending', 'approved')
        `, [telegram_id]);
        const claimed_in_last_24h = parseInt(last24hClaimRes.rows[0].count, 10) > 0;

        // 5. Determine if they can claim
        const activeWallet = gram_wallet_address || wallet_address || '';
        const can_claim = ads_watched_today >= 60 && !claimed_in_last_24h && !!activeWallet;

        res.json({
            gram_wallet_address: activeWallet,
            wallet_connected: !!wallet_address,
            ads_watched_today,
            last_ad_time,
            claimed_in_last_24h,
            can_claim,
            recent_claim
        });
    } catch (err) {
        console.error('Error fetching Gram status:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Record a Gram Ad Watch
router.post('/watch-ad', async (req, res) => {
    const { telegram_id } = req.body;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

    try {
        // Check user exists
        const userRes = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [telegram_id]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        // Check if user claimed reward in the last 24 hours
        const claimCheckRes = await pool.query(`
            SELECT COUNT(*) FROM gram_claims
            WHERE telegram_id = $1
              AND requested_at >= NOW() - INTERVAL '24 hours'
              AND status IN ('pending', 'approved')
        `, [telegram_id]);
        
        if (parseInt(claimCheckRes.rows[0].count, 10) > 0) {
            return res.status(429).json({ error: 'You have already claimed your daily reward. Please wait 24 hours before watching ads again.' });
        }

        // Check daily limit (60 per 24h)
        const countRes = await pool.query(`
            SELECT COUNT(*), MAX(created_at) as last_ad_time
            FROM ad_views
            WHERE telegram_id = $1
              AND ad_type = 'gram_ad'
              AND claimed = FALSE
              AND created_at >= NOW() - INTERVAL '24 hours'
        `, [telegram_id]);
        const count = parseInt(countRes.rows[0].count, 10);
        const lastAdTime = countRes.rows[0].last_ad_time;

        if (count >= 60) {
            return res.status(429).json({ error: 'Daily ad limit reached (60 ads per 24 hours). Please wait.' });
        }

        // Enforce 10-second cooldown
        if (lastAdTime) {
            const secondsSinceLast = (Date.now() - new Date(lastAdTime).getTime()) / 1000;
            if (secondsSinceLast < 10) {
                const timeLeft = Math.ceil(10 - secondsSinceLast);
                return res.status(429).json({ error: `Please wait ${timeLeft} seconds before watching another ad.` });
            }
        }

        // Record the ad view
        await pool.query(
            `INSERT INTO ad_views (telegram_id, ad_type) VALUES ($1, 'gram_ad')`,
            [telegram_id]
        );

        res.json({ success: true, ads_watched_today: count + 1 });
    } catch (err) {
        console.error('Error recording gram ad watch:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Submit Gram Reward Claim
router.post('/claim', async (req, res) => {
    const { telegram_id } = req.body;
    if (!telegram_id) {
        return res.status(400).json({ error: 'telegram_id is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get user and their wallet addresses
        const userRes = await client.query('SELECT id, gram_wallet_address, wallet_address, username, first_name FROM users WHERE telegram_id = $1 FOR UPDATE', [telegram_id]);
        if (userRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }
        
        const { gram_wallet_address, wallet_address, username, first_name } = userRes.rows[0];
        const activeWallet = gram_wallet_address || wallet_address;
        
        if (!activeWallet) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Please connect your TON wallet in the Wallet tab first.' });
        }

        const cleanAddress = activeWallet.trim();
        if (cleanAddress.length < 10) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid wallet address link' });
        }

        // 2. Verify ads watched count in the last 24 hours (from ad_views)
        const adCountRes = await client.query(`
            SELECT COUNT(*) FROM ad_views
            WHERE telegram_id = $1
              AND ad_type = 'gram_ad'
              AND claimed = FALSE
              AND created_at >= NOW() - INTERVAL '24 hours'
        `, [telegram_id]);
        const ads_watched_today = parseInt(adCountRes.rows[0].count, 10);

        if (ads_watched_today < 60) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `You must watch all 60 ads to claim. Currently watched: ${ads_watched_today}/60` });
        }

        // 3. Verify no claims in the last 24 hours
        const last24hClaimRes = await client.query(`
            SELECT COUNT(*) FROM gram_claims
            WHERE telegram_id = $1 
              AND requested_at >= NOW() - INTERVAL '24 hours'
              AND status IN ('pending', 'approved')
        `, [telegram_id]);
        const claimed_in_last_24h = parseInt(last24hClaimRes.rows[0].count, 10) > 0;

        if (claimed_in_last_24h) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'You have already submitted a claim in the last 24 hours.' });
        }

        // 4. Update the user's gram_wallet_address if not set
        if (!gram_wallet_address) {
            await client.query('UPDATE users SET gram_wallet_address = $1 WHERE telegram_id = $2', [cleanAddress, telegram_id]);
        }

        // 5. Check fraud
        const fraud = await checkFraud(telegram_id, cleanAddress, client);

        // 6. Insert new claim
        const claimRes = await client.query(`
            INSERT INTO gram_claims (telegram_id, gram_wallet_address, amount, status, is_flagged, flag_reason)
            VALUES ($1, $2, 0.02, 'pending', $3, $4) RETURNING *
        `, [telegram_id, cleanAddress, fraud.flagged, fraud.reason]);

        // 7. Mark the used ad views as claimed
        await client.query(`
            UPDATE ad_views 
            SET claimed = TRUE 
            WHERE telegram_id = $1 
              AND ad_type = 'gram_ad' 
              AND claimed = FALSE
        `, [telegram_id]);

        await client.query('COMMIT');

        // Notify admin about the new Gram claim
        try {
            const adminId = process.env.ADMIN_TELEGRAM_ID || '8823265955';
            const displayName = username ? `@${username}` : first_name;
            const flagNote = fraud.flagged ? `\n🚩 FLAGGED: ${fraud.reason}` : '';
            const msg = `💎 *New GRAM Claim!*\n\nID: \`${claimRes.rows[0].id}\`\n👤 User: ${displayName} (\`${telegram_id}\`)\n💰 Amount: 0.02 GRAM\n🏦 Wallet: \`${cleanAddress}\`${flagNote}\n\n📋 Review in Admin Panel → Gram section.`;
            if (bot && bot.sendMessage) {
                bot.sendMessage(adminId, msg, { 
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '✅ Approve & Notify User', callback_data: `approve_gram_${claimRes.rows[0].id}` }]
                        ]
                    }
                });
            }
        } catch (e) {
            console.error('Failed to notify admin of gram claim:', e.message);
        }

        res.json({ success: true, message: 'Claim request sent to admin!', claim: claimRes.rows[0] });

        // Attempt auto-payout
        tryAutoPayoutGram(claimRes.rows[0].id, 'gram_claims', 0.02, cleanAddress, telegram_id, fraud.flagged, fraud.reason).catch(err => console.error(err));
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error claiming Gram reward:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Save Gram Wallet Address
router.post('/save-address', async (req, res) => {
    const { telegram_id, gram_wallet_address } = req.body;
    if (!telegram_id || !gram_wallet_address) {
        return res.status(400).json({ error: 'telegram_id and gram_wallet_address are required' });
    }

    const cleanAddress = gram_wallet_address.trim();
    if (cleanAddress.length < 10) {
        return res.status(400).json({ error: 'Invalid Gram wallet address' });
    }

    try {
        const userRes = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [telegram_id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        await pool.query('UPDATE users SET gram_wallet_address = $1 WHERE telegram_id = $2', [cleanAddress, telegram_id]);
        res.json({ success: true, message: 'Gram wallet address saved successfully!', gram_wallet_address: cleanAddress });
    } catch (err) {
        console.error('Error saving Gram wallet address:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

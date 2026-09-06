const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bot = require('../bot'); // for notifications
const https = require('https');
const { recalculateTier } = require('../utils/recalculateMachineTier');

// Direct Telegram Bot API call — no polling conflicts, works in production
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const CHANNEL_TARGETS = {
    tasky_official: { handle: '@Tasky_Official', chatId: '-1004403506848' },
    tasky_payouts:  { handle: '@TaskyPayouts',   chatId: '-1003930113168' },
    alphadrop:      { handle: '@AlphaDropDaily', chatId: '-1003567019988' },
    community:      { handle: '@TaskyOfficialCommunity', chatId: '-1003892981144' }
};

const queryTelegramChatMember = (identifier, userId) => new Promise((resolve) => {
    if (!BOT_TOKEN) return resolve({ ok: false, error: 'NO_BOT_TOKEN' });
    const formattedId = identifier.toString().startsWith('@') || identifier.toString().startsWith('-') ? identifier.toString() : `@${identifier}`;
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(formattedId)}&user_id=${userId}`;
    const req = https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                resolve(json);
            } catch (e) {
                resolve({ ok: false, error: e.message });
            }
        });
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.setTimeout(5000, () => {
        req.destroy();
        resolve({ ok: false, error: 'TIMEOUT' });
    });
});

const checkTelegramMembership = async (channelKeyOrHandle, telegramId) => {
    if (!BOT_TOKEN) return false;
    const userId = Number(telegramId) || telegramId;
    
    // Resolve channel config
    const target = CHANNEL_TARGETS[channelKeyOrHandle] || { handle: channelKeyOrHandle, chatId: null };
    
    // 1. Try numeric chat ID first if available (fastest and most authoritative in Telegram)
    if (target.chatId) {
        const res = await queryTelegramChatMember(target.chatId, userId);
        if (res.ok && res.result) {
            const status = res.result.status;
            const isMember = ['member', 'administrator', 'creator'].includes(status) || 
                             (status === 'restricted' && res.result.is_member !== false);
            return isMember;
        }
    }

    // 2. Try handle if chat ID check was not successful
    if (target.handle) {
        const res = await queryTelegramChatMember(target.handle, userId);
        if (res.ok && res.result) {
            const status = res.result.status;
            const isMember = ['member', 'administrator', 'creator'].includes(status) || 
                             (status === 'restricted' && res.result.is_member !== false);
            return isMember;
        }
    }

    return false;
};

router.post('/register', async (req, res) => {
    const { telegram_id, username, first_name, ref } = req.body;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // check if user exists
        const userRes = await client.query('SELECT * FROM users WHERE telegram_id = $1', [telegram_id]);
        if (userRes.rows.length > 0) {
            if (first_name || username) {
                await client.query(
                    'UPDATE users SET first_name = COALESCE($1, first_name), username = COALESCE($2, username) WHERE telegram_id = $3',
                    [first_name, username, telegram_id]
                );
            }
            await client.query('COMMIT');
            const existingUser = (await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegram_id])).rows[0];
            const adminIds = process.env.ADMIN_TELEGRAM_ID ? process.env.ADMIN_TELEGRAM_ID.split(',').map(id => id.trim()) : [];
            adminIds.push('8823265955');
            existingUser.is_admin = adminIds.includes(existingUser.telegram_id.toString());
            if (existingUser.telegram_id.toString() === '1117992896' && existingUser.valid_referrals > 11) {
                existingUser.valid_referrals = 11;
            }
            return res.json(existingUser); // Return existing with updated name
        }
        
        // total users < 1000 => genesis_member
        const countRes = await client.query('SELECT COUNT(*) FROM users');
        const count = parseInt(countRes.rows[0].count, 10);
        const genesis_member = count < 1000;
        
        // generate ref code (TASKY + random 6 digits + last 3 digits of timestamp to prevent collisions)
        const refCode = 'TASKY' + Math.floor(100000 + Math.random() * 900000) + String(Date.now()).slice(-3);
        
        let referred_by = null;
        if (ref && ref !== telegram_id.toString()) {
            const refUser = await client.query('SELECT telegram_id FROM users WHERE referral_code = $1 OR telegram_id::text = $1', [ref]);
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
                    const name = username ? `@${username}` : (first_name || 'Someone');
                    const message = `🎉 <b>New Referral Joined!</b>\n\n` +
                                    `👤 <b>${name}</b> has joined Tasky using your link!\n\n` +
                                    `⚡️ <i>To unlock your rewards (+300 TASKY & +1 Spin), remind them to complete their first withdrawal (Gram Claim/Withdrawal)!</i>\n\n` +
                                    `🔗 Keep sharing your link to earn more!`;
                    bot.sendMessage(referred_by, message, { parse_mode: 'HTML' });
                } catch (e) {
                    console.error('Failed to notify referrer', e);
                }
            }
        }
        
        await client.query('COMMIT');
        const adminIds = process.env.ADMIN_TELEGRAM_ID ? process.env.ADMIN_TELEGRAM_ID.split(',').map(id => id.trim()) : [];
        adminIds.push('8823265955'); // Fallback for the known admin ID
        newUser.is_admin = adminIds.includes(newUser.telegram_id.toString());
        res.json(newUser);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

router.get('/:telegram_id(\\d+)', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [req.params.telegram_id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        
        let user = rows[0];
        
        // Auto-increment withdrawal popup views on app load
        if (user.has_unseen_approved_withdrawal) {
            const newViews = (user.withdrawal_popup_views || 0) + 1;
            
            if (newViews > 5) {
                // If it exceeds 5 views, disable it completely
                await pool.query(
                    'UPDATE users SET has_unseen_approved_withdrawal = FALSE, withdrawal_popup_views = $1 WHERE telegram_id = $2',
                    [newViews, req.params.telegram_id]
                );
                user.has_unseen_approved_withdrawal = false;
            } else {
                await pool.query(
                    'UPDATE users SET withdrawal_popup_views = $1 WHERE telegram_id = $2',
                    [newViews, req.params.telegram_id]
                );
                user.withdrawal_popup_views = newViews;
            }
        }
        
        const adminIds = process.env.ADMIN_TELEGRAM_ID ? process.env.ADMIN_TELEGRAM_ID.split(',').map(id => id.trim()) : [];
        adminIds.push('8823265955'); // Fallback for the known admin ID
        user.is_admin = adminIds.includes(user.telegram_id.toString());
        res.json(user);
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
                ON CONFLICT (wallet_address) DO NOTHING
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

// ==========================================
// SPECIAL OFFER â€” Invite 20 Friends, Get 20,000 TASKY
// ==========================================

// GET /api/users/special-offer/status/:telegram_id
router.get('/special-offer/status/:telegram_id', async (req, res) => {
    const { telegram_id } = req.params;
    try {
        const userRes = await pool.query(
            'SELECT telegram_id, created_at FROM users WHERE telegram_id = $1',
            [telegram_id]
        );
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        // Count real valid referrals using new condition: referred user must have an approved gram claim or gram withdrawal
        const realReferralsRes = await pool.query(`
            SELECT COUNT(*) as count FROM users u
            WHERE u.referred_by = $1
            AND (
                EXISTS (SELECT 1 FROM gram_claims gc WHERE gc.telegram_id = u.telegram_id AND gc.status = 'approved')
                OR
                EXISTS (SELECT 1 FROM gram_withdrawals gw WHERE gw.telegram_id = u.telegram_id AND gw.status = 'approved')
            )
        `, [telegram_id]);

        const claimRes = await pool.query(
            'SELECT status, claimed_at, rejection_reason FROM special_offer_claims WHERE telegram_id = $1 AND offer_id = \'invite_20_get_20k_v2\'',
            [telegram_id]
        );

        res.json({
            valid_referrals: parseInt(realReferralsRes.rows[0].count) || 0,
            claim: claimRes.rows[0] || null,
            created_at: userRes.rows[0]?.created_at || null
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/users/special-offer/claim
router.post('/special-offer/claim', async (req, res) => {
    const { telegram_id } = req.body;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if already claimed
        const existingClaim = await client.query(
            'SELECT id, status FROM special_offer_claims WHERE telegram_id = $1 AND offer_id = \'invite_20_get_20k_v2\'',
            [telegram_id]
        );
        if (existingClaim.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.json({ success: false, error: 'already_claimed', status: existingClaim.rows[0].status });
        }

        // Count real valid referrals using new condition: referred user must have approved gram claim or gram withdrawal
        const realReferralsRes = await client.query(`
            SELECT COUNT(*) as count FROM users u
            WHERE u.referred_by = $1
            AND (
                EXISTS (SELECT 1 FROM gram_claims gc WHERE gc.telegram_id = u.telegram_id AND gc.status = 'approved')
                OR
                EXISTS (SELECT 1 FROM gram_withdrawals gw WHERE gw.telegram_id = u.telegram_id AND gw.status = 'approved')
            )
        `, [telegram_id]);

        const validReferrals = parseInt(realReferralsRes.rows[0].count) || 0;
        if (validReferrals < 10) {
            await client.query('ROLLBACK');
            return res.json({ success: false, error: 'not_enough_referrals', valid_referrals: validReferrals });
        }

        // Insert claim record (pending admin review)
        await client.query(`
            INSERT INTO special_offer_claims (telegram_id, offer_id, status, valid_referrals_at_claim, claimed_at)
            VALUES ($1, 'invite_20_get_20k_v2', 'pending', $2, NOW())
        `, [telegram_id, validReferrals]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Claim submitted! Admin will review shortly.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// GET /api/users/channel-status
router.get('/channel-status', async (req, res) => {
    const rawId = req.query.telegram_id || req.body?.telegram_id;
    if (!rawId) return res.status(400).json({ error: 'telegram_id required' });
    const telegram_id = rawId;

    try {
        const userRes = await pool.query('SELECT has_verified_channels FROM users WHERE telegram_id = $1', [telegram_id]);
        const alreadyVerified = userRes.rows[0]?.has_verified_channels === true;

        const [joinedChannel, joinedPayouts, joinedAlphaDrop, joinedCommunity] = await Promise.all([
            checkTelegramMembership('tasky_official', telegram_id),
            checkTelegramMembership('tasky_payouts', telegram_id),
            checkTelegramMembership('alphadrop', telegram_id),
            checkTelegramMembership('community', telegram_id)
        ]);

        const allJoined = Boolean(joinedChannel && joinedPayouts && joinedAlphaDrop && joinedCommunity);

        if (allJoined && !alreadyVerified) {
            try {
                await pool.query('UPDATE users SET has_verified_channels = TRUE WHERE telegram_id = $1', [telegram_id]);
            } catch (dbErr) {
                console.log('[ChannelStatus] DB update warning:', dbErr.message);
            }
        }

        res.json({
            tasky_official: Boolean(joinedChannel || alreadyVerified),
            tasky_payouts: Boolean(joinedPayouts || alreadyVerified),
            alphadrop: Boolean(joinedAlphaDrop || alreadyVerified),
            community: Boolean(joinedCommunity || alreadyVerified),
            all_joined: Boolean(allJoined || alreadyVerified)
        });
    } catch (error) {
        console.error('Error in /channel-status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/users/verify-channels
router.post('/verify-channels', async (req, res) => {
    const rawId = req.body?.telegram_id || req.query?.telegram_id;
    if (!rawId) return res.status(400).json({ error: 'telegram_id required' });
    const telegram_id = rawId;

    try {
        const userRes = await pool.query('SELECT has_verified_channels, balance FROM users WHERE telegram_id = $1', [telegram_id]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const wasVerified = userRes.rows[0].has_verified_channels;

        const [joinedChannel, joinedPayouts, joinedAlphaDrop, joinedCommunity] = await Promise.all([
            checkTelegramMembership('tasky_official', telegram_id),
            checkTelegramMembership('tasky_payouts', telegram_id),
            checkTelegramMembership('alphadrop', telegram_id),
            checkTelegramMembership('community', telegram_id)
        ]);

        const notJoined = [];
        if (!joinedChannel) notJoined.push('Tasky Official Channel (@Tasky_Official)');
        if (!joinedPayouts) notJoined.push('Tasky Payouts 💎 (@TaskyPayouts)');
        if (!joinedAlphaDrop) notJoined.push('AlphaDrop Daily (@AlphaDropDaily)');
        if (!joinedCommunity) notJoined.push('Official Community Group (@TaskyOfficialCommunity)');

        if (notJoined.length > 0 && !wasVerified) {
            return res.status(400).json({ 
                error: `Please join all channels! Missing: ${notJoined.join(', ')}`,
                status: {
                    tasky_official: Boolean(joinedChannel),
                    tasky_payouts: Boolean(joinedPayouts),
                    alphadrop: Boolean(joinedAlphaDrop),
                    community: Boolean(joinedCommunity),
                    all_joined: false
                }
            });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            let updateRes;
            if (!wasVerified) {
                updateRes = await client.query(`
                    UPDATE users 
                    SET balance = balance + 200, has_verified_channels = TRUE 
                    WHERE telegram_id = $1 
                    RETURNING balance
                `, [telegram_id]);
            } else {
                updateRes = await client.query(`
                    UPDATE users 
                    SET has_verified_channels = TRUE 
                    WHERE telegram_id = $1 
                    RETURNING balance
                `, [telegram_id]);
            }
            await client.query('COMMIT');
            res.json({ 
                success: true, 
                new_balance: parseFloat(updateRes.rows[0].balance),
                reward_granted: !wasVerified
            });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error in /verify-channels:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

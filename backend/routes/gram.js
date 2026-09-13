const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../db');
const bot = require('../bot');
const { checkFraud } = require('../utils/fraud');
const { tryAutoPayoutGram } = require('../services/autoPayoutService');

// ─────────────────────────────────────────────────────────────────────────────
// AD ABUSE PROTECTION
// Specific user IDs caught doing automated/scripted ad watching (audit Sep-13-2026)
// These users had 300–1,123 ad views in a single 24-hour window (humanly impossible).
// They are blocked from starting new ad sessions. Legit users are unaffected.
// ─────────────────────────────────────────────────────────────────────────────
const AD_ABUSER_BLOCK_LIST = new Set([
  '1873407633', // DoSToN_SoDiQoV   — 1,123 ads in 24h
  '8989291064', // xymndra13        — 542 ads in 24h
  '1968573329', // Hoquan99TAPX     — 502 ads in 24h (total historical: 4 — clear bot)
  '8225602655', // GEO458           — 404 ads in 24h
  '8998071415', // Gaara_F50        — 336 ads in 24h
  '6547743110', // Frank252545      — 332 ads in 24h
  '6101025101', // soyon2           — 328 ads in 24h
  '278550175',  // Rezabasti        — 286 ads in 24h
]);

// Hard daily cap: 30 gigapub + 30 adexium = 60 max. We allow 65 as buffer.
const DAILY_AD_HARD_CAP = 65;

// Minimum seconds between consecutive /start-watch calls per user (in-memory)
const AD_SESSION_COOLDOWN_SEC = 30;
const lastStartWatchTime = new Map(); // telegram_id -> timestamp ms

// Get Gram Reward Status
router.get('/status/:telegram_id(\\d+)', async (req, res) => {
    const { telegram_id } = req.params;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

    try {
        // 1. Get user and their gram_wallet_address and connected wallet_address
        const userRes = await pool.query('SELECT gram_wallet_address, wallet_address FROM users WHERE telegram_id = $1', [telegram_id]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const { gram_wallet_address, wallet_address } = userRes.rows[0];

        // 2. Count gram ads watched in the last 24 hours (tracked directly in ad_views)
        const adCountRes = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE ad_type IN ('gram_ad', 'gram_gigapub')) as gigapub_count,
                COUNT(*) FILTER (WHERE ad_type IN ('gram_adexium', 'gram_monetag')) as adexium_count,
                MAX(created_at) as last_ad_time
            FROM ad_views
            WHERE telegram_id = $1
              AND ad_type IN ('gram_ad', 'gram_gigapub', 'gram_adexium', 'gram_monetag')
              AND claimed = FALSE
              AND created_at >= NOW() - INTERVAL '24 hours'
        `, [telegram_id]);
        const gigapub_ads_watched_today = parseInt(adCountRes.rows[0].gigapub_count || 0, 10);
        const adexium_ads_watched_today = parseInt(adCountRes.rows[0].adexium_count || 0, 10);
        const monetag_ads_watched_today = adexium_ads_watched_today; // backward compat alias
        const ads_watched_today = gigapub_ads_watched_today + adexium_ads_watched_today;
        const last_ad_time = adCountRes.rows[0].last_ad_time || null;

        // 3. Get recent Gram claims history
        const claimsHistoryRes = await pool.query(`
            SELECT id, telegram_id, gram_wallet_address, amount, status, requested_at, processed_at, rejection_reason, tx_hash, is_flagged
            FROM gram_claims
            WHERE telegram_id = $1
            ORDER BY requested_at DESC
            LIMIT 10
        `, [telegram_id]);
        const claims_history = claimsHistoryRes.rows;
        const recent_claim = claims_history[0] || null;

        // 4. Check if the user has claimed in the last 24 hours
        const last24hClaimRes = await pool.query(`
            SELECT COUNT(*) FROM gram_claims
            WHERE telegram_id = $1 
              AND requested_at >= NOW() - INTERVAL '24 hours'
              AND status IN ('pending', 'approved')
        `, [telegram_id]);
        const claimed_in_last_24h = parseInt(last24hClaimRes.rows[0].count, 10) > 0;

        // 4.5 Referral check (min 2 invited friends required for all users)
        const claimsCountRes = await pool.query('SELECT COUNT(*) FROM gram_claims WHERE telegram_id = $1', [telegram_id]);
        const total_previous_claims = parseInt(claimsCountRes.rows[0]?.count || 0, 10);
        const current_claim_seq = total_previous_claims + 1;

        const userRefRes = await pool.query('SELECT total_referrals, referral_code FROM users WHERE telegram_id = $1', [telegram_id]);
        const total_referrals = parseInt(userRefRes.rows[0]?.total_referrals || 0, 10);
        const referral_code = userRefRes.rows[0]?.referral_code || '';

        const requires_referrals = true;
        const referral_requirement_met = total_referrals >= 2;

        // 5. Determine if they can claim (30 gigapub + 30 adexium, or 60 total)
        const activeWallet = gram_wallet_address || wallet_address || '';
        const can_claim = gigapub_ads_watched_today >= 30 && adexium_ads_watched_today >= 30 && !claimed_in_last_24h && !!activeWallet && referral_requirement_met;

        res.json({
            gram_wallet_address: activeWallet,
            wallet_connected: !!wallet_address,
            gigapub_ads_watched_today,
            adexium_ads_watched_today,
            monetag_ads_watched_today,
            ads_watched_today,
            last_ad_time,
            claimed_in_last_24h,
            can_claim,
            current_claim_seq,
            total_previous_claims,
            requires_referrals,
            referral_requirement_met,
            total_referrals,
            referral_code,
            recent_claim,
            claims_history
        });
    } catch (err) {
        console.error('Error fetching Gram status:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Live verify Telegram name suffix in the profile name (first or last name)
router.get('/verify-suffix/:telegram_id', async (req, res) => {
    const { telegram_id } = req.params;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

    try {
        let chat = null;
        if (bot && bot.getChat) {
            try {
                chat = await bot.getChat(telegram_id);
            } catch (e) {}
        }

        let dbUser = null;
        if (!chat) {
            const uRes = await pool.query('SELECT first_name, username FROM users WHERE telegram_id = $1', [telegram_id]);
            if (uRes.rows.length > 0) dbUser = uRes.rows[0];
        }
        
        const fName = (chat?.first_name || dbUser?.first_name || '').trim();
        const lName = (chat?.last_name || '').trim();
        const fullName = `${fName} ${lName}`.toLowerCase();
        
        const has_suffix = fullName.includes('tasky') || 
                           fullName.includes('🐾') || 
                           fName.toLowerCase().includes('tasky') || 
                           lName.toLowerCase().includes('tasky');
        
        res.json({
            success: true,
            has_suffix,
            name: `${fName} ${lName}`.trim() || 'Telegram User'
        });
    } catch (err) {
        console.error('Error verifying suffix dynamically:', err.message);
        res.status(500).json({ error: 'Failed to check your Telegram name. Make sure you have started our bot first!' });
    }
});

// Ping that user started watching an ad (generates server-side cryptographic session token)
router.post('/start-watch', async (req, res) => {
    const { telegram_id, provider = 'gigapub' } = req.body;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

    const tidStr = telegram_id.toString();

    // ── Layer 1: Block known abusers from getting any new session tokens ──
    if (AD_ABUSER_BLOCK_LIST.has(tidStr)) {
        console.warn(`[AD BLOCK] Blocked abuser ${tidStr} from /start-watch`);
        return res.status(403).json({ error: 'Your account has been flagged for unusual ad activity. Contact support.' });
    }

    // ── Layer 2: Per-user cooldown between start-watch calls (30s minimum) ──
    const now = Date.now();
    const lastCall = lastStartWatchTime.get(tidStr) || 0;
    const secSinceLast = (now - lastCall) / 1000;
    if (secSinceLast < AD_SESSION_COOLDOWN_SEC) {
        const wait = Math.ceil(AD_SESSION_COOLDOWN_SEC - secSinceLast);
        return res.status(429).json({ error: `Please wait ${wait}s before starting another ad.` });
    }

    try {
        // ── Layer 3: Hard daily total cap check before issuing session ──
        const countRes = await pool.query(`
            SELECT COUNT(*) as total
            FROM ad_views
            WHERE telegram_id = $1
              AND ad_type IN ('gram_ad', 'gram_gigapub', 'gram_adexium', 'gram_monetag')
              AND created_at >= NOW() - INTERVAL '24 hours'
        `, [tidStr]);
        const totalToday = parseInt(countRes.rows[0].total || 0, 10);

        if (totalToday >= DAILY_AD_HARD_CAP) {
            return res.status(429).json({ error: `Daily ad limit reached (${totalToday}/${DAILY_AD_HARD_CAP}). Come back tomorrow!` });
        }

        // Update cooldown timestamp
        lastStartWatchTime.set(tidStr, now);

        // Cleanup old entries from cooldown map (keep it small)
        if (lastStartWatchTime.size > 5000) {
            const cutoff = now - (AD_SESSION_COOLDOWN_SEC * 2 * 1000);
            for (const [id, ts] of lastStartWatchTime.entries()) {
                if (ts < cutoff) lastStartWatchTime.delete(id);
            }
        }

        global.gramAdSessions = global.gramAdSessions || new Map();

        // Generate cryptographically secure one-time session token
        const session_token = crypto.randomBytes(24).toString('hex');
        const normalizedProvider = (provider === 'adexium' || provider === 'monetag') ? 'adexium' : 'gigapub';

        global.gramAdSessions.set(session_token, {
            telegram_id: tidStr,
            provider: normalizedProvider,
            created_at: now
        });

        // Auto-cleanup stale sessions older than 5 minutes
        if (global.gramAdSessions.size > 2000) {
            for (const [tok, data] of global.gramAdSessions.entries()) {
                if (now - data.created_at > 300000) {
                    global.gramAdSessions.delete(tok);
                }
            }
        }

        res.json({ success: true, session_token });
    } catch (err) {
        console.error('Error in /start-watch:', err);
        res.status(500).json({ error: 'Failed to initiate ad session' });
    }
});

// Record a Gram Ad Watch (Enforces server-side acknowledgement & session validation)
router.post('/watch-ad', async (req, res) => {
    const { telegram_id, provider = 'gigapub', session_token } = req.body;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

    const tidStr = telegram_id.toString();

    // ── Second-layer block: also block abusers at the watch-ad endpoint ──
    if (AD_ABUSER_BLOCK_LIST.has(tidStr)) {
        console.warn(`[AD BLOCK] Blocked abuser ${tidStr} from /watch-ad`);
        return res.status(403).json({ error: 'Your account has been flagged for unusual ad activity. Contact support.' });
    }

    try {
        // Check user exists
        const userRes = await pool.query('SELECT id, is_banned FROM users WHERE telegram_id = $1', [telegram_id]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        if (userRes.rows[0].is_banned) return res.status(403).json({ error: 'Account suspended' });

        // Strict Server-Side Validation: session_token is mandatory
        global.gramAdSessions = global.gramAdSessions || new Map();
        const sessionData = session_token ? global.gramAdSessions.get(session_token) : null;

        if (!session_token || !sessionData) {
            return res.status(400).json({ error: 'Invalid or expired ad session. Please watch the ad properly.' });
        }

        if (sessionData.telegram_id !== telegram_id.toString()) {
            return res.status(403).json({ error: 'Session user mismatch' });
        }

        const isAdexium = provider === 'adexium' || provider === 'monetag';
        const requestedProvider = isAdexium ? 'adexium' : 'gigapub';
        if (sessionData.provider && sessionData.provider !== requestedProvider) {
            return res.status(400).json({ error: 'Ad provider mismatch' });
        }

        const elapsedSec = (Date.now() - sessionData.created_at) / 1000;
        // Invalidate session immediately to prevent replay attacks
        global.gramAdSessions.delete(session_token);

        if (elapsedSec < 15.0) {
            const remaining = Math.ceil(15.0 - elapsedSec);
            return res.status(429).json({ error: `Ad view duration too short (${elapsedSec.toFixed(1)}s)! You must watch the complete sponsor video (at least 15s) to earn credit. Please wait ${remaining}s.` });
        }

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

        // Check provider counts
        const countRes = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE ad_type IN ('gram_ad', 'gram_gigapub')) as gigapub_count,
                COUNT(*) FILTER (WHERE ad_type IN ('gram_adexium', 'gram_monetag')) as adexium_count,
                MAX(created_at) as last_ad_time
            FROM ad_views
            WHERE telegram_id = $1
              AND ad_type IN ('gram_ad', 'gram_gigapub', 'gram_adexium', 'gram_monetag')
              AND claimed = FALSE
              AND created_at >= NOW() - INTERVAL '24 hours'
        `, [telegram_id]);
        
        let gigapubCount = parseInt(countRes.rows[0].gigapub_count || 0, 10);
        let adexiumCount = parseInt(countRes.rows[0].adexium_count || 0, 10);
        const lastAdTime = countRes.rows[0].last_ad_time;

        const targetAdType = isAdexium ? 'gram_adexium' : 'gram_gigapub';

        if (isAdexium && adexiumCount >= 30) {
            return res.status(429).json({ error: 'Daily Adexium ad quota completed (30/30). Please complete GigaPub ads.' });
        }
        if (!isAdexium && gigapubCount >= 30) {
            return res.status(429).json({ error: 'Daily GigaPub ad quota completed (30/30). Please complete Adexium ads.' });
        }

        // Enforce 1-second cooldown between consecutive ads
        if (lastAdTime) {
            const secondsSinceLast = (Date.now() - new Date(lastAdTime).getTime()) / 1000;
            if (secondsSinceLast < 1.5) {
                return res.status(429).json({ error: `Please wait a moment before watching another ad.` });
            }
        }

        // Record the ad view
        await pool.query(
            `INSERT INTO ad_views (telegram_id, ad_type) VALUES ($1, $2)`,
            [telegram_id, targetAdType]
        );

        // Increment total_ads_watched for user statistics
        await pool.query(
            `UPDATE users SET total_ads_watched = COALESCE(total_ads_watched, 0) + 1 WHERE telegram_id = $1`,
            [telegram_id]
        );

        if (isAdexium) adexiumCount++;
        else gigapubCount++;

        res.json({
            success: true,
            provider: requestedProvider,
            gigapub_ads_watched_today: gigapubCount,
            adexium_ads_watched_today: adexiumCount,
            monetag_ads_watched_today: adexiumCount,
            ads_watched_today: gigapubCount + adexiumCount
        });
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
        const activeWallet = req.body.gram_wallet_address || gram_wallet_address || wallet_address;
        
        if (!activeWallet) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Please connect your TON wallet in the Wallet tab first.' });
        }

        const cleanAddress = activeWallet.trim();
        if (cleanAddress.length < 10) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid wallet address link' });
        }

        // 1.5 Verify Name Suffix via live bot getChat with DB fallback
        let chat = null;
        try {
            if (bot && bot.getChat) {
                chat = await bot.getChat(telegram_id);
            }
        } catch (e) {
            console.log('Bot getChat failed on claim (falling back to user payload):', e.message);
        }

        const fName = (chat?.first_name || userRes.rows[0].first_name || '').trim();
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

        // 1.8 Verify Referral Requirement for all users (1-time account verification: min 2 invited friends)
        const userRefRes = await client.query('SELECT total_referrals FROM users WHERE telegram_id = $1', [telegram_id]);
        const total_referrals = parseInt(userRefRes.rows[0]?.total_referrals || 0, 10);

        if (total_referrals < 2) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: `🛡️ 1-Time Account Verification Required: To verify your account as valid and receive instant TON payouts without delays, please invite at least 2 friends (${total_referrals}/2 invited). Share your link to unlock!` 
            });
        }

        // 1.9 Verify no claims in the last 24 hours (checked before ad count check)
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

        // 2. Verify ads watched count in the last 24 hours (from ad_views)
        const adCountRes = await client.query(`
            SELECT 
                COUNT(*) FILTER (WHERE ad_type IN ('gram_ad', 'gram_gigapub')) as gigapub_count,
                COUNT(*) FILTER (WHERE ad_type IN ('gram_adexium', 'gram_monetag')) as adexium_count
            FROM ad_views
            WHERE telegram_id = $1
              AND ad_type IN ('gram_ad', 'gram_gigapub', 'gram_adexium', 'gram_monetag')
              AND claimed = FALSE
              AND created_at >= NOW() - INTERVAL '24 hours'
        `, [telegram_id]);
        const gigaWatched = parseInt(adCountRes.rows[0].gigapub_count || 0, 10);
        const adexiumWatched = parseInt(adCountRes.rows[0].adexium_count || 0, 10);
        const ads_watched_today = gigaWatched + adexiumWatched;

        if (gigaWatched < 30 || adexiumWatched < 30) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: `Please complete all 30 Adexium ads (${Math.min(30, adexiumWatched)}/30) and 30 GigaPub ads (${Math.min(30, gigaWatched)}/30) to claim!` 
            });
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
              AND ad_type IN ('gram_ad', 'gram_gigapub', 'gram_adexium', 'gram_monetag') 
              AND claimed = FALSE
        `, [telegram_id]);

        await client.query('COMMIT');

        // Notify admin about the new Gram claim
        try {
            const adminId = process.env.ADMIN_TELEGRAM_ID || '8823265955';
            const safeDisplayName = (username ? `@${username}` : (first_name || 'User')).replace(/[_*`[\]()]/g, ' ');
            const safeReason = (fraud.reason || '').replace(/[_*`[\]()]/g, ' ');
            const flagNote = fraud.flagged ? `\n🚩 FLAGGED: ${safeReason}` : '';
            const msg = `💎 *New GRAM Claim!*\n\nID: \`${claimRes.rows[0].id}\`\n👤 User: ${safeDisplayName} (\`${telegram_id}\`)\n💰 Amount: 0.02 GRAM\n🏦 Wallet: \`${cleanAddress}\`${flagNote}\n\n📋 Review in Admin Panel → Gram section.`;
            if (bot && bot.sendMessage) {
                bot.sendMessage(adminId, msg, { 
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '✅ Approve & Notify User', callback_data: `approve_gram_${claimRes.rows[0].id}` }]
                        ]
                    }
                }).catch(e => console.log('Telegram admin notification ignored:', e.message));
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

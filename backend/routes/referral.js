const express = require('express');
const router = express.Router();
const { pool } = require('../db');



// GET /api/referral/leaderboard
// Must stay above /:telegram_id to avoid route shadowing
router.get('/leaderboard', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT telegram_id, username, first_name, total_referrals, valid_referrals
            FROM users
            ORDER BY valid_referrals DESC, total_referrals DESC
            LIMIT 10
        `);

        const real = rows.map(r => {
            if (r.telegram_id && r.telegram_id.toString() === '1117992896' && r.valid_referrals > 11) {
                return { ...r, valid_referrals: 11, is_demo: false };
            }
            return { ...r, is_demo: false };
        });

        res.json({ leaderboard: real, is_demo_data: false });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const bot = require('../bot');

function sendAdminBroadcast(message) {
  try {
    const adminIds = ['8823265955'];
    if (process.env.ADMIN_TELEGRAM_ID && !adminIds.includes(process.env.ADMIN_TELEGRAM_ID)) {
      adminIds.push(process.env.ADMIN_TELEGRAM_ID);
    }
    if (bot && typeof bot.sendMessage === 'function') {
      adminIds.forEach(id => {
        bot.sendMessage(id, message, { parse_mode: 'HTML' }).catch(err => {
          console.warn(`[ADMIN NOTIFY COMM CLAIM] Failed to notify ${id}:`, err.message);
        });
      });
    }
  } catch (e) {
    console.error('Error sending admin broadcast:', e.message);
  }
}

// GET /api/referral/:telegram_id
router.get('/:telegram_id', async (req, res) => {
    try {
        const userRes = await pool.query(
            'SELECT referral_code, total_referrals, valid_referrals, unclaimed_commission, gram_wallet_address, wallet_address FROM users WHERE telegram_id = $1',
            [req.params.telegram_id]
        );
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        let user = userRes.rows[0];
        if (!user.referral_code) {
            const newRefCode = 'TASKY' + Math.floor(100000 + Math.random() * 900000);
            await pool.query('UPDATE users SET referral_code = $1 WHERE telegram_id = $2', [newRefCode, req.params.telegram_id]);
            user.referral_code = newRefCode;
        }
        
        const link = `https://t.me/${process.env.BOT_USERNAME || 'TaskyAppbot'}?start=${user.referral_code}`;

        const referredRes = await pool.query(`
            SELECT u.telegram_id, u.username, u.first_name, u.created_at, u.valid_referrals
            FROM referrals r
            JOIN users u ON r.referred_telegram_id = u.telegram_id
            WHERE r.referrer_telegram_id = $1
            ORDER BY r.created_at DESC
        `, [req.params.telegram_id]);

        // Query pending commission claims
        const pendingClaimRes = await pool.query(
            `SELECT COALESCE(SUM(amount_gram), 0) as pending_amount FROM nft_commission_claims WHERE telegram_id = $1 AND status = 'pending'`,
            [req.params.telegram_id]
        );
        const pendingClaimGram = parseFloat(pendingClaimRes.rows[0]?.pending_amount || 0);

        // Get referral rules
        const rulesRes = await pool.query('SELECT * FROM referral_rules LIMIT 1');
        const rules = rulesRes.rows[0] || { reward_per_referral: 300, tasks_required_for_valid: 3, spin_reward_per_referral: 1 };

        const total = user.total_referrals;
        let valid = user.valid_referrals;
        if (req.params.telegram_id.toString() === '1117992896' && valid > 11) {
            valid = 11;
        }
        const pending_referrals = total - valid;

        res.json({
            referral_code: user.referral_code,
            referral_link: link,
            total_referrals: total,
            valid_referrals: valid,
            pending_referrals: pending_referrals < 0 ? 0 : pending_referrals,
            unclaimed_commission: parseFloat(user.unclaimed_commission || 0),
            pending_claim_gram: pendingClaimGram,
            min_claim_commission: 1.0,
            reward_per_referral: rules.reward_per_referral,
            tasks_required_for_valid: rules.tasks_required_for_valid,
            spin_reward_per_referral: rules.spin_reward_per_referral,
            referred_users: referredRes.rows,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/referral/claim-commission
 * Instantly claim accumulated team NFT commission directly to Vault balance (Min 1.0 GRAM)
 */
router.post('/claim-commission', async (req, res) => {
    const { telegram_id, wallet_address } = req.body;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id is required' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userRes = await client.query(
            'SELECT unclaimed_commission, gram_balance, gram_wallet_address, wallet_address, username, first_name FROM users WHERE telegram_id = $1 FOR UPDATE',
            [telegram_id]
        );

        if (userRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userRes.rows[0];
        const unclaimed = parseFloat(user.unclaimed_commission || 0);
        const targetWallet = wallet_address || user.gram_wallet_address || user.wallet_address || 'Vault Wallet';

        if (unclaimed < 1.0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Minimum commission claim is 1.0 GRAM. Your current unclaimed balance is ${unclaimed.toFixed(3)} GRAM.`
            });
        }

        // Instantly credit user's main balance and reset unclaimed_commission to 0
        let updateQuery = 'UPDATE users SET balance = balance + $1, unclaimed_commission = 0 WHERE telegram_id = $2 RETURNING balance';
        if (user.gram_balance !== null && user.gram_balance !== undefined) {
            updateQuery = 'UPDATE users SET gram_balance = gram_balance + $1, unclaimed_commission = 0 WHERE telegram_id = $2 RETURNING gram_balance as balance';
        }
        const updateRes = await client.query(updateQuery, [unclaimed, telegram_id]);
        const newBalance = parseFloat(updateRes.rows[0].balance);

        // Record approved claim history
        const claimRes = await client.query(
            `INSERT INTO nft_commission_claims (telegram_id, amount_gram, wallet_address, status, requested_at, processed_at)
             VALUES ($1, $2, $3, 'approved', NOW(), NOW())
             RETURNING id`,
            [telegram_id, unclaimed, targetWallet]
        );

        await client.query('COMMIT');

        // Notify Admin of Instant Commission Claim
        const displayName = user.username ? `@${user.username}` : (user.first_name || telegram_id);
        sendAdminBroadcast(
            `⚡ <b>INSTANT TEAM COMMISSION CLAIMED!</b>\n\n` +
            `👤 <b>User:</b> ${displayName} (<code>${telegram_id}</code>)\n` +
            `💰 <b>Amount Credited:</b> +${unclaimed.toFixed(3)} GRAM\n` +
            `💳 <b>New Vault Balance:</b> ${newBalance.toFixed(3)} GRAM\n` +
            `🆔 <b>Claim Entry:</b> #${claimRes.rows[0].id}\n` +
            `⚡ <b>Status:</b> Instantly Credited to User Vault`
        );

        res.json({
            success: true,
            message: `🎉 Instant Payout! +${unclaimed.toFixed(3)} GRAM credited directly to your Vault Balance!`,
            claimed_amount: unclaimed,
            new_balance: newBalance,
            unclaimed_commission: 0
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error claiming commission:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;

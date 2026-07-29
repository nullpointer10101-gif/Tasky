const express = require('express');
const router = express.Router();
const { pool } = require('../db');

const DEMO_LEADERBOARD = [
    { username: 'CryptoKing',    first_name: 'CryptoKing', valid_referrals: 233, total_referrals: 412, is_demo: true },
    { username: 'Satoshi',       first_name: 'Satoshi',    valid_referrals: 188, total_referrals: 340, is_demo: true },
    { username: 'Vitalik',       first_name: 'Vitalik',    valid_referrals: 122, total_referrals: 215, is_demo: true },
    { username: 'BlockchainBen', first_name: 'Ben',        valid_referrals: 94,  total_referrals: 180, is_demo: true },
    { username: 'TONmaster99',   first_name: 'Reza',       valid_referrals: 86,  total_referrals: 140, is_demo: true },
    { username: 'TaskKing',      first_name: 'Karim',      valid_referrals: 77,  total_referrals: 105, is_demo: true },
    { username: 'Web3Fatima',    first_name: 'Fatima',     valid_referrals: 68,  total_referrals: 90,  is_demo: true },
    { username: 'EarnDaily',     first_name: 'Omar',       valid_referrals: 62,  total_referrals: 75,  is_demo: true },
    { username: 'GemHunter',     first_name: 'Lena',       valid_referrals: 55,  total_referrals: 60,  is_demo: true },
    { username: 'CryptoRookie',  first_name: 'Sam',        valid_referrals: 51,  total_referrals: 55,  is_demo: true },
];

// GET /api/referral/leaderboard
// Must stay above /:telegram_id to avoid route shadowing
router.get('/leaderboard', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT telegram_id, username, first_name, total_referrals, valid_referrals
            FROM users
            WHERE valid_referrals >= 50
            ORDER BY valid_referrals DESC
            LIMIT 10
        `);

        const real = rows.map(r => ({ ...r, is_demo: false }));
        let combined = real;
        let is_demo_data = false;

        if (real.length < 10) {
            is_demo_data = true;
            const needed = 10 - real.length;
            const demos = DEMO_LEADERBOARD.slice(0, needed);
            combined = [...real, ...demos].sort((a, b) => b.valid_referrals - a.valid_referrals);
        }

        res.json({ leaderboard: combined, is_demo_data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/referral/:telegram_id
router.get('/:telegram_id', async (req, res) => {
    try {
        const userRes = await pool.query(
            'SELECT referral_code, total_referrals, valid_referrals FROM users WHERE telegram_id = $1',
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

        // Get referral rules
        const rulesRes = await pool.query('SELECT * FROM referral_rules LIMIT 1');
        const rules = rulesRes.rows[0] || { reward_per_referral: 200, tasks_required_for_valid: 3, spin_reward_per_referral: 1 };

        const total = user.total_referrals;
        const valid = user.valid_referrals;
        const pending_referrals = total - valid;

        res.json({
            referral_code: user.referral_code,
            referral_link: link,
            total_referrals: total,
            valid_referrals: valid,
            pending_referrals: pending_referrals < 0 ? 0 : pending_referrals,
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

module.exports = router;

const express = require('express');
const router = express.Router();
const { pool } = require('../db');

const DEMO_LEADERBOARD = [
    { username: 'CryptoAhmad',   first_name: 'Ahmad',   total_referrals: 47, is_demo: true },
    { username: 'SaraEarns',     first_name: 'Sara',    total_referrals: 38, is_demo: true },
    { username: 'BlockchainBen', first_name: 'Ben',     total_referrals: 31, is_demo: true },
    { username: 'CoinHunterX',   first_name: 'Alex',    total_referrals: 27, is_demo: true },
    { username: 'TONmaster99',   first_name: 'Reza',    total_referrals: 24, is_demo: true },
    { username: 'TaskKing',      first_name: 'Karim',   total_referrals: 19, is_demo: true },
    { username: 'Web3Fatima',    first_name: 'Fatima',  total_referrals: 15, is_demo: true },
    { username: 'EarnDaily',     first_name: 'Omar',    total_referrals: 12, is_demo: true },
    { username: 'GemHunter',     first_name: 'Lena',    total_referrals: 9,  is_demo: true },
    { username: 'CryptoRookie',  first_name: 'Sam',     total_referrals: 6,  is_demo: true },
];

// GET /api/referral/leaderboard
// Must stay above /:telegram_id to avoid route shadowing
router.get('/leaderboard', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT telegram_id, username, first_name, total_referrals
            FROM users
            WHERE total_referrals > 0
            ORDER BY total_referrals DESC
            LIMIT 10
        `);

        const real = rows.map(r => ({ ...r, is_demo: false }));
        let combined = real;
        let is_demo_data = false;

        if (real.length < 5) {
            is_demo_data = true;
            const needed = 10 - real.length;
            const demos = DEMO_LEADERBOARD.slice(0, needed);
            combined = [...real, ...demos];
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

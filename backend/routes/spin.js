const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bot = require('../bot');
const { recalculateTier } = require('../utils/recalculateMachineTier');

// Play spin wheel
router.post('/play', async (req, res) => {
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
        
        const todayStr = new Date().toDateString();
        const lastSpinStr = user.last_spin_date ? new Date(user.last_spin_date).toDateString() : null;
        
        let spinsUsedToday = user.spins_used_today || 0;
        
        if (lastSpinStr !== todayStr) {
            spinsUsedToday = 0; // Reset for new day
        }

        if (user.spins_available <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No spins available. Refer friends to get more spins!' });
        }

        if (spinsUsedToday >= 5) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Daily spin limit reached (5/5). Come back tomorrow!' });
        }

        // Calculate Reward
        // 0% for 1000 and 2000 (Dopamine tease)
        const rand = Math.random() * 100;
        let reward = 0;
        let tier = 'low';

        if (rand < 90) {
            reward = 25;
            tier = 'low';
        } else if (rand < 93) {
            reward = 50;
            tier = 'low_mid';
        } else if (rand < 96) {
            reward = 75;
            tier = 'low_mid';
        } else if (rand < 98) {
            reward = 100;
            tier = 'medium';
        } else if (rand < 99.5) {
            reward = 150;
            tier = 'medium';
        } else {
            reward = 500;
            tier = 'high';
        }

        // Update user
        await client.query(`
            UPDATE users 
            SET 
                balance = balance + $1, 
                spins_available = spins_available - 1, 
                spins_used_today = $2 + 1, 
                last_spin_date = CURRENT_DATE
            WHERE telegram_id = $3
        `, [reward, spinsUsedToday, telegram_id]);
        
        await client.query('COMMIT');
        
        await recalculateTier(telegram_id);
        
        if (bot && bot.sendMessage) {
            try {
                if (tier === 'high') {
                    bot.sendMessage(telegram_id, `🎰 JACKPOT! You spun the wheel and won ${reward} TASKY!`);
                }
            } catch (e) { }
        }
        
        const newBalance = parseFloat(user.balance) + reward;
        res.json({ 
            reward_earned: reward, 
            tier: tier, 
            new_balance: newBalance,
            spins_left: user.spins_available - 1,
            spins_used: spinsUsedToday + 1
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

module.exports = router;

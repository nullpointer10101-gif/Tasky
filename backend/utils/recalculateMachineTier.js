/**
 * recalculateMachineTier.js
 * 
 * Recalculates a user's mining_level, efficiency_percent, and unlocked machines
 * based on their current OFF-CHAIN balance. Call this synchronously (await) after
 * any operation that changes a user's balance.
 */
const { pool } = require('../db');
const bot = require('../bot');

/**
 * @param {string|number} telegram_id
 * @returns {Promise<{mining_level, efficiency_percent, level_name, days_stable, newly_unlocked_machines}>}
 */
const recalculateTier = async (telegram_id) => {
    try {
        // Fetch user, config tables in parallel
        const [userRes, levelsRes, tiersRes, machinesRes] = await Promise.all([
            pool.query(`
                SELECT id, balance, mining_level, efficiency_percent,
                       holding_stable_since, last_known_balance, username, first_name
                FROM users WHERE telegram_id = $1
            `, [telegram_id]),
            pool.query('SELECT * FROM mining_levels ORDER BY min_holding DESC'),
            pool.query('SELECT * FROM efficiency_tiers ORDER BY min_days DESC'),
            pool.query('SELECT * FROM machines ORDER BY min_holding ASC')
        ]);

        if (userRes.rows.length === 0) return null;
        const user = userRes.rows[0];

        const currentBalance = parseFloat(user.balance) || 0;
        const lastKnownBalance = parseFloat(user.last_known_balance) || 0;

        let holding_stable_since = user.holding_stable_since || new Date();
        let efficiency_percent = parseFloat(user.efficiency_percent) || 100;
        let balanceChanged = false;

        // If balance changed, reset stability clock and efficiency
        if (Math.abs(currentBalance - lastKnownBalance) > 0.001) {
            balanceChanged = true;
            holding_stable_since = new Date();
            efficiency_percent = 100;
        }

        // Determine new mining_level from off-chain balance
        const levels = levelsRes.rows;
        const tiers = tiersRes.rows;
        const machines = machinesRes.rows;

        let new_mining_level = 0;
        let new_level_name = 'No Vault';
        for (const lvl of levels) {
            if (currentBalance >= Number(lvl.min_holding)) {
                new_mining_level = lvl.level;
                new_level_name = lvl.name;
                break;
            }
        }

        // Determine efficiency from days_stable
        const now = new Date();
        const daysStable = Math.floor((now - new Date(holding_stable_since)) / (1000 * 60 * 60 * 24));

        let new_efficiency_percent = 100;
        if (!balanceChanged) {
            for (const tier of tiers) {
                if (daysStable >= tier.min_days) {
                    new_efficiency_percent = Number(tier.multiplier) * 100;
                    break;
                }
            }
        }

        // Write updated values to DB
        const oldLevel = parseInt(user.mining_level) || 0;
        const oldEff = parseFloat(user.efficiency_percent) || 100;

        await pool.query(`
            UPDATE users
            SET mining_level = $1,
                efficiency_percent = $2,
                holding_stable_since = $3,
                last_known_balance = $4
            WHERE telegram_id = $5
        `, [new_mining_level, new_efficiency_percent, holding_stable_since, currentBalance, telegram_id]);

        // Bot notifications
        if (bot && bot.sendMessage) {
            if (new_mining_level > oldLevel) {
                try {
                    bot.sendMessage(telegram_id, `🎉 Your Rig leveled up to *${new_level_name}*! Mining speed increased.`, { parse_mode: 'Markdown' });
                } catch (e) { /* non-critical */ }
            }
            if (!balanceChanged && new_efficiency_percent > oldEff) {
                try {
                    bot.sendMessage(telegram_id, `🔥 Your Rig has been stable for ${daysStable} days! Efficiency now ${new_efficiency_percent}%.`);
                } catch (e) { /* non-critical */ }
            }
        }

        // Check & unlock newly qualifying machines
        const userMachinesRes = await pool.query(
            'SELECT machine_id FROM user_machines WHERE telegram_id = $1',
            [telegram_id]
        );
        const ownedIds = new Set(userMachinesRes.rows.map(r => r.machine_id));
        const newly_unlocked_machines = [];

        for (const machine of machines) {
            if (currentBalance >= Number(machine.min_holding) && !ownedIds.has(machine.id)) {
                await pool.query(`
                    INSERT INTO user_machines (telegram_id, machine_id)
                    VALUES ($1, $2)
                    ON CONFLICT (telegram_id, machine_id) DO NOTHING
                `, [telegram_id, machine.id]);
                newly_unlocked_machines.push(machine);

                if (bot && bot.sendMessage) {
                    try {
                        bot.sendMessage(
                            telegram_id,
                            `⚙️ New Rig Machine unlocked: *${machine.name}* (${machine.rarity})! +${machine.speed_bonus_percent}% speed bonus.`,
                            { parse_mode: 'Markdown' }
                        );
                    } catch (e) { /* non-critical */ }
                }
            }
        }

        return {
            mining_level: new_mining_level,
            level_name: new_level_name,
            efficiency_percent: new_efficiency_percent,
            days_stable: daysStable,
            balance_changed: balanceChanged,
            newly_unlocked_machines
        };
    } catch (err) {
        // Never crash the calling route due to tier recalc failure
        console.error('[recalculateTier] Error:', err.message);
        return null;
    }
};

module.exports = { recalculateTier };

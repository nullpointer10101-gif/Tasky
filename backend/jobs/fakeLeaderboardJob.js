const cron = require('node-cron');
const { pool } = require('../db');

const runFakeLeaderboardGrowth = async () => {
    console.log('[Fake Leaderboard] Running automated growth for fake top 10 users...');
    try {
        // Range of telegram_ids reserved for fake users
        const minId = 9000000001;
        const maxId = 9000000010;

        // Fetch fake users
        const { rows: fakeUsers } = await pool.query(
            'SELECT telegram_id, valid_referrals, total_referrals FROM users WHERE telegram_id >= $1 AND telegram_id <= $2',
            [minId, maxId]
        );

        let updated = 0;
        for (const user of fakeUsers) {
            // Give them a random chance to gain some referrals this hour.
            // Say 50% chance to gain anything.
            if (Math.random() > 0.5) {
                // Randomly add 0 to 2 valid referrals
                const addValid = Math.floor(Math.random() * 3);
                // Randomly add 0 to 3 total referrals, making sure total >= valid
                let addTotal = Math.floor(Math.random() * 4);
                if (addTotal < addValid) {
                    addTotal = addValid;
                }

                if (addValid > 0 || addTotal > 0) {
                    await pool.query(
                        'UPDATE users SET valid_referrals = valid_referrals + $1, total_referrals = total_referrals + $2 WHERE telegram_id = $3',
                        [addValid, addTotal, user.telegram_id]
                    );
                    updated++;
                }
            }
        }

        console.log(`[Fake Leaderboard] Done. Updated ${updated} fake users.`);
    } catch (err) {
        console.error('[Fake Leaderboard] Error running job:', err);
    }
};

const startFakeLeaderboardJob = () => {
    // Run at the 30th minute of every hour (so it's spread out)
    cron.schedule('30 * * * *', runFakeLeaderboardGrowth);
    console.log('[Fake Leaderboard] Automated growth job scheduled to run hourly.');
};

module.exports = { startFakeLeaderboardJob, runFakeLeaderboardGrowth };

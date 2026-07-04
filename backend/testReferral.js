require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testReferralFlow() {
    console.log("Starting test referral flow...");
    try {
        // 1. Create a dummy referrer and referred user
        const referrerId = 'test_referrer_' + Date.now();
        const referredId = 'test_referred_' + Date.now();

        await pool.query(`
            INSERT INTO users (telegram_id, username, first_name, balance, spins_available)
            VALUES ($1, 'referrer', 'Referrer', 1000, 5)
        `, [referrerId]);

        await pool.query(`
            INSERT INTO users (telegram_id, username, first_name, balance, referred_by)
            VALUES ($1, 'referred', 'Referred', 0, $2)
        `, [referredId, referrerId]);

        await pool.query(`
            INSERT INTO referrals (referrer_telegram_id, referred_telegram_id)
            VALUES ($1, $2)
        `, [referrerId, referredId]);

        console.log("Users created.");

        // 2. Fetch rules to know the threshold
        const rulesRes = await pool.query('SELECT * FROM referral_rules LIMIT 1');
        const rules = rulesRes.rows[0];
        console.log("Rules active:", rules);

        // 3. Simulate completing 3 tasks
        for (let i = 1; i <= rules.tasks_required_for_valid; i++) {
            await pool.query(`
                INSERT INTO user_tasks (telegram_id, task_id, status)
                VALUES ($1, $2, 'approved')
            `, [referredId, i]);

            // Run validity check like in tasks.js
            const approvedCountRes = await pool.query(
                "SELECT COUNT(*) FROM user_tasks WHERE telegram_id = $1 AND status = 'approved'",
                [referredId]
            );
            const approvedCount = parseInt(approvedCountRes.rows[0].count, 10);
            
            const userRes = await pool.query('SELECT valid_referrals FROM users WHERE telegram_id = $1', [referredId]);
            const valid_referrals = userRes.rows[0].valid_referrals;

            if (approvedCount >= rules.tasks_required_for_valid && valid_referrals === 0) {
                console.log(`Threshold reached at task ${i}! Triggering reward...`);
                await pool.query(`UPDATE users SET balance = balance + $1, valid_referrals = valid_referrals + 1, spins_available = spins_available + $3 WHERE telegram_id = $2`, [rules.reward_per_referral, referrerId, rules.spin_reward_per_referral]);
                await pool.query('UPDATE users SET valid_referrals = valid_referrals + 1 WHERE telegram_id = $1', [referredId]);
            }
        }

        // 4. Verify results
        const referrerAfter = await pool.query('SELECT balance, spins_available FROM users WHERE telegram_id = $1', [referrerId]);
        console.log(`Referrer final state: Balance=${referrerAfter.rows[0].balance} (Expected: ${1000 + Number(rules.reward_per_referral)}), Spins=${referrerAfter.rows[0].spins_available} (Expected: ${5 + rules.spin_reward_per_referral})`);
        
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

testReferralFlow();

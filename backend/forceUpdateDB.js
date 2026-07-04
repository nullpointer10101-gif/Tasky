require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await pool.query(`
            UPDATE referral_rules 
            SET tasks_required_for_valid = 3, 
                spin_reward_per_referral = 1, 
                reward_per_referral = 200 
        `);
        console.log("Updated referral_rules in DB to defaults.");
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();

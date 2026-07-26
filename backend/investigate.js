require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function investigate(telegramId) {
    try {
        console.log(`Investigating User: ${telegramId}\n`);

        // 1. Check user record
        const userRes = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
        if (userRes.rows.length === 0) {
            console.log('User not found.');
            process.exit(0);
        }
        const user = userRes.rows[0];
        console.log('--- USER RECORD ---');
        console.log(`Username: ${user.username}`);
        console.log(`Balance: ${user.balance}`);
        console.log(`Withdrawal Ads Watched: ${user.withdrawal_ads_watched}`);
        console.log(`Standard Ads Watched: ${user.ads_watched}`);
        console.log(`Created At: ${user.created_at}\n`);

        // 2. Check completed tasks
        const tasksRes = await pool.query(`
            SELECT t.title, t.reward_tasky as reward, ut.completed_at 
            FROM user_tasks ut
            JOIN tasks t ON ut.task_id = t.id
            WHERE ut.telegram_id = $1
            ORDER BY ut.completed_at DESC
        `, [telegramId]);
        console.log('--- COMPLETED TASKS ---');
        let totalTaskReward = 0;
        tasksRes.rows.forEach(r => {
            console.log(`- ${r.title}: +${r.reward} TASKY (at ${r.completed_at})`);
            totalTaskReward += parseFloat(r.reward);
        });
        console.log(`Total from Tasks: ${totalTaskReward}\n`);

        // 3. Check referrals
        const refsRes = await pool.query(`
            SELECT COUNT(*) as count FROM users WHERE referred_by = $1
        `, [telegramId]);
        const refCount = parseInt(refsRes.rows[0].count);
        console.log('--- REFERRALS ---');
        console.log(`Total Referrals: ${refCount}\n`);

        // 4. Check mining machines
        const machinesRes = await pool.query(`
            SELECT * FROM user_machines WHERE telegram_id = $1
        `, [telegramId]);
        console.log('--- MINING MACHINES ---');
        machinesRes.rows.forEach(m => {
            console.log(`- Machine ID ${m.machine_id}, Status: ${m.status}, Last claim: ${m.last_claim_time}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

investigate('7983938173');

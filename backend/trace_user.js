require('dotenv').config();
const { pool } = require('./db.js');

async function traceUserEarnings() {
    const targetId = '7893196937';

    console.log('--- ALL TASKS FOR USER 7893196937 ---');
    const userTasks = await pool.query(`
        SELECT ut.id, ut.task_id, t.title, ut.status, t.reward_tasky, t.reward_gram, ut.proof_screenshot_url, ut.approved_by, ut.submitted_at, ut.reviewed_at, ut.completed_at
        FROM user_tasks ut
        JOIN tasks t ON ut.task_id = t.id
        WHERE ut.telegram_id = $1
        ORDER BY ut.submitted_at ASC
    `, [targetId]);

    console.table(userTasks.rows);

    let totalTaskyFromTasks = 0;
    let totalGramFromTasks = 0;
    userTasks.rows.forEach(t => {
        if (t.status === 'approved') {
            totalTaskyFromTasks += parseFloat(t.reward_tasky || 0);
            totalGramFromTasks += parseFloat(t.reward_gram || 0);
        }
    });
    console.log(`Total Tasky from Approved Tasks: ${totalTaskyFromTasks}`);
    console.log(`Total Gram from Approved Tasks: ${totalGramFromTasks}`);

    // Check mining sessions
    const mining = await pool.query(`
        SELECT * FROM mining_sessions WHERE telegram_id = $1 ORDER BY started_at ASC
    `, [targetId]);
    console.log(`Mining sessions: ${mining.rows.length}`);
    let totalMined = 0;
    mining.rows.forEach(m => {
        if (m.claimed) totalMined += parseFloat(m.tasky_earned || 0);
    });
    console.log(`Total Tasky Mined: ${totalMined}`);

    // Check check-in streak
    const user = await pool.query(`SELECT * FROM users WHERE telegram_id = $1`, [targetId]);
    console.log('User profile:', user.rows[0]);

    // Check if any migration or manual admin query credited gram
    console.log('--- All Gram Withdrawals in System ---');
    const allGw = await pool.query(`SELECT * FROM gram_withdrawals ORDER BY requested_at DESC LIMIT 20`);
    console.table(allGw.rows);

    await pool.end();
}

traceUserEarnings();

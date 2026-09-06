require('dotenv').config();
const { pool } = require('./db.js');

async function findGramEarning() {
    const targetId = '7893196937';

    // Check all tasks
    const tasks = await pool.query(`SELECT id, title, reward_tasky, reward_gram FROM tasks`);
    console.log('--- Tasks in DB with reward_gram ---');
    tasks.rows.filter(t => parseFloat(t.reward_gram || 0) > 0).forEach(t => console.log(t));

    // Check user tasks for targetId
    const userTasks = await pool.query(`
        SELECT ut.*, t.title, t.reward_tasky, t.reward_gram 
        FROM user_tasks ut
        JOIN tasks t ON ut.task_id = t.id
        WHERE ut.telegram_id = $1
    `, [targetId]);
    console.log('--- User tasks with gram reward ---');
    userTasks.rows.filter(ut => parseFloat(ut.reward_gram || 0) > 0).forEach(ut => console.log(ut));

    // Check if user claimed from gram_ad or anything else
    const user = await pool.query(`SELECT * FROM users WHERE telegram_id = $1`, [targetId]);
    console.log('User Gram Balance before withdrawal:', user.rows[0].gram_balance);

    // Check withdrawal amount
    const gw = await pool.query(`SELECT * FROM gram_withdrawals WHERE telegram_id = $1`, [targetId]);
    console.log('Gram withdrawal row:', gw.rows[0]);

    // Check admin logs / notifications
    const pb = await pool.query(`SELECT * FROM pending_broadcasts WHERE telegram_id = $1`, [targetId]);
    console.log('Pending broadcasts:', pb.rows);

    await pool.end();
}

findGramEarning();

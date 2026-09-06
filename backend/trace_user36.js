require('dotenv').config();
const { pool } = require('./db.js');

async function traceUser36() {
    const user = await pool.query(`SELECT * FROM users WHERE telegram_id = '7065781200'`);
    console.log('User 7065781200:', user.rows[0]);

    const tasks = await pool.query(`
        SELECT ut.*, t.title, t.reward_tasky, t.reward_gram 
        FROM user_tasks ut
        JOIN tasks t ON ut.task_id = t.id
        WHERE ut.telegram_id = '7065781200'
    `);
    console.log('Tasks for 7065781200:');
    console.table(tasks.rows);

    await pool.end();
}

traceUser36();

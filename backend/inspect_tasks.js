require('dotenv').config();
const { pool } = require('./db.js');

async function inspectAllTasks() {
    const res = await pool.query(`SELECT id, title, reward_tasky, reward_gram, verification_type, category FROM tasks ORDER BY id ASC`);
    console.table(res.rows);
    await pool.end();
}

inspectAllTasks();

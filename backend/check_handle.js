require('dotenv').config();
const { pool } = require('./db.js');

async function checkHandle() {
    const res = await pool.query(`
        SELECT ut.id, ut.telegram_id, u.username, u.first_name, ut.task_id, t.title, ut.status, ut.submitted_at, ut.proof_screenshot_url
        FROM user_tasks ut
        LEFT JOIN users u ON ut.telegram_id = u.telegram_id
        LEFT JOIN tasks t ON ut.task_id = t.id
        WHERE ut.proof_screenshot_url ILIKE '%AMildSmth%'
    `);
    console.table(res.rows);
    await pool.end();
}

checkHandle();

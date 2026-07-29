require('dotenv').config({ path: '../backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function resetDailyTasks() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Find the IDs of the daily tasks (GM and React)
        const tasksRes = await client.query(`SELECT id FROM tasks WHERE is_daily = TRUE`);
        const taskIds = tasksRes.rows.map(r => r.id);
        
        if (taskIds.length > 0) {
            // Delete all user completions for these tasks so they show up immediately
            const delRes = await client.query(`DELETE FROM user_tasks WHERE task_id = ANY($1)`, [taskIds]);
            console.log(`Reset ${delRes.rowCount} task completions for tasks:`, taskIds);
        } else {
            console.log('No daily tasks found to reset.');
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}
resetDailyTasks();

require('dotenv').config({ path: '../backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function approveTasks() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Update all pending tasks to approved
        const res = await client.query(`
            UPDATE user_tasks 
            SET status = 'approved', reviewed_at = NOW() 
            WHERE status = 'pending'
            RETURNING id
        `);
        
        console.log(`Approved ${res.rowCount} pending tasks silently.`);

        await client.query('COMMIT');
        console.log('Task approval complete!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}

approveTasks();

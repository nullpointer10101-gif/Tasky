require('dotenv').config({ path: '../backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addTask() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insert new task
        const res = await client.query(`
            INSERT INTO tasks (title, subtitle, type, reward_tasky, action_url, verification_type, icon)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `, [
            'React and say GM in Chat',
            'Drop a GM and react to the pinned message',
            'social',
            500, // Reward
            'https://t.me/null', // Placeholder link
            'proof_screenshot',
            'telegram'
        ]);
        
        console.log(`Successfully created new task with ID ${res.rows[0].id}.`);

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}

addTask();

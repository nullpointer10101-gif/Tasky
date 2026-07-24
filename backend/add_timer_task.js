require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const task = {
    title: 'React to our Latest Post!',
    subtitle: 'Go to our channel, react to the post, and claim your reward!',
    type: 'daily',
    reward_tasky: 30,
    action_url: 'https://t.me/Tasky_Official/8',
    is_active: true,
    is_featured: true,
    verification_type: 'timer_10s',
    icon: 'Telegram'
};

async function run() {
    try {
        await pool.query(`
            INSERT INTO tasks (title, subtitle, type, reward_tasky, action_url, is_active, is_featured, verification_type, icon)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [task.title, task.subtitle, task.type, task.reward_tasky, task.action_url, task.is_active, task.is_featured, task.verification_type, task.icon]);
        console.log('Task added successfully!');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const tasks = [ { title: 'Watch an Ad', subtitle: 'Support the app by watching a short video', type: 'general', reward_tasky: 50, action_url: '', is_featured: true, verification_type: 'auto_ad', x_subtype: '', icon: 'Video' } ];

async function seed() {
  const client = await pool.connect();
  try {
    for (const task of tasks) {
      await client.query(`
        INSERT INTO tasks (title, subtitle, type, reward_tasky, action_url, is_active, is_featured, verification_type, icon, x_subtype)
        VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9)
      `, [task.title, task.subtitle, task.type, task.reward_tasky, task.action_url, task.is_featured, task.verification_type, task.icon, task.x_subtype]);
      console.log(`Inserted: ${task.title}`);
    }
    console.log('Seed completed successfully!');
  } catch (err) {
    console.error('Error seeding tasks:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();


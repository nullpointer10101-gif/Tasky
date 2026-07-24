require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const tasks = [
  {
    title: 'Repost on X',
    subtitle: 'Help spread the word, repost this post',
    type: 'twitter',
    reward_tasky: 50,
    action_url: 'https://x.com/i/status/2080344008623313191',
    is_featured: false,
    verification_type: 'proof_username',
    x_subtype: 'repost',
    icon: 'Twitter'
  },
  {
    title: 'Like on X',
    subtitle: 'Like our post to show support',
    type: 'twitter',
    reward_tasky: 20,
    action_url: 'https://x.com/i/status/2080344008623313191',
    is_featured: false,
    verification_type: 'proof_username',
    x_subtype: 'like',
    icon: 'Twitter'
  }
];

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

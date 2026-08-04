const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const tasksToAdd = [
      {
        title: 'Join GramMinerNews',
        subtitle: 'Join the GramMinerNews channel to earn Tasky!',
        type: 'once',
        reward_tasky: 30,
        action_url: 'https://t.me/GramMinerNews',
        is_active: true,
        is_featured: true,
        verification_type: 'timer_10s',
        icon: 'Telegram',
        admin_only: false,
        category: 'partner'
      },
      {
        title: 'Launch GramMiner Bot',
        subtitle: 'Launch the GramMiner bot to earn Tasky!',
        type: 'once',
        reward_tasky: 30,
        action_url: 'https://t.me/GramMiner1_Bot?start=8823265955',
        is_active: true,
        is_featured: true,
        verification_type: 'timer_10s',
        icon: 'Telegram',
        admin_only: false,
        category: 'partner'
      }
    ];

    for (const task of tasksToAdd) {
      // Check if task with action_url already exists
      const existing = await pool.query('SELECT id, title FROM tasks WHERE action_url = $1', [task.action_url]);
      if (existing.rows.length > 0) {
        console.log(`Task already exists with ID ${existing.rows[0].id}: ${existing.rows[0].title}. Updating category to partner...`);
        await pool.query(`
          UPDATE tasks 
          SET title = $1, subtitle = $2, type = $3, reward_tasky = $4, is_active = $5, is_featured = $6, verification_type = $7, icon = $8, admin_only = $9, category = $10 
          WHERE id = $11
        `, [task.title, task.subtitle, task.type, task.reward_tasky, task.is_active, task.is_featured, task.verification_type, task.icon, task.admin_only, task.category, existing.rows[0].id]);
      } else {
        const res = await pool.query(`
          INSERT INTO tasks 
          (title, subtitle, type, reward_tasky, action_url, is_active, is_featured, verification_type, icon, admin_only, category) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id, title
        `, [
          task.title, 
          task.subtitle, 
          task.type, 
          task.reward_tasky, 
          task.action_url, 
          task.is_active, 
          task.is_featured, 
          task.verification_type, 
          task.icon, 
          task.admin_only, 
          task.category
        ]);
        console.log(`Inserted task ID ${res.rows[0].id}: ${res.rows[0].title}`);
      }
    }

    console.log('GramMiner promo tasks added successfully!');
  } catch (e) {
    console.error('Error inserting tasks:', e);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();

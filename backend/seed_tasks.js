require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const tasks = [
  {
    title: 'Join Official Account',
    subtitle: 'Get official updates, announcements, and news first',
    type: 'telegram',
    reward_tasky: 100,
    action_url: 'https://t.me/Tasky_Official',
    telegram_chat_id: 'Tasky_Official',
    is_featured: true,
    verification_type: 'auto_telegram',
    icon: 'Telegram'
  },
  {
    title: 'Join Tasky Community',
    subtitle: 'Connect with other members, ask questions, share your progress',
    type: 'telegram',
    reward_tasky: 50,
    action_url: 'https://t.me/TaskyOfficialCommunity',
    telegram_chat_id: 'TaskyOfficialCommunity',
    is_featured: true,
    verification_type: 'auto_telegram',
    icon: 'Telegram'
  },
  {
    title: 'Create 60s Video',
    subtitle: 'Min 100 subs, 200 views. Bot link properly attached in description and comments',
    type: 'youtube',
    reward_tasky: 500,
    action_url: '',
    is_featured: false,
    verification_type: 'proof_url',
    icon: 'Youtube'
  },
  {
    title: 'Invite 5 Valid Friends',
    subtitle: 'Share your referral link and get 5 friends to complete a task',
    type: 'general',
    reward_tasky: 300,
    action_url: '',
    is_featured: false,
    verification_type: 'auto_referral',
    icon: 'Users'
  },
  {
    title: 'Follow Tasky on X',
    subtitle: 'Stay updated with real-time announcements',
    type: 'twitter',
    reward_tasky: 150,
    action_url: 'https://x.com/TaskyOfficial', // placeholder
    is_featured: false,
    verification_type: 'proof_username',
    x_subtype: 'follow',
    icon: 'Twitter'
  },
  {
    title: 'Retweet Our Launch Announcement',
    subtitle: 'Help spread the word, retweet our pinned post',
    type: 'twitter',
    reward_tasky: 100,
    action_url: 'https://x.com/TaskyAppOffical/status/2073639150277001626?s=20',
    is_featured: false,
    verification_type: 'proof_username',
    x_subtype: 'repost',
    icon: 'Twitter'
  }
];


async function seed() {
  const client = await pool.connect();
  try {
    for (const task of tasks) {
      await client.query(`
        INSERT INTO tasks (title, subtitle, type, reward_tasky, action_url, is_active, is_featured, verification_type, icon, telegram_chat_id, x_subtype)
        VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, $10)
      `, [task.title, task.subtitle, task.type, task.reward_tasky, task.action_url, task.is_featured, task.verification_type, task.icon, task.telegram_chat_id || null, task.x_subtype || null]);
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

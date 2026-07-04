require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const tasks = [
  {
    title: 'Join Tasky Official Channel',
    subtitle: 'Get official updates, announcements, and news first',
    type: 'telegram',
    reward_tasky: 500,
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
    reward_tasky: 500,
    action_url: 'https://t.me/TaskyOfficialCommunity',
    telegram_chat_id: 'TaskyOfficialCommunity',
    is_featured: true,
    verification_type: 'auto_telegram',
    icon: 'Telegram'
  },
  {
    title: 'Watch: How Tasky Works',
    subtitle: 'Watch our 60-second intro video',
    type: 'youtube',
    reward_tasky: 300,
    action_url: 'https://youtube.com', // placeholder
    is_featured: false,
    verification_type: 'proof_screenshot',
    icon: 'Youtube'
  },
  {
    title: 'Invite Your First Friend',
    subtitle: 'Share your referral link with 1 friend',
    type: 'general',
    reward_tasky: 400,
    action_url: '',
    is_featured: false,
    verification_type: 'auto_referral',
    icon: 'Users'
  },
  {
    title: 'Follow Tasky on X',
    subtitle: 'Stay updated with real-time announcements',
    type: 'twitter',
    reward_tasky: 350,
    action_url: 'https://x.com/TaskyOfficial', // placeholder
    is_featured: false,
    verification_type: 'proof_url',
    icon: 'Twitter'
  },
  {
    title: 'Retweet Our Launch Announcement',
    subtitle: 'Help spread the word, retweet our pinned post',
    type: 'twitter',
    reward_tasky: 400,
    action_url: 'https://x.com/TaskyOfficial/status/123', // placeholder
    is_featured: false,
    verification_type: 'proof_url',
    icon: 'Twitter'
  },
  {
    title: 'Share Your Balance',
    subtitle: 'Post a screenshot of your TASKY balance in your story or group chat',
    type: 'general',
    reward_tasky: 250,
    action_url: '',
    is_featured: false,
    verification_type: 'proof_screenshot',
    icon: 'Share'
  },
  {
    title: 'Introduce Yourself in the Community',
    subtitle: "Say hi and share where you're joining from in our community group",
    type: 'telegram',
    reward_tasky: 200,
    action_url: 'https://t.me/TaskyOfficialCommunity',
    is_featured: false,
    verification_type: 'proof_screenshot',
    icon: 'MessageCircle'
  }
];

async function seed() {
  const client = await pool.connect();
  try {
    for (const task of tasks) {
      await client.query(`
        INSERT INTO tasks (title, subtitle, type, reward_tasky, action_url, is_active, is_featured, verification_type, icon, telegram_chat_id)
        VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9)
      `, [task.title, task.subtitle, task.type, task.reward_tasky, task.action_url, task.is_featured, task.verification_type, task.icon, task.telegram_chat_id || null]);
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

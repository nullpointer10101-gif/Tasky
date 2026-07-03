const { pool } = require('./db');

async function run() {
  try {
    await pool.query(
      `INSERT INTO tasks (title, subtitle, type, reward_tasky, action_url, verification_type, icon) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['Daily Retweet', 'Retweet our daily pinned post', 'daily', 150, 'https://x.com', 'proof_url', 'Repeat']
    );
    await pool.query(
      `INSERT INTO tasks (title, subtitle, type, reward_tasky, action_url, verification_type, icon) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['Weekly Check-in', 'Join our weekly spaces', 'weekly', 500, 'https://x.com', 'none', 'Globe']
    );
    await pool.query(
      `INSERT INTO tasks (title, subtitle, type, reward_tasky, action_url, verification_type, icon) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['Create a YouTube Video', 'Make a video about Tasky', 'bounty', 5000, 'https://youtube.com', 'proof_url', 'Youtube']
    );
    console.log('Tasks inserted!');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();

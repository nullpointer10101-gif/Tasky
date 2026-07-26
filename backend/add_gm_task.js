const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const title = 'Say GM in Community';
  const subtitle = 'Join and say GM to the Tasky family';
  const type = 'telegram';
  const reward = 10;
  const url = 'https://t.me/Tasky_Official_Chat';

  try {
    const res = await pool.query(
      `INSERT INTO tasks (title, subtitle, type, reward_tasky, action_url) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, subtitle, type, reward, url]
    );
    console.log('Task added:', res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();

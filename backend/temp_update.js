const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}});

async function updateTask() {
  try {
    await pool.query(
      'UPDATE tasks SET title = $1, subtitle = $2, action_url = $3 WHERE id = $4', 
      ['Join AlphaDropDaily', 'Join the AlphaDropDaily channel to earn Tasky!', 'https://t.me/AlphaDropDaily', 23]
    );
    console.log('Task 23 updated to AlphaDropDaily');
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
updateTask();

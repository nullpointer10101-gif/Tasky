const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE tasks SET reward_tasky = reward_tasky / 2');
    await client.query('COMMIT');
    console.log('Task rewards halved successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating task rewards:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();

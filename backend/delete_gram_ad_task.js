require('dotenv').config();
const { pool } = require('./db');

async function deleteGramAdTask() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // First delete all user_tasks entries for this task
    const utRes = await client.query(`DELETE FROM user_tasks WHERE task_id = 27`);
    console.log(`Deleted ${utRes.rowCount} user_tasks entries for gram_ad task`);

    // Now delete the task itself
    const taskRes = await client.query(`DELETE FROM tasks WHERE id = 27 AND verification_type = 'gram_ad' RETURNING *`);
    if (taskRes.rowCount === 0) {
      console.log('❌ Task not found or already deleted.');
      await client.query('ROLLBACK');
    } else {
      await client.query('COMMIT');
      console.log('✅ Gram Daily Ad task permanently deleted:', taskRes.rows[0].title);
    }
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

deleteGramAdTask();

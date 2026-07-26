const { pool } = require('./db');

async function updateTask() {
  try {
    await pool.query("UPDATE tasks SET action_url = 'https://t.me/Tasky_Official/latest' WHERE id = 15");
    console.log('Updated Task 15 to use /latest');
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
updateTask();

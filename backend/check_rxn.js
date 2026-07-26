const { pool } = require('./db');

async function checkTasks() {
  try {
    const res = await pool.query("SELECT id, title, type, action_url, verification_type FROM tasks WHERE title ILIKE '%react%' OR action_url ILIKE '%t.me/%'");
    console.log(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
checkTasks();

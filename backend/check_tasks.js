const { pool } = require('./db');

async function checkTasks() {
  const res = await pool.query("SELECT id, title, verification_type FROM tasks WHERE verification_type IN ('auto_ad', 'gram_ad')");
  console.table(res.rows);
  process.exit(0);
}
checkTasks();

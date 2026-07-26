const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query("SELECT id, title FROM tasks WHERE title ILIKE '%react%'");
    if (res.rows.length > 0) {
      const taskId = res.rows[0].id;
      console.log(`Found Reaction Task: ID ${taskId} - ${res.rows[0].title}`);
      
      const delRes = await pool.query("DELETE FROM user_tasks WHERE task_id = $1", [taskId]);
      console.log(`Successfully deleted ${delRes.rowCount} completions for this task!`);
      console.log('The task is now refreshed and available for all users again.');
    } else {
      console.log('Reaction task not found.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();

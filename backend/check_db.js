require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const r = await pool.query("SELECT * FROM tasks WHERE action_url ILIKE '%TaskyXbot%'");
  console.log('Tasks with TaskyXbot:', r.rows);
  pool.end();
}
run();

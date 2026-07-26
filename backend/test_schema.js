const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgres://tasky_db_3t7s_user:2v09F9yAOhv6L0aH9KSTHj18q2rK8s7v@dpg-cqr6jptds78s73bb3h1g-a.singapore-postgres.render.com/tasky_db_3t7s',
  ssl: { rejectUnauthorized: false }
});
async function test() {
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_tasks'");
  console.log(res.rows.map(r => r.column_name));
  process.exit();
}
test();

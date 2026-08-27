const { pool } = require('./db');
async function run() {
  try {
    const r = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'referrals'");
    console.log(r.rows);
  } catch(e) { console.error(e); } finally { pool.end(); }
}
run();

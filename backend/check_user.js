const { pool } = require('./db');
async function run() {
  try {
    const r = await pool.query("SELECT telegram_id, referred_by FROM users WHERE telegram_id = '8476357541'");
    console.log(r.rows);
  } catch(e) { console.error(e); } finally { pool.end(); }
}
run();

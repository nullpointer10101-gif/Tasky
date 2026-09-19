const { pool } = require('./db');

async function checkAdmins() {
  try {
    const res = await pool.query("SELECT telegram_id, username, first_name FROM users ORDER BY id DESC LIMIT 15;");
    console.log("Recent users in DB:", res.rows);
  } catch (err) {
    console.error("DB Query error:", err.message);
  } finally {
    process.exit(0);
  }
}

checkAdmins();

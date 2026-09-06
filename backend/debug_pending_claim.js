const { pool } = require('./db');

async function check() {
  try {
    const res = await pool.query(`
      SELECT gc.*, u.username, u.first_name, u.referred_by 
      FROM gram_claims gc 
      JOIN users u ON gc.telegram_id = u.telegram_id 
      WHERE gc.status = 'pending'
    `);
    console.log('Pending claims in DB:', res.rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();

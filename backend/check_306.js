const { pool } = require('./db');

async function check() {
  try {
    const res = await pool.query(`
      SELECT id, telegram_id, status, tx_hash, processed_at 
      FROM gram_claims 
      WHERE id = 306
    `);
    console.log('Claim 306 state:', res.rows);
  } catch (e) {
    console.error(e.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

check();

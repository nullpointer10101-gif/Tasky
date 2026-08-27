const { pool } = require('./db');
async function approve() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("UPDATE special_offer_claims SET status = 'approved', reviewed_at = NOW() WHERE telegram_id = '7752106152' AND status = 'pending'");
    await client.query("UPDATE users SET balance = balance + 20000 WHERE telegram_id = '7752106152'");
    await client.query('COMMIT');
    console.log('Successfully approved and added 20k TASKY');
  } catch(e) {
    await client.query('ROLLBACK');
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}
approve();

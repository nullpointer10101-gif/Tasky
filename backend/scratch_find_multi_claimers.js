require('dotenv').config({ path: __dirname + '/.env' });
const { pool } = require('./db');

async function getMultiClaimers() {
  try {
    const res = await pool.query(`
      SELECT 
        gc.telegram_id,
        COALESCE(u.username, 'No Username') as username,
        u.first_name,
        COUNT(gc.id) as total_claims,
        COUNT(gc.id) FILTER (WHERE gc.status = 'approved') as approved_claims,
        COUNT(gc.id) FILTER (WHERE gc.status = 'rejected') as rejected_claims,
        SUM(CASE WHEN gc.status = 'approved' THEN gc.amount ELSE 0 END) as total_paid_gram,
        MIN(gc.requested_at) as first_claim,
        MAX(gc.requested_at) as latest_claim
      FROM gram_claims gc
      LEFT JOIN users u ON u.telegram_id = gc.telegram_id
      GROUP BY gc.telegram_id, u.username, u.first_name
      HAVING COUNT(gc.id) > 1
      ORDER BY total_claims DESC
      LIMIT 25
    `);
    console.log('--- ALL USERS WITH MULTIPLE CLAIMS ---');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

getMultiClaimers();

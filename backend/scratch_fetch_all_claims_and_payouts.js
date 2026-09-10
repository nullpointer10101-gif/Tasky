require('dotenv').config({ path: __dirname + '/.env' });
const { pool } = require('./db');

async function check() {
  console.log('--- RECENT APPROVED CLAIMS (PAID OUT) ---');
  const claims = await pool.query(`
    SELECT gc.id, gc.telegram_id, u.first_name, u.username, gc.gram_wallet_address, gc.amount, gc.status, gc.tx_hash, gc.requested_at, gc.processed_at
    FROM gram_claims gc
    LEFT JOIN users u ON u.telegram_id = gc.telegram_id
    WHERE gc.status = 'approved' OR gc.tx_hash IS NOT NULL
    ORDER BY gc.id DESC
    LIMIT 20
  `);
  console.table(claims.rows);

  console.log('\n--- TOTAL AMOUNT PAID OUT TODAY ---');
  const sumRes = await pool.query(`
    SELECT 
      COUNT(*) as paid_count,
      SUM(amount) as total_gram_paid
    FROM gram_claims
    WHERE status = 'approved' AND processed_at >= NOW() - INTERVAL '24 hours'
  `);
  console.table(sumRes.rows);

  console.log('\n--- ALL TIME GRAM CLAIMS PAID ---');
  const allTimeRes = await pool.query(`
    SELECT 
      COUNT(*) as total_claims_paid,
      SUM(amount) as total_gram_paid
    FROM gram_claims
    WHERE status = 'approved'
  `);
  console.table(allTimeRes.rows);

  pool.end();
}
check();

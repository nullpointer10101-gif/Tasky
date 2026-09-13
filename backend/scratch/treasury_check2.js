require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  // Check gram_deposits schema
  const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='gram_deposits' ORDER BY ordinal_position`);
  console.log('gram_deposits columns:', cols.rows.map(r => r.column_name).join(', '));

  if (cols.rows.length > 0) {
    const deps = await pool.query(`SELECT * FROM gram_deposits ORDER BY created_at DESC LIMIT 10`);
    console.log('\nLatest deposits:');
    console.log(JSON.stringify(deps.rows, null, 2));
  } else {
    console.log('⚠️  gram_deposits table does not exist or has no columns.');
  }

  // Also check total approved claims and TON paid out
  const total = await pool.query(`
    SELECT 
      COUNT(*) as total_claims,
      COUNT(*) FILTER (WHERE status='approved') as approved,
      COUNT(*) FILTER (WHERE status='pending') as pending,
      SUM(amount) FILTER (WHERE status='approved') as total_gram_paid
    FROM gram_claims
  `);
  console.log('\nGram claims totals:', total.rows[0]);

  await pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });

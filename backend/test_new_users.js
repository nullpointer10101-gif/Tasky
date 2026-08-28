require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  // Test CURRENT_DATE query
  const r1 = await pool.query(`
    SELECT telegram_id, username, first_name, created_at
    FROM users
    WHERE created_at >= CURRENT_DATE
    ORDER BY created_at DESC
    LIMIT 20
  `);
  console.log('CURRENT_DATE query count:', r1.rows.length);
  r1.rows.forEach(u => console.log(' -', u.first_name, '@' + (u.username || u.telegram_id), u.created_at));

  // Test last 24 hours
  const r2 = await pool.query(`
    SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '24 hours'
  `);
  console.log('Last 24h count:', r2.rows[0].count);

  // Show DB current time
  const r3 = await pool.query('SELECT NOW(), CURRENT_DATE');
  console.log('DB NOW:', r3.rows[0].now, '| CURRENT_DATE:', r3.rows[0].current_date);
  
  pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });

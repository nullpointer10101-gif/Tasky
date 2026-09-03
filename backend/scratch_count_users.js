require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const total = await pool.query('SELECT COUNT(*) FROM users');
  const banned = await pool.query("SELECT COUNT(*) FROM users WHERE is_banned = true");
  const withTgId = await pool.query('SELECT COUNT(*) FROM users WHERE telegram_id IS NOT NULL');
  const today = await pool.query("SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE");
  const thisWeek = await pool.query("SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days'");
  const thisMonth = await pool.query("SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days'");
  
  console.log('=== USER COUNT BREAKDOWN ===');
  console.log('Total users (all):', total.rows[0].count);
  console.log('Banned users:', banned.rows[0].count);
  console.log('Users with telegram_id:', withTgId.rows[0].count);
  console.log('Joined today:', today.rows[0].count);
  console.log('Joined this week:', thisWeek.rows[0].count);
  console.log('Joined this month:', thisMonth.rows[0].count);
  
  await pool.end();
}
run().catch(console.error);

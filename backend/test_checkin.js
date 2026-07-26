const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  const telegram_id = '8286005446'; 
  await client.query("INSERT INTO users (telegram_id) VALUES ($1) ON CONFLICT DO NOTHING", [telegram_id]);
  
  const userRes = await client.query('SELECT * FROM users WHERE telegram_id = $1', [telegram_id]);
  const user = userRes.rows[0];
  const now = new Date();
  
  await client.query("UPDATE users SET last_checkin = NOW() WHERE telegram_id = $1", [telegram_id]);
  
  const userRes2 = await client.query('SELECT * FROM users WHERE telegram_id = $1', [telegram_id]);
  const user2 = userRes2.rows[0];
  let lastCheckin2 = user2.last_checkin ? new Date(user2.last_checkin) : null;
  console.log('Now:', now);
  console.log('lastCheckin after update:', lastCheckin2);
  
  const diff = now.getTime() - (lastCheckin2 ? lastCheckin2.getTime() : 0);
  console.log('Diff hours:', diff / (1000 * 60 * 60));
  
  await client.query("DELETE FROM users WHERE telegram_id = $1", [telegram_id]);
  process.exit(0);
}
run();

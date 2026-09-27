const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  const q1 = await client.query("SELECT count(*) FROM users WHERE updated_at >= NOW() - INTERVAL '15 minutes'");
  const q2 = await client.query("SELECT count(*) FROM users WHERE updated_at >= NOW() - INTERVAL '1 hour'");
  const q3 = await client.query("SELECT count(*) FROM users WHERE updated_at >= NOW() - INTERVAL '24 hours'");
  
  console.log('Users updated in last 15m:', q1.rows[0].count);
  console.log('Users updated in last 1h:', q2.rows[0].count);
  console.log('Users updated in last 24h:', q3.rows[0].count);

  try {
    const q4 = await client.query("SELECT count(DISTINCT user_id) FROM analytics_events WHERE created_at >= NOW() - INTERVAL '15 minutes'");
    console.log('Analytics events distinct users 15m:', q4.rows[0].count);
  } catch (e) {
    console.log('analytics_events query failed:', e.message);
  }

  await client.end();
}

run().catch(console.error);

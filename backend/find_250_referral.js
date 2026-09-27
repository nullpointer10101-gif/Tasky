const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  console.log('🔍 Checking all missions:');
  const missions = await client.query('SELECT id, type, title, description, reward_bp, milestone_count, status FROM missions ORDER BY created_at ASC');
  console.table(missions.rows);

  console.log('\n🔍 Checking settings table:');
  try {
    const settings = await client.query("SELECT * FROM settings WHERE key ILIKE '%ref%' OR key ILIKE '%250%' OR value ILIKE '%250%'");
    console.table(settings.rows);
  } catch (e) {
    console.log('Settings error:', e.message);
  }

  await client.end();
}

run().catch(console.error);

const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  const res = await client.query("SELECT id, type, title, target, status FROM missions WHERE type IN ('channel', 'group', 'link')");
  console.table(res.rows);

  await client.end();
}

run().catch(console.error);

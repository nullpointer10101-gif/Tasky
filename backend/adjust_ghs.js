const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  const targetUsers = [
    { tgId: 6471257554, newBp: 138.64 },
    { tgId: 5802381615, newBp: 141.52 }
  ];

  for (const { tgId, newBp } of targetUsers) {
    const prevRes = await client.query('SELECT id, telegram_id, username, first_name, bp FROM users WHERE telegram_id = $1', [tgId]);
    if (prevRes.rows.length === 0) continue;
    const user = prevRes.rows[0];
    const oldBp = parseFloat(user.bp);
    
    await client.query('UPDATE users SET bp = $1, updated_at = NOW() WHERE telegram_id = $2', [newBp, tgId]);
    console.log(`✅ User ${tgId} (${user.username}): BP set to ${newBp}`);
  }

  const verifyRes = await client.query('SELECT telegram_id, username, first_name, bp FROM users WHERE telegram_id IN (6471257554, 5802381615)');
  console.table(verifyRes.rows);

  await client.end();
}

run().catch(console.error);

const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  const tgIds = [6471257554, 5802381615];
  for (const tgId of tgIds) {
    console.log('================================================================');
    console.log('USER TELEGRAM ID:', tgId);
    console.log('================================================================');

    const u = (await client.query('SELECT * FROM users WHERE telegram_id = $1', [tgId])).rows[0];
    if (!u) {
      console.log('Not found');
      continue;
    }

    console.log('User Record:', {
      id: u.id,
      telegram_id: u.telegram_id,
      username: u.username,
      first_name: u.first_name,
      bp: u.bp,
      honey_balance: u.honey_balance,
      streak_count: u.streak_count,
      has_collected: u.has_collected,
      has_completed_mission: u.has_completed_mission,
      status: u.status,
      created_at: u.created_at,
      updated_at: u.updated_at
    });

    const txs = (await client.query('SELECT type, amount, ref_type, description, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at ASC', [u.id])).rows;
    console.log('\nAll Transactions (' + txs.length + '):');
    console.table(txs);

    const refStats = (await client.query(`
      SELECT 
        count(*) as total_referrals,
        count(*) FILTER (WHERE status = 'active') as active_referrals,
        count(*) FILTER (WHERE status = 'pending') as pending_referrals,
        min(created_at) as first_ref_time,
        max(created_at) as last_ref_time
      FROM referrals
      WHERE referrer_id = $1
    `, [u.id])).rows[0];

    console.log('\nReferral Stats:', refStats);
  }

  await client.end();
}

run().catch(console.error);

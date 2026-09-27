const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  const tgId = 7564592986;
  console.log('🔍 Investigating User TG ID:', tgId);

  const uRes = await client.query('SELECT * FROM users WHERE telegram_id = $1', [tgId]);
  if (uRes.rows.length === 0) {
    console.log('User not found');
    return;
  }
  const u = uRes.rows[0];
  console.log('User Record:', {
    id: u.id,
    telegram_id: u.telegram_id,
    username: u.username,
    first_name: u.first_name,
    bp: u.bp,
    honey_balance: u.honey_balance,
    status: u.status,
    created_at: u.created_at,
    updated_at: u.updated_at
  });

  const txs = await client.query('SELECT type, amount, ref_type, description, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at ASC', [u.id]);
  console.log('\nTransactions (' + txs.rows.length + '):');
  console.table(txs.rows);

  const refStats = await client.query(`
    SELECT 
      count(*) as total_referrals,
      count(*) FILTER (WHERE status = 'active') as active_referrals,
      count(*) FILTER (WHERE status = 'pending') as pending_referrals,
      min(created_at) as first_ref_time,
      max(created_at) as last_ref_time
    FROM referrals
    WHERE referrer_id = $1
  `, [u.id]);
  console.log('\nReferral Stats:', refStats.rows[0]);

  // Sample referrals
  const sampleRefs = await client.query(`
    SELECT r.status, r.created_at, u2.telegram_id, u2.username, u2.first_name, u2.bp, u2.has_collected
    FROM referrals r
    JOIN users u2 ON u2.id = r.referred_id
    WHERE r.referrer_id = $1
    ORDER BY r.created_at ASC
    LIMIT 10
  `, [u.id]);
  console.log('\nFirst 10 Referrals:');
  console.table(sampleRefs.rows);

  await client.end();
}

run().catch(console.error);

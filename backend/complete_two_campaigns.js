const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  console.log('🔍 Finding campaigns with memos CMP57B829E730 and ADMIN_0a1e1aae or matching targets...');

  const queryRes = await client.query(`
    SELECT *
    FROM campaigns
    WHERE payment_memo ILIKE '%CMP57B829E730%' 
       OR payment_memo ILIKE '%ADMIN_0a1e1aae%'
       OR target ILIKE '%Bitaracryptobot%'
       OR target ILIKE '%garapanfufu03%'
  `);

  console.log('Found Campaigns:');
  console.table(queryRes.rows.map(r => ({
    id: r.id,
    title: r.title,
    memo: r.payment_memo,
    status: r.status,
    completions: r.current_completions || r.completions_count
  })));

  // Update status to completed for both
  const updateRes = await client.query(`
    UPDATE campaigns
    SET status = 'completed', updated_at = NOW()
    WHERE payment_memo ILIKE '%CMP57B829E730%' 
       OR payment_memo ILIKE '%ADMIN_0a1e1aae%'
       OR target ILIKE '%Bitaracryptobot%'
       OR target ILIKE '%garapanfufu03%'
    RETURNING id, title, target, payment_memo, status
  `);

  console.log('\nUpdated Campaigns:');
  console.table(updateRes.rows);

  await client.end();
}

run().catch(console.error);

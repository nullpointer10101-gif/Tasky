const { Client } = require('pg');

const connStrings = [
  'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres',
  'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'
];

async function tryConnect() {
  for (const conn of connStrings) {
    try {
      const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
      await client.connect();
      console.log('Connected via:', conn.split('@')[1]);
      return client;
    } catch (e) {
      console.log('Failed:', conn.split('@')[1], e.message);
    }
  }
  throw new Error('All connections failed');
}

async function run() {
  const client = await tryConnect();

  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'campaigns'
  `);
  console.log('Columns in campaigns:');
  console.table(cols.rows.map(r => r.column_name));

  const camps = await client.query(`
    SELECT * FROM campaigns 
    WHERE payment_memo IN ('CMP38C60EC604', 'CMPA081BE29E9')
       OR target ILIKE '%referral199%'
       OR target ILIKE '%onlinee1994%'
  `);
  console.log('\nTarget Campaigns:');
  console.table(camps.rows);

  await client.end();
}

run().catch(console.error);

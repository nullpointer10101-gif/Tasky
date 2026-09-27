const { Client } = require('pg');

const regions = [
  'aws-0-ap-south-1',
  'aws-1-ap-south-1',
  'aws-0-us-east-1',
  'aws-0-us-west-1',
  'aws-0-eu-west-1',
  'aws-0-eu-central-1',
  'aws-0-ap-southeast-1',
  'aws-0-me-central-1'
];

async function tryRegions() {
  for (const r of regions) {
    const conn = `postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@${r}.pooler.supabase.com:6543/postgres`;
    try {
      const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 4000 });
      await client.connect();
      console.log('✅ Connected via region:', r);
      return client;
    } catch (e) {
      console.log('Region', r, 'failed:', e.message);
    }
  }
  throw new Error('All regions failed');
}

async function run() {
  const client = await tryRegions();

  const cols = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'campaigns'
  `);
  console.log('Columns in campaigns:', cols.rows.map(r => r.column_name));

  const camps = await client.query(`
    SELECT id, title, target, payment_memo, done_completions, total_completions, status 
    FROM campaigns 
    WHERE payment_memo IN ('CMP38C60EC604', 'CMPA081BE29E9')
       OR target ILIKE '%referral199%'
       OR target ILIKE '%onlinee1994%'
  `);
  console.log('\nTarget Campaigns BEFORE update:');
  console.table(camps.rows);

  // Update done_completions to approx 200 (e.g. 194 and 208)
  for (const c of camps.rows) {
    let newDone = 196;
    if (c.payment_memo === 'CMPA081BE29E9' || c.target.includes('onlinee1994')) {
      newDone = 208;
    } else if (c.payment_memo === 'CMP38C60EC604' || c.target.includes('referral199')) {
      newDone = 194;
    }
    await client.query('UPDATE campaigns SET done_completions = $1, updated_at = NOW() WHERE id = $2', [newDone, c.id]);
    console.log(`✅ Updated Campaign ${c.title} (${c.payment_memo}): done_completions changed from ${c.done_completions} -> ${newDone}`);
  }

  const updatedCamps = await client.query(`
    SELECT id, title, target, payment_memo, done_completions, total_completions, status 
    FROM campaigns 
    WHERE payment_memo IN ('CMP38C60EC604', 'CMPA081BE29E9')
       OR target ILIKE '%referral199%'
       OR target ILIKE '%onlinee1994%'
  `);
  console.log('\nTarget Campaigns AFTER update:');
  console.table(updatedCamps.rows);

  await client.end();
}

run().catch(console.error);

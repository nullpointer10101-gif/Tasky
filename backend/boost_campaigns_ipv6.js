const dns = require('dns').promises;
const { Client } = require('pg');

async function run() {
  const host = 'db.fniclcuywsrohisxgvcm.supabase.co';
  let ip6;
  try {
    const ips = await dns.resolve6(host);
    ip6 = ips[0];
    console.log(`Resolved AAAA (IPv6) ${host} -> [${ip6}]`);
  } catch (e) {
    console.log('Resolve6 failed:', e.message);
  }

  const client = new Client({
    host: ip6 || host,
    port: 5432,
    user: 'postgres',
    password: 'YoLOuZ5vrGUq3nrk',
    database: 'postgres',
    ssl: { rejectUnauthorized: false, servername: host }
  });

  await client.connect();
  console.log('✅ Connected to database via IPv6!');

  const camps = await client.query(`
    SELECT id, title, target, payment_memo, done_completions, total_completions, status 
    FROM campaigns 
    WHERE payment_memo IN ('CMP38C60EC604', 'CMPA081BE29E9')
       OR target ILIKE '%referral199%'
       OR target ILIKE '%onlinee1994%'
  `);
  console.log('\nCampaigns BEFORE update:');
  console.table(camps.rows);

  // Update done_completions to approx 200 (194 and 208)
  for (const c of camps.rows) {
    let newDone = 196;
    if (c.payment_memo === 'CMPA081BE29E9' || c.target.includes('onlinee1994')) {
      newDone = 208;
    } else if (c.payment_memo === 'CMP38C60EC604' || c.target.includes('referral199')) {
      newDone = 194;
    }
    await client.query('UPDATE campaigns SET done_completions = $1, updated_at = NOW() WHERE id = $2', [newDone, c.id]);
    console.log(`✅ Updated Campaign ${c.title} (${c.payment_memo}): progress changed from ${c.done_completions} -> ${newDone} / ${c.total_completions}`);
  }

  const updatedCamps = await client.query(`
    SELECT id, title, target, payment_memo, done_completions, total_completions, status 
    FROM campaigns 
    WHERE payment_memo IN ('CMP38C60EC604', 'CMPA081BE29E9')
       OR target ILIKE '%referral199%'
       OR target ILIKE '%onlinee1994%'
  `);
  console.log('\nCampaigns AFTER update:');
  console.table(updatedCamps.rows);

  await client.end();
}

run().catch(console.error);

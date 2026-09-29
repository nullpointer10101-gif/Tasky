const { Client } = require('pg');

async function testSupabaseDb() {
  const client = new Client({
    connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const tourneys = await client.query('SELECT * FROM campaign_tournaments');
  console.log('Tournaments in Supabase (fniclcuywsrohisxgvcm):', tourneys.rows);

  await client.query(`
    ALTER TABLE campaign_tournaments ADD COLUMN IF NOT EXISTS tournament_type VARCHAR(50) DEFAULT 'ad';
    ALTER TABLE campaign_tournaments ADD COLUMN IF NOT EXISTS winners_count INTEGER DEFAULT 30;
  `);

  await client.query(`
    UPDATE campaign_tournaments 
    SET tournament_type = 'ad', winners_count = 30 
    WHERE id = 1 OR title ILIKE '%ad%'
  `);

  console.log('Updated tournament in Supabase DB');
  await client.end();
}

testSupabaseDb().catch(console.error);

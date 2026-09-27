const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  const constraints = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conrelid = 'mission_completions'::regclass
  `);

  console.log('Constraints on mission_completions:');
  console.table(constraints.rows);

  const indexes = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'mission_completions'
  `);
  console.log('\nIndexes on mission_completions:');
  console.table(indexes.rows);

  await client.end();
}

run().catch(console.error);

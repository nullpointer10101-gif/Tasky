const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  // Check duplicate mission completions
  const dupCompletions = await client.query(`
    SELECT user_id, mission_id, count(*)
    FROM mission_completions
    GROUP BY user_id, mission_id
    HAVING count(*) > 1
  `);
  console.log('Duplicate mission completions:', dupCompletions.rows.length);

  // Check duplicate mission reward transactions
  const dupTxs = await client.query(`
    SELECT user_id, ref_id, count(*)
    FROM transactions
    WHERE type = 'mission_reward' AND ref_id IS NOT NULL
    GROUP BY user_id, ref_id
    HAVING count(*) > 1
  `);
  console.log('Duplicate mission reward transactions:', dupTxs.rows.length);

  await client.end();
}

run().catch(console.error);

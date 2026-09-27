const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  const missionId = '50540ccf-5251-4a77-83ad-76973c4d86c3';

  // Check completions
  const compRes = await client.query('SELECT * FROM mission_completions WHERE mission_id = $1', [missionId]);
  console.log(`Found ${compRes.rows.length} completions for 250 refer reward milestone.`);

  // Delete completions if any
  if (compRes.rows.length > 0) {
    await client.query('DELETE FROM mission_completions WHERE mission_id = $1', [missionId]);
    console.log('Deleted associated mission completions.');
  }

  // Delete mission
  const delRes = await client.query('DELETE FROM missions WHERE id = $1 RETURNING *', [missionId]);
  console.log('✅ Successfully removed 250 Referral Milestone Mission:', delRes.rows[0]);

  // List remaining milestone missions
  const remaining = await client.query("SELECT id, title, reward_bp, milestone_count, status FROM missions WHERE type = 'milestone' ORDER BY milestone_count ASC");
  console.log('\nRemaining Referral Milestone Missions:');
  console.table(remaining.rows);

  await client.end();
}

run().catch(console.error);

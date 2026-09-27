const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres'
});

async function run() {
  try {
    // 1. Rename "Join Midaso Test" -> "Join Midaso" in campaigns and missions
    const campUpdate = await pool.query(`
      UPDATE campaigns
      SET title = 'Join Midaso', updated_at = NOW()
      WHERE id = '7cafbcb3-5c32-419a-a63b-56ed2d3e7040' OR payment_memo = 'ADMIN_7cafbcb3' OR title = 'Join Midaso Test'
      RETURNING id, title, target, payment_memo
    `);
    console.log('Updated campaign:', campUpdate.rows);

    const missionUpdate = await pool.query(`
      UPDATE missions
      SET title = 'Join Midaso', updated_at = NOW()
      WHERE campaign_id = '7cafbcb3-5c32-419a-a63b-56ed2d3e7040' OR title = 'Join Midaso Test'
      RETURNING id, title, target
    `);
    console.log('Updated mission:', missionUpdate.rows);

    // 2. Delete the internal verification test campaign if exists
    const delMissions = await pool.query(`
      DELETE FROM missions
      WHERE title = 'Verification Test Campaign' OR campaign_id = 'e143e549-5b88-41a3-a162-adeda16263eb'
      RETURNING id, title
    `);
    console.log('Deleted test missions:', delMissions.rows);

    const delCamps = await pool.query(`
      DELETE FROM campaigns
      WHERE title = 'Verification Test Campaign' OR id = 'e143e549-5b88-41a3-a162-adeda16263eb'
      RETURNING id, title
    `);
    console.log('Deleted test campaigns:', delCamps.rows);

    // 3. List active campaigns to confirm clean state
    const allCamps = await pool.query(`
      SELECT id, title, type, target, payment_memo, done_completions, total_completions, status
      FROM campaigns
      WHERE status = 'active'
      ORDER BY created_at DESC
    `);
    console.log('\nActive Campaigns now:');
    console.table(allCamps.rows);

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();

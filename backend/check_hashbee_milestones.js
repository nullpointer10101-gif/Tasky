const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres'
});

async function run() {
  try {
    const missions = await pool.query('SELECT id, type, title, milestone_count, reward_bp, status FROM missions WHERE type = $1 ORDER BY milestone_count ASC', ['milestone']);
    console.log('Missions:');
    console.table(missions.rows);

    const comps = await pool.query('SELECT mc.id, mc.user_id, mc.mission_id, mc.status, m.title, m.milestone_count FROM mission_completions mc JOIN missions m ON m.id = mc.mission_id WHERE m.type = $1', ['milestone']);
    console.log('Milestone completions:');
    console.table(comps.rows);

    const users = await pool.query('SELECT id, telegram_id, username, bee_power, total_referrals, active_referrals FROM users ORDER BY total_referrals DESC LIMIT 10');
    console.log('Top users by refs:');
    console.table(users.rows);

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();

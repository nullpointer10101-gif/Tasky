const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres'
});

async function run() {
  try {
    const userRes = await pool.query(`
      SELECT u.id, u.telegram_id, u.username,
        (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id) as total_refs,
        (SELECT COUNT(*) FROM referrals r JOIN users ref_u ON ref_u.id = r.referred_id WHERE r.referrer_id = u.id AND ref_u.total_harvests > 0) as active_refs
      FROM users u
      ORDER BY total_refs DESC
      LIMIT 15
    `);
    console.table(userRes.rows);

    const userWith4Active = userRes.rows.find(u => Number(u.active_refs) === 4);
    if (userWith4Active) {
      console.log('Found user with 4 active refs:', userWith4Active);
      const userComps = await pool.query('SELECT mc.id, mc.mission_id, mc.status, m.title, m.milestone_count FROM mission_completions mc JOIN missions m ON m.id = mc.mission_id WHERE mc.user_id = $1', [userWith4Active.id]);
      console.table(userComps.rows);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();

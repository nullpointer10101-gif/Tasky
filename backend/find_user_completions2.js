const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres'
});

async function run() {
  try {
    const userRes = await pool.query(`
      SELECT u.id, u.telegram_id, u.username, u.first_name, u.bp,
        (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.level = 1) as total_l1,
        (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.level = 1 AND r.status = 'active') as active_l1
      FROM users u
      ORDER BY total_l1 DESC
      LIMIT 20
    `);
    console.table(userRes.rows);

    const userWith4Active = userRes.rows.filter(u => Number(u.active_l1) === 4 || Number(u.total_l1) === 10);
    console.log('Matching users:', userWith4Active);

    for (const u of userWith4Active) {
      console.log(`\n=== Completions for ${u.username || u.telegram_id} (${u.id}) ===`);
      const comps = await pool.query(`
        SELECT mc.id, mc.user_id, mc.mission_id, mc.status, m.title, m.milestone_count, m.reward_bp
        FROM mission_completions mc
        JOIN missions m ON m.id = mc.mission_id
        WHERE mc.user_id = $1
      `, [u.id]);
      console.table(comps.rows);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();

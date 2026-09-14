const { pool } = require('../db');

async function run() {
  const tid = '8512293323';
  for (let i = 0; i < 141; i++) {
    await pool.query(
      `INSERT INTO ad_views (telegram_id, ad_type, created_at) VALUES ($1, 'reactor_usl', NOW() - ($2 || ' seconds')::interval)`,
      [tid, i * 25]
    );
  }
  const res = await pool.query(
    `SELECT COUNT(*) as count FROM ad_views WHERE telegram_id = $1 AND ad_type IN ('reactor_usl', 'reactor_ad')`,
    [tid]
  );
  console.log('SUCCESS! Updated Cyber Reactor count:', res.rows[0].count);
  process.exit(0);
}

run();

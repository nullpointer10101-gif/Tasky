const { pool } = require('../db');

async function restoreUserReactorFast() {
  const tid = '7260705564';
  console.log(`Fast restoring 200 reactor_usl ad views for user ${tid}...`);
  try {
    const now = Date.now();
    const baseTime = now - (200 * 25 * 1000);

    const values = [];
    const params = [tid, 'reactor_usl'];
    let paramIdx = 3;

    for (let i = 0; i < 200; i++) {
      const adTime = new Date(baseTime + (i * 25000));
      values.push(`($1, $2, $${paramIdx})`);
      params.push(adTime);
      paramIdx++;
    }

    const query = `INSERT INTO ad_views (telegram_id, ad_type, created_at) VALUES ${values.join(', ')}`;
    await pool.query(query, params);
    console.log('Successfully restored 200 reactor_usl ad views!');

    const countRes = await pool.query(
      "SELECT COUNT(*) as count FROM ad_views WHERE telegram_id = $1 AND ad_type IN ('reactor_usl', 'reactor_ad')",
      [tid]
    );
    console.log(`New total Cyber Reactor ad count for ${tid}: ${countRes.rows[0].count}`);
  } catch (err) {
    console.error('Error restoring:', err.message);
  } finally {
    process.exit(0);
  }
}

restoreUserReactorFast();

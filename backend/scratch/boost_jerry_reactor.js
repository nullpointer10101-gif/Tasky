const { pool } = require('../db');

async function boostJerry() {
  const tid = '8512293323';
  console.log(`Boosting reactor_usl ad views for ${tid}...`);
  try {
    const now = Date.now();
    const baseTime = now - (141 * 25 * 1000);

    const values = [];
    const params = [tid, 'reactor_usl'];
    let paramIdx = 3;

    for (let i = 0; i < 141; i++) {
      const adTime = new Date(baseTime + (i * 25000));
      values.push(`($1, $2, $${paramIdx})`);
      params.push(adTime);
      paramIdx++;
    }

    const query = `INSERT INTO ad_views (telegram_id, ad_type, created_at) VALUES ${values.join(', ')}`;
    await pool.query(query, params);

    const countRes = await pool.query(
      "SELECT COUNT(*) as count FROM ad_views WHERE telegram_id = $1 AND ad_type IN ('reactor_usl', 'reactor_ad')",
      [tid]
    );
    console.log(`Updated Cyber Reactor count for 8512293323: ${countRes.rows[0].count}`);
  } catch (err) {
    console.error('Boost failed:', err.message);
  } finally {
    process.exit(0);
  }
}

boostJerry();

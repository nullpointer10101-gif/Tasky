const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkParallelCluster() {
  const tids = [
    '6436738775', '7123740694', '7673767415', '7893217017',
    '8087484055', '5661209883', '5237104574', '7160668593',
    '1544209326', '7810514939', '7455280738', '6828691165'
  ];

  const ads = await pool.query(`
    SELECT a.telegram_id, u.username, a.created_at
    FROM ad_views a
    JOIN users u ON u.telegram_id::text = a.telegram_id::text
    WHERE a.telegram_id::text = ANY($1)
    ORDER BY a.created_at ASC
    LIMIT 200
  `, [tids]);

  console.log('Sample consecutive ad views across suspected sybil farm:');
  // Group by 5-second windows to show synchronized bursts
  const bursts = new Map();
  for (const r of ads.rows) {
    const secKey = Math.floor(new Date(r.created_at).getTime() / 3000) * 3000;
    if (!bursts.has(secKey)) bursts.set(secKey, []);
    bursts.get(secKey).push(`@${r.username} (${r.telegram_id})`);
  }

  for (const [k, arr] of bursts.entries()) {
    if (arr.length >= 3) {
      console.log(`⏱️ Synchronized Burst at ${new Date(k).toISOString()} (${arr.length} simultaneous accounts):`);
      console.log('   ', arr.join(', '));
    }
  }

  await pool.end();
}

checkParallelCluster();

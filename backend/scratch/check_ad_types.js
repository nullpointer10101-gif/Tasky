require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  console.log('\n=== ALL AD_TYPES IN DATABASE ===\n');

  const res = await pool.query(
    `SELECT ad_type, COUNT(*) as total_count FROM ad_views GROUP BY ad_type ORDER BY total_count DESC`
  );
  console.table(res.rows);

  // Check recent ad views in last 24h
  const recentTypes = await pool.query(
    `SELECT ad_type, COUNT(*) as total_count FROM ad_views WHERE created_at >= NOW() - INTERVAL '24 hours' GROUP BY ad_type ORDER BY total_count DESC`
  );
  console.log('\nLast 24h Ad Types:');
  console.table(recentTypes.rows);

  await pool.end();
}

run().catch(console.error);

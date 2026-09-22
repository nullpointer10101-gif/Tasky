process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_hdzlyY4E8Dmu@ep-floral-block-ao1exyu8-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const { pool } = require('../backend/db');

async function auditUsersTable() {
  try {
    console.log('1. Checking users table columns & data types...');
    const cols = await pool.query("SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'users'");
    console.log('Columns:', cols.rows.map(c => `${c.column_name} (${c.data_type})`));

    console.log('\n2. Checking sample user counts...');
    const userCount = await pool.query("SELECT COUNT(*) FROM users");
    const bannedCount = await pool.query("SELECT COUNT(*) FROM users WHERE is_banned = TRUE");
    const tasksCount = await pool.query("SELECT COUNT(*) FROM user_tasks WHERE status = 'approved'");
    const adsCount = await pool.query("SELECT COUNT(*) FROM ad_views");
    const refCount = await pool.query("SELECT COUNT(*) FROM referrals");

    console.log(`Total Users: ${userCount.rows[0].count}`);
    console.log(`Banned Users: ${bannedCount.rows[0].count}`);
    console.log(`Approved User Tasks: ${tasksCount.rows[0].count}`);
    console.log(`Total Ad Views: ${adsCount.rows[0].count}`);
    console.log(`Total Referrals: ${refCount.rows[0].count}`);

    console.log('\n3. Checking users with nulls or missing stats...');
    const nullStats = await pool.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE total_referrals IS NULL 
         OR valid_referrals IS NULL 
         OR total_ads_watched IS NULL 
         OR balance IS NULL 
         OR gram_balance IS NULL
         OR is_banned IS NULL
    `);
    console.log(`Users with NULL stats: ${nullStats.rows[0].count}`);

  } catch (err) {
    console.error('Audit Error:', err);
  }
  process.exit(0);
}

auditUsersTable();

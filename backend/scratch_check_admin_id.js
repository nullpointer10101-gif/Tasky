require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkAdminId() {
  try {
    console.log('process.env.ADMIN_TELEGRAM_ID:', process.env.ADMIN_TELEGRAM_ID);

    // Check recent users or admin users in users table
    const adminUsers = await pool.query(`
      SELECT telegram_id, username, first_name, created_at 
      FROM users 
      WHERE telegram_id = $1 OR telegram_id = '8823265955' OR telegram_id = '7620028567' OR telegram_id = '6446145632'
    `, [process.env.ADMIN_TELEGRAM_ID || '']);
    console.log('Matching users in DB:');
    console.dir(adminUsers.rows, { depth: null });

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
checkAdminId();

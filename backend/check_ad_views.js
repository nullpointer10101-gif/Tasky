require('dotenv').config();
const { pool } = require('./db');
async function check() {
  // Check ad_views table structure and constraints
  const r1 = await pool.query(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'ad_views'
    ORDER BY ordinal_position
  `);
  console.log('ad_views columns:', r1.rows);

  const r2 = await pool.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conrelid = 'ad_views'::regclass
  `);
  console.log('\nad_views constraints:', r2.rows);

  // Check recent ad_views entries
  const r3 = await pool.query(`
    SELECT * FROM ad_views ORDER BY id DESC LIMIT 10
  `);
  console.log('\nRecent ad_views:', r3.rows);

  // Check if table exists at all
  const r4 = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'ad_views'
    )
  `);
  console.log('\nad_views table exists:', r4.rows[0].exists);

  pool.end();
}
check();

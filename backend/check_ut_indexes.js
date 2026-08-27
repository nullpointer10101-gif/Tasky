require('dotenv').config();
const { pool } = require('./db');
async function check() {
  const r = await pool.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'user_tasks'`);
  console.log('user_tasks indexes:', r.rows);
  
  // Also check full table DDL
  const r2 = await pool.query(`
    SELECT pg_get_constraintdef(c.oid), c.conname, c.contype
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'user_tasks'
  `);
  console.log('user_tasks full constraints:', r2.rows);
  pool.end();
}
check();

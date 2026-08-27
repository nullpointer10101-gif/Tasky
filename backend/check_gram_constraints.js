require('dotenv').config();
const { pool } = require('./db');
async function check() {
  const r1 = await pool.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conrelid = 'user_tasks'::regclass
  `);
  console.log('Constraints on user_tasks:');
  r1.rows.forEach(r => console.log(r.conname, '-', r.pg_get_constraintdef));

  const r2 = await pool.query(`
    SELECT ut.telegram_id, ut.status, ut.submitted_at, t.verification_type
    FROM user_tasks ut
    JOIN tasks t ON ut.task_id = t.id
    WHERE t.verification_type = 'gram_ad'
    ORDER BY ut.submitted_at DESC
    LIMIT 10
  `);
  console.log('\nRecent gram_ad entries:', r2.rows);
  pool.end();
}
check();

require('dotenv').config();
const { pool } = require('./db');
async function check() {
  // Get a user who has gram_ad completions
  const usersRes = await pool.query(`
    SELECT ut.telegram_id, COUNT(*) as count
    FROM user_tasks ut
    JOIN tasks t ON ut.task_id = t.id
    WHERE t.verification_type = 'gram_ad'
    GROUP BY ut.telegram_id
  `);
  console.log('Users with gram_ad entries:', usersRes.rows);

  if (usersRes.rows.length > 0) {
    const tid = usersRes.rows[0].telegram_id;
    
    // All their gram_ad entries
    const allEntries = await pool.query(`
      SELECT ut.id, ut.status, ut.submitted_at
      FROM user_tasks ut
      JOIN tasks t ON ut.task_id = t.id
      WHERE ut.telegram_id = $1 AND t.verification_type = 'gram_ad'
      ORDER BY ut.submitted_at DESC
    `, [tid]);
    console.log('\nAll gram_ad entries for', tid, ':', allEntries.rows);

    // What gram status endpoint returns
    const statusCount = await pool.query(`
      SELECT COUNT(*) FROM user_tasks ut
      JOIN tasks t ON ut.task_id = t.id
      WHERE ut.telegram_id = $1 
        AND t.verification_type = 'gram_ad' 
        AND ut.status = 'approved' 
        AND ut.submitted_at >= NOW() - INTERVAL '24 hours'
    `, [tid]);
    console.log('\nads_watched_today from status endpoint:', statusCount.rows[0].count);
  }
  
  // Check what 'approved_by' value is set for gram_ad entries
  const r3 = await pool.query(`
    SELECT ut.approved_by, ut.status, ut.rejection_reason
    FROM user_tasks ut
    JOIN tasks t ON ut.task_id = t.id
    WHERE t.verification_type = 'gram_ad'
    LIMIT 5
  `);
  console.log('\napproved_by/status for gram_ad entries:', r3.rows);
  
  pool.end();
}
check();

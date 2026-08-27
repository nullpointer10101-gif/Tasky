const { pool } = require('./db');
async function run() {
  try {
    await pool.query("ALTER TABLE user_tasks ADD COLUMN IF NOT EXISTS approved_by VARCHAR(20) DEFAULT NULL");
    // Mark existing auto-verified tasks
    await pool.query("UPDATE user_tasks SET approved_by = 'auto' WHERE proof_screenshot_url = 'auto_verified_by_bot' AND status = 'approved'");
    // Mark existing admin-approved tasks (has real proof or no proof_screenshot_url but is approved)
    await pool.query("UPDATE user_tasks SET approved_by = 'admin' WHERE approved_by IS NULL AND status = 'approved'");
    // Set approved_by = 'ai' for any that were approved by autoApproveAI (we can infer these by checking rejection_reason or just leaving them as null for now)
    console.log('Migration done');
  } catch(e) { console.error(e); } finally { pool.end(); }
}
run();

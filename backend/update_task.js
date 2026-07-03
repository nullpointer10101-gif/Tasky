const { pool } = require('./db');

async function run() {
  try {
    const title = "YouTube Video Review";
    const subtitle = "Create a video review! Rules: 100+ subs, 20+ views, must use your referral link in description, and get 20+ valid referrals.";
    
    await pool.query(
      `UPDATE tasks SET title = $1, subtitle = $2 WHERE type = 'bounty' AND icon = 'Youtube'`,
      [title, subtitle]
    );
    console.log('Task updated!');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();

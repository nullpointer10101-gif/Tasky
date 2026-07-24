const { pool } = require('./db');

async function run() {
  try {
    await pool.query(
      `INSERT INTO tasks (title, subtitle, type, reward_tasky, action_url, verification_type, icon) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['Watch an Ad', 'Support the project by watching a quick ad', 'daily', 50, '', 'auto_ad', 'PlayCircle']
    );
    console.log('Ad Task inserted!');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();

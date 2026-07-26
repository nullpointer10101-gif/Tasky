const { pool } = require('./db');

async function run() {
  try {
    await pool.query("UPDATE tasks SET reward_tasky = 30 WHERE title = 'Watch an Ad'");
    console.log('Reward updated to 30 TASKY!');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();

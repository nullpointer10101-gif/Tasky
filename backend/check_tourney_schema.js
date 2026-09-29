const { pool } = require('./db');

async function check() {
  const userCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
  console.log('USERS COLUMNS:', userCols.rows.map(c => c.column_name).join(', '));

  const taskCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_tasks'");
  console.log('USER_TASKS COLUMNS:', taskCols.rows.map(c => c.column_name).join(', '));

  const tourneyCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'campaign_tournaments'");
  console.log('CAMPAIGN_TOURNAMENTS COLUMNS:', tourneyCols.rows.map(c => c.column_name).join(', '));

  const activeTourney = await pool.query("SELECT * FROM campaign_tournaments ORDER BY id DESC LIMIT 3");
  console.log('RECENT TOURNAMENTS:', activeTourney.rows);

  await pool.end();
}

check().catch(console.error);

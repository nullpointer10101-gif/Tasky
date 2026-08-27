require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Hide the task instead of deleting (foreign key constraint on user_tasks)
pool.query("UPDATE tasks SET is_active = false WHERE id = 26")
  .then(r => {
    console.log(`Updated ${r.rowCount} row(s). Task "Start TRIONetworkdrop Bot" (id=26) is now hidden.`);
    pool.end();
  })
  .catch(async e => {
    // If is_active column doesn't exist, try is_hidden flag
    console.log('is_active not found, trying is_visible...');
    pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='tasks'")
      .then(r => {
        console.log('Columns:', r.rows.map(x => x.column_name).join(', '));
        pool.end();
      });
  });

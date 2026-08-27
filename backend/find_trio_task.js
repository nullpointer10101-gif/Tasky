require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT id, title, category FROM tasks WHERE title ILIKE '%TRIO%' OR title ILIKE '%networkdrop%' OR title ILIKE '%network%'")
  .then(r => {
    console.log(JSON.stringify(r.rows, null, 2));
    pool.end();
  })
  .catch(e => {
    console.error(e.message);
    pool.end();
  });

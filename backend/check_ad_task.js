const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.query("SELECT * FROM tasks WHERE title = 'Watch an Ad'").then(res => {
  console.log(res.rows);
  process.exit(0);
});

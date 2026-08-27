const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkSchema() {
  const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks'");
  console.log(res.rows);
  process.exit(0);
}
checkSchema();

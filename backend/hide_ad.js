require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("UPDATE tasks SET is_active = false WHERE verification_type = 'auto_ad'")
  .then(res => { console.log('Rows updated:', res.rowCount); pool.end(); })
  .catch(e => console.error(e));

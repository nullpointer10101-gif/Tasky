const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query("UPDATE tasks SET action_url = 'https://t.me/Tasky_Official' WHERE id = 17");
    console.log('Task link updated successfully!');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();

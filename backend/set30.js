const { pool } = require('./db');
require('dotenv').config();

async function set30() {
  await pool.query("UPDATE campaign_tournaments SET winners_count = 30, tournament_type = 'ad' WHERE id = 1 OR title ILIKE '%ad%'");
  console.log('Updated tournament 1 to 30 winners');
  await pool.end();
}

set30().catch(console.error);

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    // 1. Get the constraint name for the unique telegram_id
    const res = await pool.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'special_offer_claims'::regclass
      AND contype = 'u'
    `);
    
    for (let row of res.rows) {
      if (row.conname) {
        console.log(`Dropping constraint ${row.conname}...`);
        await pool.query(`ALTER TABLE special_offer_claims DROP CONSTRAINT IF EXISTS "${row.conname}"`);
      }
    }
    
    // 2. Add the new composite unique constraint
    console.log("Adding new composite unique constraint on (telegram_id, offer_id)...");
    await pool.query(`ALTER TABLE special_offer_claims ADD CONSTRAINT special_offer_claims_telegram_id_offer_id_key UNIQUE (telegram_id, offer_id)`);
    
    console.log("Database schema updated successfully.");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();

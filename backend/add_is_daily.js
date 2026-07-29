require('dotenv').config({ path: '../backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addDailyColumn() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_daily BOOLEAN DEFAULT FALSE');
        await client.query(`UPDATE tasks SET is_daily = TRUE WHERE title ILIKE '%GM%' OR title ILIKE '%React%'`);
        await client.query('COMMIT');
        console.log('Added is_daily column and updated tasks');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}
addDailyColumn();

const { pool } = require('./db');

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('Adding total_ads_watched column...');
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS total_ads_watched INT DEFAULT 0');

        console.log('Backfilling total_ads_watched from ad_views...');
        await client.query(`
            UPDATE users u
            SET total_ads_watched = COALESCE((
                SELECT COUNT(*)
                FROM ad_views av
                WHERE av.telegram_id = u.telegram_id
            ), 0)
        `);
        
        await client.query('COMMIT');
        console.log('Backfill complete!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}
run();

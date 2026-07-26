require('dotenv').config();
const { pool } = require('./db.js');

async function backfill() {
    console.log('Initializing database tables...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ad_views (
                id SERIAL PRIMARY KEY,
                telegram_id BIGINT,
                ad_type VARCHAR(50),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_ad_views_telegram_id ON ad_views(telegram_id);
            CREATE INDEX IF NOT EXISTS idx_ad_views_created_at ON ad_views(created_at);
        `);
        console.log('Tables ready. Backfilling...');

        // Insert historical task ads
        const res = await pool.query(`
            INSERT INTO ad_views (telegram_id, ad_type, created_at)
            SELECT ut.telegram_id, 'task_ad', ut.reviewed_at
            FROM user_tasks ut
            JOIN tasks t ON ut.task_id = t.id
            WHERE t.verification_type = 'auto_ad' AND ut.status = 'approved'
            ON CONFLICT DO NOTHING;
        `);

        console.log(`Backfilled ${res.rowCount} task ads into ad_views table.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

backfill();

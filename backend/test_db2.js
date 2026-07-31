const { pool } = require('./db');

async function run() {
    try {
        const views = await pool.query("SELECT * FROM ad_views WHERE telegram_id = '5738897062' ORDER BY created_at DESC LIMIT 10");
        console.log('Recent ad views:', views.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();

process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_hdzlyY4E8Dmu@ep-floral-block-ao1exyu8-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const { pool } = require('../backend/db');

async function checkUserHistory() {
    try {
        const tid = '6446145632';
        console.log('--- Checking gram_claims for telegram_id::text =', tid);
        const gc = await pool.query('SELECT * FROM gram_claims WHERE telegram_id::text = $1', [tid]);
        console.log('gram_claims:', gc.rows);

        console.log('--- Checking withdrawals for telegram_id::text =', tid);
        const w = await pool.query('SELECT * FROM withdrawals WHERE telegram_id::text = $1', [tid]);
        console.log('withdrawals:', w.rows);

        console.log('--- Checking ad_views count for telegram_id::text =', tid);
        const av = await pool.query('SELECT COUNT(*) FROM ad_views WHERE telegram_id::text = $1', [tid]);
        console.log('total ad_views:', av.rows[0].count);

        console.log('--- All claims in gram_claims for top 20 users:');
        const topUsers = await pool.query('SELECT telegram_id, count(*) FROM gram_claims GROUP BY telegram_id ORDER BY count DESC LIMIT 10');
        console.log('Top claimers:', topUsers.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkUserHistory();

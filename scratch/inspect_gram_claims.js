process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_hdzlyY4E8Dmu@ep-floral-block-ao1exyu8-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const { pool } = require('../backend/db');

async function inspectGramClaims() {
    try {
        const res = await pool.query('SELECT * FROM gram_claims ORDER BY id DESC LIMIT 50');
        console.log('Total gram_claims count:', res.rows.length);
        console.log('Sample claims:', res.rows.slice(0, 10));
        
        const countRes = await pool.query('SELECT COUNT(*) FROM gram_claims');
        console.log('Total claims in DB:', countRes.rows[0].count);

        const userClaims = await pool.query('SELECT * FROM gram_claims WHERE telegram_id::text = $1', ['6446145632']);
        console.log('Claims for user 6446145632:', userClaims.rows);
    } catch (e) {
        console.error('Error inspecting gram_claims:', e);
    } finally {
        await pool.end();
    }
}

inspectGramClaims();

require('dotenv').config();
const { pool } = require('./db.js');

async function checkGramHistory() {
    const targetId = '7893196937';
    
    // Check promo codes claimed
    const promos = await pool.query(`
        SELECT upc.*, pc.* 
        FROM user_promo_claims upc
        JOIN promo_codes pc ON upc.promo_id = pc.id
        WHERE upc.telegram_id = $1
    `, [targetId]);
    console.log('--- Promos claimed ---');
    console.log(promos.rows);

    // Check tasks with gram rewards completed by user
    const tasks = await pool.query(`
        SELECT ut.*, t.title, t.reward_tasky, t.reward_gram, t.reward_type
        FROM user_tasks ut
        JOIN tasks t ON ut.task_id = t.id
        WHERE ut.telegram_id = $1
    `, [targetId]);
    console.log('--- Tasks completed with any gram rewards ---');
    const gramTasks = tasks.rows.filter(t => parseFloat(t.reward_gram || 0) > 0 || t.reward_type === 'GRAM');
    console.log(gramTasks);

    // Check ad views
    const ads = await pool.query(`SELECT * FROM ad_views WHERE telegram_id = $1`, [targetId]);
    console.log('--- Ad views ---');
    console.log(ads.rows);

    // Check all tables with columns named *gram*
    const gramCols = await pool.query(`
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE column_name LIKE '%gram%' AND table_schema = 'public'
    `);
    console.log('--- Gram columns in DB ---');
    console.log(gramCols.rows);

    // Check user_nft_cards
    const nft = await pool.query(`SELECT * FROM user_nft_cards WHERE telegram_id = $1`, [targetId]);
    console.log('--- user_nft_cards ---');
    console.log(nft.rows);

    // Check nft_commission_claims
    const ncc = await pool.query(`SELECT * FROM nft_commission_claims WHERE telegram_id = $1`, [targetId]);
    console.log('--- nft_commission_claims ---');
    console.log(ncc.rows);

    // Check gram_claims
    const gc = await pool.query(`SELECT * FROM gram_claims WHERE telegram_id = $1`, [targetId]);
    console.log('--- gram_claims ---');
    console.log(gc.rows);

    await pool.end();
}

checkGramHistory();

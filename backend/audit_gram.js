require('dotenv').config();
const { pool } = require('./db.js');

async function auditGram() {
    const targetId = '7893196937';
    console.log(`Auditing GRAM sources for user: ${targetId}`);

    // Check gram_claims
    const gc = await pool.query(`SELECT * FROM gram_claims WHERE telegram_id = $1`, [targetId]);
    console.log('--- gram_claims ---');
    console.log(JSON.stringify(gc.rows, null, 2));

    // Check gram_deposits
    const gd = await pool.query(`SELECT * FROM gram_deposits WHERE telegram_id = $1`, [targetId]);
    console.log('--- gram_deposits ---');
    console.log(JSON.stringify(gd.rows, null, 2));

    // Check tasks that give GRAM
    const gt = await pool.query(`
        SELECT ut.*, t.title, t.reward_tasky, t.category
        FROM user_tasks ut
        JOIN tasks t ON ut.task_id = t.id
        WHERE ut.telegram_id = $1
    `, [targetId]);
    console.log('--- Completed Tasks breakdown ---');
    gt.rows.forEach(r => {
        console.log(`Task #${r.task_id}: "${r.title}" | Status: ${r.status} | Tasky: ${r.reward_tasky || 0} | Completed: ${r.completed_at} | Proof: ${r.proof_screenshot_url}`);
    });

    // Check swaps
    const sw = await pool.query(`SELECT * FROM swaps WHERE telegram_id = $1`, [targetId]);
    console.log('--- swaps ---');
    console.log(JSON.stringify(sw.rows, null, 2));

    // Check special offer claims
    const soc = await pool.query(`SELECT * FROM special_offer_claims WHERE telegram_id = $1`, [targetId]);
    console.log('--- special_offer_claims ---');
    console.log(JSON.stringify(soc.rows, null, 2));

    // Check promo code details
    const pr = await pool.query(`
        SELECT upc.*, pc.code, pc.reward_tasky
        FROM user_promo_claims upc
        JOIN promo_codes pc ON upc.promo_id = pc.id
        WHERE upc.telegram_id = $1
    `, [targetId]);
    console.log('--- user_promo_claims details ---');
    console.log(JSON.stringify(pr.rows, null, 2));

    // Check ad views
    const av = await pool.query(`SELECT * FROM ad_views WHERE telegram_id = $1`, [targetId]);
    console.log('--- ad_views ---');
    console.log(JSON.stringify(av.rows, null, 2));

    // Check proof username @AMildSmth across all users to see if it's shared
    console.log('--- Proof "@AMildSmth" usage across all user tasks ---');
    const sharedProof = await pool.query(`
        SELECT ut.id, ut.telegram_id, u.username, u.first_name, ut.task_id, ut.status, ut.submitted_at, ut.proof_screenshot_url 
        FROM user_tasks ut
        LEFT JOIN users u ON ut.telegram_id = u.telegram_id
        WHERE ut.proof_screenshot_url ILIKE '%AMildSmth%'
    `);
    console.log(`Found ${sharedProof.rows.length} submissions with @AMildSmth:`);
    sharedProof.rows.forEach(r => {
        console.log(`  - User ${r.telegram_id} (@${r.username} - ${r.first_name}) | Task #${r.task_id} | Status: ${r.status} | Submitted: ${r.submitted_at}`);
    });

    // Check referrer @Earnwithton0
    console.log('\n--- Referrer details & downlines ---');
    const refUser = await pool.query(`SELECT * FROM users WHERE telegram_id = '7456042010'`);
    console.log('Referrer:', JSON.stringify(refUser.rows[0], null, 2));

    const refDownlines = await pool.query(`SELECT telegram_id, username, first_name, created_at, balance, gram_balance, wallet_address FROM users WHERE referred_by = '7456042010'`);
    console.log(`Referrer has ${refDownlines.rows.length} downlines:`);
    refDownlines.rows.forEach(d => console.log(`  - ID: ${d.telegram_id} | @${d.username} | ${d.first_name} | Created: ${d.created_at} | Bal: ${d.balance} | Gram: ${d.gram_balance} | Wallet: ${d.wallet_address}`));

    await pool.end();
}

auditGram();

require('dotenv').config();
const { pool } = require('./db.js');

async function checkAllUserGramBalances() {
    const res = await pool.query(`
        SELECT telegram_id, username, first_name, gram_balance, created_at 
        FROM users 
        WHERE gram_balance > 0 
        ORDER BY gram_balance DESC
    `);
    console.log(`Found ${res.rows.length} users with gram_balance > 0:`);
    console.table(res.rows.slice(0, 30));

    // Also check all gram_withdrawals
    const gw = await pool.query(`SELECT * FROM gram_withdrawals ORDER BY id ASC`);
    console.log(`All ${gw.rows.length} gram withdrawals in history:`);
    console.table(gw.rows);

    await pool.end();
}

checkAllUserGramBalances();

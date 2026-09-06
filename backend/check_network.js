require('dotenv').config();
const { pool } = require('./db.js');

async function checkNetwork() {
    // Check referrer
    const referrer = await pool.query(`SELECT * FROM users WHERE telegram_id = '7456042010'`);
    console.log('--- Referrer Profile ---');
    console.log(referrer.rows[0]);

    // Check all users referred by 7456042010
    const downlines = await pool.query(`
        SELECT u.id, u.telegram_id, u.username, u.first_name, u.created_at, u.balance, u.gram_balance, u.wallet_address, u.is_banned,
               (SELECT COUNT(*) FROM user_tasks ut WHERE ut.telegram_id = u.telegram_id AND ut.status = 'approved') as approved_tasks,
               (SELECT COUNT(*) FROM gram_withdrawals gw WHERE gw.telegram_id = u.telegram_id) as gram_withdrawals,
               (SELECT COUNT(*) FROM withdrawals w WHERE w.telegram_id = u.telegram_id) as std_withdrawals
        FROM users u 
        WHERE u.referred_by = '7456042010'
    `);
    console.log(`--- Downlines of 7456042010 (${downlines.rows.length}) ---`);
    console.table(downlines.rows);

    // Check if wallet address is linked to any other transaction or withdrawal
    const walletCheck = await pool.query(`
        SELECT 'users' as tbl, telegram_id::text, username, wallet_address FROM users WHERE wallet_address = 'UQBNpHklfXzILvqP6Qe0U-Uh0WCXTaUPhmoA8NuEjpl_gdik'
        UNION ALL
        SELECT 'wallet_bindings' as tbl, telegram_id::text, '' as username, wallet_address FROM wallet_bindings WHERE wallet_address = 'UQBNpHklfXzILvqP6Qe0U-Uh0WCXTaUPhmoA8NuEjpl_gdik'
        UNION ALL
        SELECT 'gram_withdrawals' as tbl, telegram_id::text, status as username, wallet_address FROM gram_withdrawals WHERE wallet_address = 'UQBNpHklfXzILvqP6Qe0U-Uh0WCXTaUPhmoA8NuEjpl_gdik'
        UNION ALL
        SELECT 'withdrawals' as tbl, telegram_id::text, status as username, wallet_address FROM withdrawals WHERE wallet_address = 'UQBNpHklfXzILvqP6Qe0U-Uh0WCXTaUPhmoA8NuEjpl_gdik'
    `);
    console.log('--- Wallet usages across entire DB ---');
    console.table(walletCheck.rows);

    await pool.end();
}

checkNetwork();

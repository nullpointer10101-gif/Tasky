require('dotenv').config();
const { pool } = require('./db.js');

async function deepInvestigate(targetId) {
    try {
        console.log(`=======================================================`);
        console.log(`DEEP INVESTIGATION FOR USER: ${targetId}`);
        console.log(`=======================================================\n`);

        // 1. Get all table names
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        const tables = tablesRes.rows.map(r => r.table_name);
        console.log(`Found ${tables.length} tables:`, tables.join(', '));

        // 2. User main record
        console.log(`\n--- 1. USER RECORD ---`);
        const userRes = await pool.query(`SELECT * FROM users WHERE telegram_id::text = $1 OR username = $2`, [targetId.toString(), 'panduasha']);
        if (userRes.rows.length === 0) {
            console.log(`User not found by ID or username.`);
            return;
        }
        const user = userRes.rows[0];
        console.log(JSON.stringify(user, null, 2));
        const actualId = user.telegram_id.toString();
        const wallet = user.wallet_address;

        // 3. Check for multi-accounting (same wallet across different users)
        if (wallet) {
            console.log(`\n--- 2. WALLET REUSE CHECK (${wallet}) ---`);
            const walletUsers = await pool.query(`SELECT telegram_id, username, first_name, created_at, balance, gram_balance, wallet_address FROM users WHERE wallet_address = $1`, [wallet]);
            console.log(`Accounts sharing this wallet: ${walletUsers.rows.length}`);
            walletUsers.rows.forEach(u => console.log(`  - ID: ${u.telegram_id} | @${u.username} | Name: ${u.first_name} | Balance: ${u.balance} | Gram: ${u.gram_balance} | Created: ${u.created_at}`));
        }

        // 4. Referrer & Referrals
        console.log(`\n--- 3. REFERRER & REFERRALS ---`);
        if (user.referred_by) {
            const referrerRes = await pool.query(`SELECT telegram_id, username, first_name, created_at, balance, gram_balance, wallet_address FROM users WHERE telegram_id::text = $1`, [user.referred_by.toString()]);
            console.log(`Referred by:`, referrerRes.rows[0] || user.referred_by);
            if (referrerRes.rows[0]) {
                const uplineWallet = referrerRes.rows[0].wallet_address;
                console.log(`Upline wallet: ${uplineWallet}`);
            }
        } else {
            console.log(`Referred by: None (Direct / Organic)`);
        }

        const downlines = await pool.query(`SELECT telegram_id, username, first_name, created_at, balance, gram_balance, wallet_address FROM users WHERE referred_by::text = $1 ORDER BY created_at DESC`, [actualId]);
        console.log(`Total Direct Referrals (${downlines.rows.length}):`);
        downlines.rows.forEach(d => console.log(`  - ID: ${d.telegram_id} | @${d.username} | ${d.first_name} | Created: ${d.created_at} | Bal: ${d.balance} | Gram: ${d.gram_balance} | Wallet: ${d.wallet_address}`));

        // 5. Search every table for columns referencing telegram_id / user_id
        for (const table of tables) {
            if (table === 'users') continue;
            try {
                const colsRes = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND (column_name LIKE '%telegram%' OR column_name LIKE '%user%' OR column_name = 'uid' OR column_name = 'recipient_id')
                `, [table]);

                for (const col of colsRes.rows) {
                    const colName = col.column_name;
                    const matchRes = await pool.query(`SELECT * FROM ${table} WHERE ${colName}::text = $1 ORDER BY 1 DESC LIMIT 50`, [actualId]);
                    if (matchRes.rows.length > 0) {
                        const countRes = await pool.query(`SELECT COUNT(*) as cnt FROM ${table} WHERE ${colName}::text = $1`, [actualId]);
                        console.log(`\n--- Table [${table}.${colName}] (Total matches: ${countRes.rows[0].cnt}) ---`);
                        console.log(JSON.stringify(matchRes.rows, null, 2));
                    }
                }
            } catch (err) {
                console.log(`Error reading table ${table}:`, err.message);
            }
        }

        // 6. Check gram_withdrawals and standard withdrawals
        console.log(`\n--- 4. ALL WITHDRAWAL REQUESTS FOR THIS USER & WALLET ---`);
        try {
            const gw = await pool.query(`SELECT * FROM gram_withdrawals WHERE telegram_id::text = $1 OR wallet_address = $2`, [actualId, wallet]);
            console.log(`Gram Withdrawals (${gw.rows.length}):`, JSON.stringify(gw.rows, null, 2));
        } catch (e) {
            console.log('Error checking gram_withdrawals:', e.message);
        }

        try {
            const w = await pool.query(`SELECT * FROM withdrawals WHERE telegram_id::text = $1 OR wallet_address = $2`, [actualId, wallet]);
            console.log(`Standard Withdrawals (${w.rows.length}):`, JSON.stringify(w.rows, null, 2));
        } catch (e) {
            console.log('Error checking withdrawals:', e.message);
        }

    } catch (e) {
        console.error('Error during investigation:', e);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

deepInvestigate('7893196937');

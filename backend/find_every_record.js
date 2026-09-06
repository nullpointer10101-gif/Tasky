require('dotenv').config();
const { pool } = require('./db.js');

async function findEveryRecord() {
    const targetId = '7893196937';

    const tables = [
        'users', 'user_tasks', 'user_machines', 'user_nft_cards', 'user_promo_claims',
        'mining_sessions', 'ad_views', 'gram_claims', 'gram_deposits', 'gram_withdrawals',
        'withdrawals', 'special_offer_claims', 'swaps', 'referrals', 'wallet_bindings',
        'nft_commission_claims'
    ];

    for (const t of tables) {
        try {
            const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [t]);
            const colNames = cols.rows.map(r => r.column_name);
            const userCol = colNames.find(c => c.includes('telegram') || c.includes('user'));
            if (userCol) {
                const res = await pool.query(`SELECT * FROM ${t} WHERE ${userCol}::text = $1`, [targetId]);
                if (res.rows.length > 0) {
                    console.log(`\n=== Table ${t} (${res.rows.length} rows) ===`);
                    console.table(res.rows);
                }
            }
        } catch (e) {
            console.log(`Error on table ${t}:`, e.message);
        }
    }

    await pool.end();
}

findEveryRecord();

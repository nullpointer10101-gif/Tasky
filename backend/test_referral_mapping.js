require('dotenv').config();
const { pool } = require('./db');

async function runTests() {
    console.log("Running referral tests...");
    try {
        const referrerId1 = '999999991';
        const referrerId2 = '999999992';

        // ensure deleted for retry
        await pool.query('DELETE FROM referrals WHERE referrer_telegram_id IN ($1, $2)', [referrerId1, referrerId2]);
        await pool.query('DELETE FROM users WHERE telegram_id IN ($1, $2)', [referrerId1, referrerId2]);

        await pool.query(`
            INSERT INTO users (telegram_id, username, first_name, balance, referral_code)
            VALUES ($1, 'ref1', 'Ref1', 0, 'TASKY_TEST1')
        `, [referrerId1]);

        await pool.query(`
            INSERT INTO users (telegram_id, username, first_name, balance, referral_code)
            VALUES ($1, 'ref2', 'Ref2', 0, 'TASKY_TEST2')
        `, [referrerId2]);

        // Test 1: Register with TASKY code
        let ref1 = 'TASKY_TEST1';
        let referred_by1 = null;
        if (ref1) {
            const refUser = await pool.query('SELECT telegram_id FROM users WHERE referral_code = $1 OR telegram_id::text = $1', [ref1]);
            if (refUser.rows.length > 0) referred_by1 = refUser.rows[0].telegram_id;
        }
        console.log("Test 1 (New format TASKY_CODE):", referred_by1 === referrerId1 ? 'PASS' : 'FAIL', 'referred_by =', referred_by1);

        // Test 2: Register with telegram_id
        let ref2 = referrerId2;
        let referred_by2 = null;
        if (ref2) {
            const refUser = await pool.query('SELECT telegram_id FROM users WHERE referral_code = $1 OR telegram_id::text = $1', [ref2]);
            if (refUser.rows.length > 0) referred_by2 = refUser.rows[0].telegram_id;
        }
        console.log("Test 2 (Old format Telegram ID):", referred_by2 === referrerId2 ? 'PASS' : 'FAIL', 'referred_by =', referred_by2);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

runTests();

const { pool } = require('./db');


async function test() {
    // 1. Get a user's referral code
    const res = await pool.query('SELECT telegram_id, referral_code FROM users LIMIT 1');
    if (res.rows.length === 0) {
        console.log("No users found");
        process.exit();
    }
    const referrer = res.rows[0];
    console.log("Referrer:", referrer);

    // 2. Generate a fake new user ID
    const newUserId = 9999999999 + Math.floor(Math.random() * 10000);
    
    // 3. Register the new user using the referral code directly via DB logic to see if it updates
    console.log(`Registering new user ${newUserId} with ref ${referrer.referral_code}`);
    
    // Simulate what users.js does:
    let referred_by = null;
    const ref = referrer.referral_code;
    const telegram_id = newUserId;
    
    if (ref && ref !== telegram_id.toString()) {
        const refUser = await pool.query('SELECT telegram_id FROM users WHERE referral_code = $1 OR telegram_id::text = $1', [ref]);
        console.log("refUser found:", refUser.rows);
        if (refUser.rows.length > 0 && refUser.rows[0].telegram_id !== telegram_id) {
            // WAIT! Look closely at the comparison:
            // refUser.rows[0].telegram_id is BIGINT -> returned as String.
            // telegram_id is Number.
            // String !== Number is ALWAYS TRUE.
            // So referred_by = refUser.rows[0].telegram_id
            referred_by = refUser.rows[0].telegram_id;
            console.log("referred_by set to:", referred_by);
        }
    }
    
    process.exit();
}
test();

const bot = require('../bot');

async function checkReferralValidity(client, telegram_id, referred_by) {
    if (!referred_by) return;

    try {
        // Check if referrer is paused
        const checkReferrer = await client.query('SELECT referrals_paused FROM users WHERE telegram_id = $1', [referred_by]);
        const isPaused = checkReferrer.rows[0]?.referrals_paused || false;

        // Check if referral already paid
        const refCheck = await client.query('SELECT reward_paid FROM referrals WHERE referrer_telegram_id = $1::bigint AND referred_telegram_id = $2::bigint', [referred_by, telegram_id]);
        if (refCheck.rowCount === 0 || refCheck.rows[0].reward_paid) return;

        // Count approved tasks (any approved task, auto or admin or ai)
        const approvedCountRes = await client.query(
            `SELECT COUNT(*) FROM user_tasks WHERE telegram_id = $1 AND status = 'approved'`,
            [telegram_id]
        );
        const approvedCount = parseInt(approvedCountRes.rows[0].count, 10);

        // Check if user has spun
        const hasSpunRes = await client.query('SELECT last_spin_date FROM users WHERE telegram_id = $1', [telegram_id]);
        const hasSpun = (hasSpunRes.rows.length > 0 && hasSpunRes.rows[0].last_spin_date) ? 1 : 0;

        const totalValidActions = approvedCount + hasSpun;

        const rulesRes = await client.query('SELECT * FROM referral_rules LIMIT 1');
        const rules = rulesRes.rows[0] || { reward_per_referral: 300, tasks_required_for_valid: 1, spin_reward_per_referral: 1 };

        if (totalValidActions >= rules.tasks_required_for_valid) {
            const referrerRes = await client.query(
                'UPDATE referrals SET reward_paid = TRUE WHERE referrer_telegram_id = $1::bigint AND referred_telegram_id = $2::bigint AND reward_paid = FALSE RETURNING *',
                [referred_by, telegram_id]
            );
            if (referrerRes.rowCount > 0 && !isPaused) {
                await client.query(`UPDATE users SET balance = balance + $1, valid_referrals = valid_referrals + 1, spins_available = spins_available + $3 WHERE telegram_id = $2`, [rules.reward_per_referral, referred_by, rules.spin_reward_per_referral]);
                if (bot && bot.sendMessage) {
                    const userRes = await client.query('SELECT username, first_name FROM users WHERE telegram_id = $1', [telegram_id]);
                    const u = userRes.rows[0] || {};
                    try { bot.sendMessage(referred_by, `🎉 Your referral @${u.username || u.first_name} is now valid! +${rules.reward_per_referral} TASKY and +${rules.spin_reward_per_referral} Spin added.`); } catch (e) {}
                }
            }
        }
    } catch (e) {
        console.error('Error checking referral validity:', e);
    }
}

module.exports = { checkReferralValidity };

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

        // Count approved Gram claims
        const claimsCountRes = await client.query(
            `SELECT COUNT(*) FROM gram_claims WHERE telegram_id = $1 AND status = 'approved'`,
            [telegram_id]
        );
        const claimsCount = parseInt(claimsCountRes.rows[0].count, 10);

        // Count approved Gram withdrawals
        const withdrawalsCountRes = await client.query(
            `SELECT COUNT(*) FROM gram_withdrawals WHERE telegram_id = $1 AND status = 'approved'`,
            [telegram_id]
        );
        const withdrawalsCount = parseInt(withdrawalsCountRes.rows[0].count, 10);

        const totalValidActions = claimsCount + withdrawalsCount;

        const rulesRes = await client.query('SELECT * FROM referral_rules LIMIT 1');
        const rules = rulesRes.rows[0] || { reward_per_referral: 300, tasks_required_for_valid: 1, spin_reward_per_referral: 1 };

        // Referral is valid if they completed at least 1 withdrawal (either Gram claim or Gram withdrawal)
        if (totalValidActions >= 1) {
            const referrerRes = await client.query(
                'UPDATE referrals SET reward_paid = TRUE WHERE referrer_telegram_id = $1::bigint AND referred_telegram_id = $2::bigint AND reward_paid = FALSE RETURNING *',
                [referred_by, telegram_id]
            );
            if (referrerRes.rowCount > 0 && !isPaused) {
                await client.query(`UPDATE users SET balance = balance + $1, valid_referrals = valid_referrals + 1, spins_available = spins_available + $3 WHERE telegram_id = $2`, [rules.reward_per_referral, referred_by, rules.spin_reward_per_referral]);
                if (bot && bot.sendMessage) {
                    const userRes = await client.query('SELECT username, first_name FROM users WHERE telegram_id = $1', [telegram_id]);
                    const u = userRes.rows[0] || {};
                    const name = u.username ? `@${u.username}` : (u.first_name || 'Your referral');
                    const message = `💰 <b>Referral Reward Unlocked!</b>\n\n` +
                                    `👤 <b>${name}</b> is now active!\n\n` +
                                    `🎁 <b>You received:</b>\n` +
                                    `➕ <b>+${rules.reward_per_referral} TASKY</b>\n` +
                                    `➕ <b>+${rules.spin_reward_per_referral} Spin Wheel Ticket${rules.spin_reward_per_referral > 1 ? 's' : ''}</b>\n\n` +
                                    `Let's keep the streak going! Invite more friends to climb the leaderboard! 🚀`;
                    try { bot.sendMessage(referred_by, message, { parse_mode: 'HTML' }); } catch (e) {}
                }
            }
        }
    } catch (e) {
        console.error('Error checking referral validity:', e);
    }
}

module.exports = { checkReferralValidity };

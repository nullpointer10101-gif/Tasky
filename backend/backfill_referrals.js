const { pool } = require('./db');

async function backfillMissedReferrals() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const rulesRes = await client.query('SELECT * FROM referral_rules LIMIT 1');
    const rules = rulesRes.rows[0] || { reward_per_referral: 300, tasks_required_for_valid: 3, spin_reward_per_referral: 1 };
    console.log('Rules:', rules);

    // Find all referrals where reward_paid = FALSE but the referred user has enough approved tasks
    const eligibleRes = await client.query(`
      SELECT r.referrer_telegram_id, r.referred_telegram_id,
             u.username, u.first_name,
             (SELECT COUNT(*) FROM user_tasks ut WHERE ut.telegram_id::bigint = r.referred_telegram_id AND ut.status = 'approved') as approved_tasks
      FROM referrals r
      JOIN users u ON u.telegram_id::bigint = r.referred_telegram_id
      WHERE r.reward_paid = FALSE
      AND (SELECT COUNT(*) FROM user_tasks ut WHERE ut.telegram_id::bigint = r.referred_telegram_id AND ut.status = 'approved') >= $1
    `, [rules.tasks_required_for_valid]);

    console.log(`Found ${eligibleRes.rows.length} missed referrals to backfill:`);
    console.log(eligibleRes.rows);

    let credited = 0;
    for (const ref of eligibleRes.rows) {
      // Atomically mark reward_paid = TRUE and credit the referrer
      const updateRes = await client.query(
        'UPDATE referrals SET reward_paid = TRUE WHERE referrer_telegram_id = $1::bigint AND referred_telegram_id = $2::bigint AND reward_paid = FALSE RETURNING *',
        [ref.referrer_telegram_id, ref.referred_telegram_id]
      );
      if (updateRes.rowCount > 0) {
        await client.query(
          'UPDATE users SET balance = balance + $1, valid_referrals = valid_referrals + 1, spins_available = spins_available + $2 WHERE telegram_id::bigint = $3::bigint',
          [rules.reward_per_referral, rules.spin_reward_per_referral, ref.referrer_telegram_id]
        );
        credited++;
        console.log(`  ✅ Credited referrer ${ref.referrer_telegram_id} for referring ${ref.referred_telegram_id} (${ref.username || ref.first_name})`);
      }
    }

    await client.query('COMMIT');
    console.log(`\n✅ Done! Backfilled ${credited} missed referrals.`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', e.message);
  } finally {
    client.release();
    pool.end();
  }
}

backfillMissedReferrals();

const { pool, initDB } = require('./db');
const { runUpdateMiningLevels } = require('./jobs/updateMiningLevels');

async function runTests() {
  try {
    // 1. Initialize DB to make sure tables exist
    await initDB();
    console.log('--- DB initialized ---');

    // 2. Insert test user or get existing
    let telegram_id = 999999999;
    await pool.query(`
      INSERT INTO users (telegram_id, username, first_name, wallet_address, balance)
      VALUES ($1, 'testuser', 'Test', 'EQB_test_wallet_xyz', 100)
      ON CONFLICT (telegram_id) DO UPDATE SET wallet_address = 'EQB_test_wallet_xyz'
    `, [telegram_id]);
    
    // reset their stable date to 5 days ago for efficiency test
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    await pool.query(`
      UPDATE users SET holding_stable_since = $1, last_known_balance = 0 WHERE telegram_id = $2
    `, [fiveDaysAgo, telegram_id]);

    console.log('--- Test user set up ---');

    // 3. Run the cron job logic manually
    await runUpdateMiningLevels();
    
    // Check user stats
    const { rows: users } = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegram_id]);
    const u = users[0];
    console.log(`User after job: level=${u.mining_level}, efficiency=${u.efficiency_percent}%, balance_onchain=${u.onchain_tasky_balance}`);
    
    // 4. Start a mining session via the same logic as route
    const { rows: existingSessions } = await pool.query('SELECT * FROM mining_sessions WHERE telegram_id = $1 AND claimed = FALSE', [telegram_id]);
    if (existingSessions.length > 0) {
      await pool.query('DELETE FROM mining_sessions WHERE telegram_id = $1', [telegram_id]);
      console.log('--- Cleaned up old test sessions ---');
    }

    // Get actual level speed
    const { rows: lvlRes } = await pool.query('SELECT base_speed_per_hour FROM mining_levels WHERE level = $1', [u.mining_level]);
    const real_base_speed = lvlRes[0]?.base_speed_per_hour || 5;

    const rate_used = real_base_speed * (u.efficiency_percent / 100);
    const session_duration_hours = 4;
    // Set expected_claim_at to 1 hour ago so it's instantly claimable
    const expected_claim_at = new Date(Date.now() - 60 * 60 * 1000);

    const { rows: session } = await pool.query(`
      INSERT INTO mining_sessions 
      (telegram_id, expected_claim_at, rate_used, level_used, efficiency_used, session_duration_hours)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [telegram_id, expected_claim_at, rate_used, u.mining_level, u.efficiency_percent, session_duration_hours]);
    
    console.log('--- Session started (and fast-forwarded) ---', session[0]);

    // 5. Claim session logic
    const tasky_earned = Number(session[0].rate_used) * Number(session[0].session_duration_hours);
    
    await pool.query('BEGIN');
    await pool.query(`
      UPDATE mining_sessions
      SET claimed = TRUE, claimed_at = NOW(), tasky_earned = $1
      WHERE id = $2
    `, [tasky_earned, session[0].id]);
    
    const { rows: updatedUser } = await pool.query(`
      UPDATE users
      SET balance = balance + $1
      WHERE telegram_id = $2
      RETURNING balance
    `, [tasky_earned, telegram_id]);
    await pool.query('COMMIT');

    console.log(`--- Session Claimed ---`);
    console.log(`Earned: ${tasky_earned}, New off-chain balance: ${updatedUser[0].balance}`);

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    pool.end();
  }
}

runTests();


const { pool } = require('./db');

const API_URL = 'http://localhost:3000/api';

const log = (msg) => console.log(`[TEST] ${msg}`);
const assert = (condition, msg) => {
  if (!condition) {
    console.error(`[FAIL] ${msg}`);
    process.exit(1);
  }
};

async function doPost(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error || 'Request failed');
    err.response = { data: json };
    throw err;
  }
  return { data: json };
}

async function runTests() {
  const telegram_id1 = '99999991';
  const telegram_id2 = '99999992';
  const wallet1 = 'EQD_test_wallet_1';
  const wallet2 = 'EQD_test_wallet_2';

  // 0. Setup: Clean DB and create users
  log('Setting up DB state...');
  await pool.query('DELETE FROM wallet_bindings WHERE telegram_id IN ($1, $2)', [telegram_id1, telegram_id2]);
  await pool.query('DELETE FROM mining_sessions WHERE telegram_id IN ($1, $2)', [telegram_id1, telegram_id2]);
  await pool.query('DELETE FROM users WHERE telegram_id IN ($1, $2)', [telegram_id1, telegram_id2]);
  
  await pool.query(`INSERT INTO users (telegram_id, username, first_name, balance, mining_level, efficiency_percent) VALUES ($1, 'test1', 'Test 1', 100, 3, 100)`, [telegram_id1]);
  await pool.query(`INSERT INTO users (telegram_id, username, first_name, balance, mining_level, efficiency_percent) VALUES ($1, 'test2', 'Test 2', 50, 1, 100)`, [telegram_id2]);

  try {
    // SCENARIO 1: Connect a fresh wallet, confirm mining works normally
    log('SCENARIO 1: Connect fresh wallet & start mining');
    let res = await doPost(`${API_URL}/users/wallet/bind`, { telegram_id: telegram_id1, wallet_address: wallet1, force: false });
    assert(res.data.success, 'Wallet 1 bind failed');
    log('  -> Wallet bound successfully.');

    res = await doPost(`${API_URL}/mining/start`, { telegram_id: telegram_id1, wallet_address: wallet1 });
    assert(res.data.status === 'active', 'Mining session should be active');
    log('  -> Mining session started normally.');

    // SCENARIO 2: Disconnect that wallet mid-session, confirm active session is invalidated and starting/claiming rejected
    log('SCENARIO 2: Disconnect wallet mid-session');
    res = await doPost(`${API_URL}/users/wallet/disconnect`, { telegram_id: telegram_id1 });
    assert(res.data.success, 'Wallet disconnect failed');
    log('  -> Wallet disconnected.');

    // Verify session invalidated
    const { rows: sessions } = await pool.query('SELECT status FROM mining_sessions WHERE telegram_id = $1', [telegram_id1]);
    assert(sessions[0].status === 'invalidated', 'Session should be invalidated');
    log('  -> Active session was invalidated in DB.');

    try {
      await doPost(`${API_URL}/mining/start`, { telegram_id: telegram_id1, wallet_address: null });
      assert(false, 'Should not allow starting without wallet');
    } catch (e) {
      log(`  -> Starting rejected: ${e.response.data.error}`);
      assert(e.response.data.error.includes('Connect your wallet'), 'Incorrect error for start without wallet');
    }

    // SCENARIO 3: Reconnect the SAME wallet, confirm mining state resumes
    log('SCENARIO 3: Reconnect SAME wallet');
    res = await doPost(`${API_URL}/users/wallet/bind`, { telegram_id: telegram_id1, wallet_address: wallet1, force: false });
    assert(res.data.success, 'Rebind failed');
    log('  -> Wallet rebound successfully.');
    
    const { rows: userAfterRebind } = await pool.query('SELECT mining_level, balance FROM users WHERE telegram_id = $1', [telegram_id1]);
    assert(userAfterRebind[0].mining_level === 3, 'Mining level should remain the same');
    assert(userAfterRebind[0].balance === '100', 'Balance should remain the same');
    log('  -> Mining state (level, balance) resumed exactly as it was.');

    // SCENARIO 4: Connect DIFFERENT wallet on the same Telegram account (silent block, force reset)
    log('SCENARIO 4: Connect DIFFERENT wallet to same TG account');
    try {
      res = await doPost(`${API_URL}/users/wallet/bind`, { telegram_id: telegram_id1, wallet_address: wallet2, force: false });
      assert(res.data.needs_confirmation === true, 'Should require confirmation');
      log(`  -> Silent rebind blocked, modal warning triggered (needs_confirmation = true).`);
    } catch (e) {
      assert(false, 'Should not hard fail, should return needs_confirmation');
    }

    // Now force it
    res = await doPost(`${API_URL}/users/wallet/bind`, { telegram_id: telegram_id1, wallet_address: wallet2, force: true });
    assert(res.data.reset === true, 'Progress should have been reset');
    
    const { rows: userAfterForce } = await pool.query('SELECT mining_level, balance FROM users WHERE telegram_id = $1', [telegram_id1]);
    assert(userAfterForce[0].mining_level === 0, 'Mining level should be reset to 0');
    assert(userAfterForce[0].balance === '100', 'Balance should remain unaffected after reset');
    log('  -> Progress reset successfully after explicit confirmation (balance unaffected).');

    // SCENARIO 5: Connect wallet that is already bound to a DIFFERENT TG account
    log('SCENARIO 5: Connect wallet bound to different TG account');
    try {
      await doPost(`${API_URL}/users/wallet/bind`, { telegram_id: telegram_id2, wallet_address: wallet2, force: false });
      assert(false, 'Should not allow binding to another TG account');
    } catch (e) {
      log(`  -> Rejected outright: ${e.response.data.error}`);
      assert(e.response.data.error.includes('already linked to another'), 'Incorrect error for duplicate wallet');
    }

    // SCENARIO 6: Confirm general TASKY balance unaffected
    log('SCENARIO 6: Confirm TASKY balance unaffected');
    const { rows: finalUser } = await pool.query('SELECT balance FROM users WHERE telegram_id = $1', [telegram_id1]);
    assert(finalUser[0].balance === '100', 'Balance should be 100');
    log('  -> General TASKY balance is completely unaffected by all wallet changes.');

    log('ALL TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('TEST SUITE FAILED:', err.message);
    if (err.response) console.error(err.response.data);
  } finally {
    process.exit(0);
  }
}

runTests();

const { Pool } = require('pg');
require('dotenv').config();

(async () => {
  const API = 'http://localhost:3000/api';
  const telegram_id = 999888777;
  
  console.log('1. Registering mock user...');
  await fetch(API + '/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegram_id, username: 'testuser' })
  });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query('UPDATE users SET balance = 5000 WHERE telegram_id = $1', [telegram_id]);
  await pool.query('DELETE FROM swaps WHERE telegram_id = $1', [telegram_id]);
  
  console.log('2. Requesting first swap (valid TON format)...');
  const swapRes = await fetch(API + '/swap/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      telegram_id,
      tasky_amount: 1000,
      wallet_address: 'EQA123456789012345678901234567890123456789012345'
    })
  });
  const swap = await swapRes.json();
  console.log('First swap response:', swap);

  console.log('3. Requesting second swap while pending...');
  const swap2Res = await fetch(API + '/swap/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      telegram_id,
      tasky_amount: 1000,
      wallet_address: 'EQA123456789012345678901234567890123456789012345'
    })
  });
  console.log('Second swap response:', await swap2Res.json());

  console.log('4. Completing swap as admin...');
  const compRes = await fetch(API + '/swap/admin/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-id': process.env.ADMIN_TELEGRAM_ID },
    body: JSON.stringify({
      swap_id: swap.id,
      tx_hash: 'abc123hash'
    })
  });
  console.log('Complete swap response:', await compRes.json());

  console.log('5. Requesting third swap (cooldown test)...');
  const swap3Res = await fetch(API + '/swap/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      telegram_id,
      tasky_amount: 1000,
      wallet_address: 'EQA123456789012345678901234567890123456789012345'
    })
  });
  console.log('Third swap response:', await swap3Res.json());
  
  process.exit(0);
})();

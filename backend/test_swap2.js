const { Pool } = require('pg');
require('dotenv').config();

(async () => {
  const API = 'http://localhost:3000/api';
  const telegram_id = 111222333;
  
  console.log('1. Registering mock user...');
  await fetch(API + '/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegram_id, username: 'testuser2' })
  });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query('UPDATE users SET balance = 5000, wallet_address = NULL WHERE telegram_id = $1', [telegram_id]);
  await pool.query('DELETE FROM swaps WHERE telegram_id = $1', [telegram_id]);
  
  console.log('2. Requesting swap without connected wallet (expect failure)...');
  let res = await fetch(API + '/swap/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegram_id, tasky_amount: 1000, wallet_address: 'HACKER_ADDRESS' })
  });
  console.log('Response:', await res.json());

  console.log('3. Connecting a wallet address to user in DB...');
  await pool.query("UPDATE users SET wallet_address = 'LEGIT_DB_ADDRESS' WHERE telegram_id = $1", [telegram_id]);

  console.log('4. Requesting swap (should ignore HACKER_ADDRESS)...');
  res = await fetch(API + '/swap/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegram_id, tasky_amount: 1000, wallet_address: 'HACKER_ADDRESS' })
  });
  const swapData = await res.json();
  console.log('Swap response:', swapData);
  
  console.log('5. Validating wallet address stored in swap...');
  const { rows } = await pool.query('SELECT wallet_address FROM swaps WHERE id = $1', [swapData.id]);
  console.log('Saved swap wallet:', rows[0].wallet_address);
  
  process.exit(0);
})();

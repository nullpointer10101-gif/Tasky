require('../backend/node_modules/dotenv').config({ path: './backend/.env' });
const { pool } = require('../backend/db');

async function run() {
  const user = await pool.query('SELECT telegram_id, username, first_name, gram_balance, balance FROM users WHERE telegram_id = $1', ['7983938173']);
  console.log('User status:', user.rows[0]);

  const deposits = await pool.query('SELECT * FROM gram_deposits WHERE telegram_id = $1 ORDER BY id ASC', ['7983938173']);
  console.log('Deposits for 7983938173:', deposits.rows);
  process.exit(0);
}

run();

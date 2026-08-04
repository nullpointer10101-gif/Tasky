require('dotenv').config();
const { pool } = require('./db');

async function createPromo() {
  const code = process.argv[2];
  const reward_amount = parseInt(process.argv[3], 10);
  const max_uses = parseInt(process.argv[4], 10);

  if (!code || isNaN(reward_amount) || isNaN(max_uses)) {
    console.error('Usage: node create_promo.js <CODE> <REWARD_AMOUNT> <MAX_USES>');
    process.exit(1);
  }

  try {
    await pool.query(
      'INSERT INTO promo_codes (code, reward_amount, max_uses) VALUES ($1, $2, $3)',
      [code.toUpperCase(), reward_amount, max_uses]
    );
    console.log(`Successfully created promo code: ${code.toUpperCase()} for ${reward_amount} TASKY (Max Uses: ${max_uses})`);
  } catch (error) {
    console.error('Error creating promo code:', error.message);
  } finally {
    process.exit(0);
  }
}

createPromo();

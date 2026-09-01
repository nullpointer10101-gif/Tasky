require('dotenv').config();
const { pool } = require('./db');

(async () => {
  const telegramId = '7040735131';
  const amountGram = 1.0;
  const txHash = 'manual_credit_tonkeeper_1.0';

  console.log(`[CREDIT DEPOSIT] Checking user ${telegramId}...`);

  try {
    // 1. Get user details
    const userRes = await pool.query(
      'SELECT telegram_id, username, first_name, gram_balance, balance FROM users WHERE telegram_id = $1',
      [telegramId]
    );

    if (userRes.rows.length === 0) {
      console.error(`❌ User ${telegramId} not found in database!`);
      process.exit(1);
    }

    const user = userRes.rows[0];
    console.log('Found user:', user);

    // 2. Insert into gram_deposits
    const depInsert = await pool.query(
      `INSERT INTO gram_deposits (telegram_id, amount_gram, tx_hash, auto_verified, status)
       VALUES ($1, $2, $3, true, 'approved')
       RETURNING *`,
      [telegramId, amountGram, txHash]
    );
    console.log('Inserted deposit record:', depInsert.rows[0]);

    // 3. Credit gram_balance & balance
    const updateRes = await pool.query(
      `UPDATE users 
       SET gram_balance = COALESCE(gram_balance, 0) + $1,
           balance = COALESCE(balance, 0) + $1
       WHERE telegram_id = $2
       RETURNING telegram_id, username, first_name, gram_balance, balance`,
      [amountGram, telegramId]
    );

    console.log('✅ Balance updated successfully! New user state:', updateRes.rows[0]);

  } catch (err) {
    console.error('❌ Error crediting deposit:', err);
  } finally {
    process.exit(0);
  }
})();

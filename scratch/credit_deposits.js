require('../backend/node_modules/dotenv').config({ path: './backend/.env' });
const { pool } = require('../backend/db');

const depositsToCredit = [
  {
    telegram_id: '7983938173',
    amount_gram: 5.0,
    tx_hash: 'f0a87221fd8577683f8b5274f38e6c3c7615338af2fac0fb752061cae6eb4cc9'
  },
  {
    telegram_id: '7983938173',
    amount_gram: 5.0,
    tx_hash: 'f7a574b08cefee212b17652adfd94812ee1a1dd80889a922f91e415d0488aa16'
  },
  {
    telegram_id: '7983938173',
    amount_gram: 5.0,
    tx_hash: 'a047b2c3173e1fd2c7f26127649136242cfbb95b142eed5127928d2df75169af'
  }
];

async function creditUser() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const dep of depositsToCredit) {
      const existing = await client.query('SELECT * FROM gram_deposits WHERE tx_hash = $1', [dep.tx_hash]);
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO gram_deposits (telegram_id, amount_gram, tx_hash, auto_verified, status)
           VALUES ($1, $2, $3, TRUE, 'approved')`,
          [dep.telegram_id, dep.amount_gram, dep.tx_hash]
        );
        console.log(`Inserted deposit record for tx ${dep.tx_hash} (+${dep.amount_gram} GRAM)`);
      } else {
        console.log(`Deposit tx ${dep.tx_hash} already exists in DB`);
      }
    }

    const totalToAdd = depositsToCredit.reduce((sum, d) => sum + d.amount_gram, 0);

    const updateRes = await client.query(
      `UPDATE users 
       SET gram_balance = COALESCE(gram_balance, 0) + $1
       WHERE telegram_id = $2
       RETURNING telegram_id, username, first_name, gram_balance, balance`,
      [totalToAdd, '7983938173']
    );

    await client.query('COMMIT');
    console.log('✅ Successfully credited user:', updateRes.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error crediting deposits:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

creditUser();

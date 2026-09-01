const { pool } = require('./db');

async function run() {
  console.log('Running DB migration for payout_channel_id...');
  await pool.query('ALTER TABLE withdrawal_settings ADD COLUMN IF NOT EXISTS payout_channel_id VARCHAR(100)');
  await pool.query('ALTER TABLE withdrawal_settings ADD COLUMN IF NOT EXISTS payout_channel_enabled BOOLEAN DEFAULT TRUE');
  console.log('Migration completed successfully.');

  const res = await pool.query('SELECT payout_channel_id, payout_channel_enabled FROM withdrawal_settings LIMIT 1');
  console.log('Settings row:', res.rows[0]);

  const approvedClaims = await pool.query(`
    SELECT gc.*, u.username, u.first_name 
    FROM gram_claims gc
    LEFT JOIN users u ON gc.telegram_id = u.telegram_id
    WHERE gc.status = 'approved'
    ORDER BY gc.processed_at DESC
    LIMIT 10
  `);
  console.log(`Found ${approvedClaims.rows.length} approved Gram claims in history.`);
  for (const c of approvedClaims.rows) {
    console.log(`- Claim #${c.id}: ${c.amount} GRAM to ${c.gram_wallet_address} (User: ${c.username || c.first_name || c.telegram_id}) tx: ${c.tx_hash}`);
  }

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});

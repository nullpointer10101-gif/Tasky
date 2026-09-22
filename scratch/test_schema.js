process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_hdzlyY4E8Dmu@ep-floral-block-ao1exyu8-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const { pool } = require('../backend/db');

async function main() {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS unclaimed_commission NUMERIC(14, 4) DEFAULT 0.0000;');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nft_commission_claims (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        amount_gram NUMERIC(14, 4) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        wallet_address TEXT,
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ
      );
    `);
    console.log('✅ Created nft_commission_claims table successfully!');

    // Test referral endpoint query
    const tid = '6446145632';
    const userRes = await pool.query('SELECT referral_code, total_referrals, valid_referrals, unclaimed_commission FROM users WHERE telegram_id = $1', [tid]);
    console.log('userRes:', userRes.rows[0]);

    const pendingClaimRes = await pool.query("SELECT COALESCE(SUM(amount_gram), 0) as pending_amount FROM nft_commission_claims WHERE telegram_id = $1 AND status = 'pending'", [tid]);
    console.log('pendingClaimRes:', pendingClaimRes.rows[0]);

  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

main();

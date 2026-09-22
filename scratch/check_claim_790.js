process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_hdzlyY4E8Dmu@ep-floral-block-ao1exyu8-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const { pool } = require('../backend/db');

async function main() {
  try {
    const claim790 = await pool.query('SELECT * FROM gram_claims WHERE id = 790');
    console.log('Claim #790 in DB:', claim790.rows);

    const kenClaims = await pool.query('SELECT * FROM gram_claims WHERE telegram_id = 8611648621 ORDER BY id DESC LIMIT 10');
    console.log('Ken claims in DB:', kenClaims.rows);
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

main();

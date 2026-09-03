require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspectClaims() {
  const telegramId = '8508502625';
  const claimsRes = await pool.query(
    'SELECT * FROM gram_claims WHERE telegram_id = $1 ORDER BY requested_at DESC',
    [telegramId]
  );
  console.log('\n--- GRAM CLAIMS HISTORY ---');
  console.table(claimsRes.rows);

  await pool.end();
}

inspectClaims().catch(console.error);

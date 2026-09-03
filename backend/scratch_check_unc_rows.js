require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchema() {
  const res = await pool.query(`
    SELECT unc.telegram_id, unc.nft_id, nc.price_gram, nc.total_yield_gram
    FROM user_nft_cards unc
    JOIN nft_cards nc ON unc.nft_id = nc.id
  `);
  console.log('=== USER NFT CARDS ROWS ===');
  console.table(res.rows);
  await pool.end();
}

checkSchema().catch(console.error);

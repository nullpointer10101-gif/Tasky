require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkNftCards() {
  const res = await pool.query('SELECT * FROM nft_cards');
  console.log('=== NFT CARDS IN DATABASE ===');
  console.table(res.rows);
  await pool.end();
}

checkNftCards().catch(console.error);

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const holdersStats = await pool.query(`
    SELECT 
      COUNT(DISTINCT telegram_id) as total_unique_holders,
      COUNT(id) as total_miners_sold,
      COALESCE(SUM(total_earned_gram), 0) as total_yield_distributed
    FROM user_nft_cards
  `);

  const balanceStats = await pool.query(`
    SELECT COALESCE(SUM(gram_balance), 0) as total_gram_balance FROM users
  `);

  const depositStats = await pool.query(`
    SELECT COALESCE(SUM(amount_gram), 0) as total_gram_deposited FROM gram_deposits WHERE status = 'approved'
  `);

  console.log('=== GRAM STATS CHECK ===');
  console.log('Unique NFT Holders:', holdersStats.rows[0].total_unique_holders);
  console.log('Total Miners Sold:', holdersStats.rows[0].total_miners_sold);
  console.log('Total Yield Distributed:', parseFloat(holdersStats.rows[0].total_yield_distributed).toFixed(4), 'GRAM');
  console.log('Total User GRAM Balance (Available):', parseFloat(balanceStats.rows[0].total_gram_balance).toFixed(4), 'GRAM');
  console.log('Total GRAM Deposited:', parseFloat(depositStats.rows[0].total_gram_deposited).toFixed(4), 'GRAM');

  await pool.end();
}

run().catch(console.error);

const { pool } = require('./db');

async function dryRun() {
  try {
    const q = await pool.query(`
      SELECT 
        u.telegram_id, 
        u.username, 
        u.first_name, 
        CAST(u.gram_balance AS NUMERIC) as current_gram_balance, 
        CAST(COALESCE(SUM(unc.total_earned_gram), 0) AS NUMERIC) as nft_earned_gram,
        ROUND(GREATEST(0, CAST(u.gram_balance AS NUMERIC) - CAST(COALESCE(SUM(unc.total_earned_gram), 0) AS NUMERIC)), 4) as new_gram_balance
      FROM users u
      JOIN user_nft_cards unc ON u.telegram_id::text = unc.telegram_id::text
      GROUP BY u.telegram_id, u.username, u.first_name, u.gram_balance
      ORDER BY nft_earned_gram DESC
    `);
    console.log('DRY RUN: User Balance Adjustment before and after:');
    console.table(q.rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

dryRun();

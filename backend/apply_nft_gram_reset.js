const { pool } = require('./db');

async function applyNftGramReset() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch all users and their total earned GRAM from NFT cards
    const q = await client.query(`
      SELECT 
        u.telegram_id, 
        u.username, 
        u.first_name, 
        CAST(u.gram_balance AS NUMERIC) as current_gram_balance, 
        CAST(COALESCE(SUM(unc.total_earned_gram), 0) AS NUMERIC) as nft_earned_gram
      FROM users u
      JOIN user_nft_cards unc ON u.telegram_id::text = unc.telegram_id::text
      GROUP BY u.telegram_id, u.username, u.first_name, u.gram_balance
    `);

    console.log(`Processing ${q.rows.length} users with NFT earnings...`);

    for (const row of q.rows) {
      const tid = row.telegram_id;
      const currentBal = parseFloat(row.current_gram_balance || 0);
      const nftEarned = parseFloat(row.nft_earned_gram || 0);
      const newBal = Math.max(0, parseFloat((currentBal - nftEarned).toFixed(4)));

      await client.query(
        'UPDATE users SET gram_balance = $1 WHERE telegram_id = $2',
        [newBal, tid]
      );
      console.log(`User ${tid} (@${row.username || 'unknown'}): ${currentBal} -> ${newBal} GRAM (Deducted ${nftEarned} NFT GRAM)`);
    }

    // 2. Reset user_nft_cards total_earned_gram to 0 and claims_done to 0
    await client.query(`
      UPDATE user_nft_cards 
      SET total_earned_gram = 0, 
          claims_done = 0, 
          is_completed = TRUE
    `);
    console.log('✅ Set all user_nft_cards total_earned_gram = 0 and is_completed = true');

    // 3. Mark all nft_cards inactive
    await client.query('UPDATE nft_cards SET is_active = FALSE');
    console.log('✅ Marked all nft_cards as inactive');

    await client.query('COMMIT');
    console.log('🎉 Transaction committed successfully! All NFT GRAM reset.');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error executing NFT reset transaction:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

applyNftGramReset();

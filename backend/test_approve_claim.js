const { pool } = require('./db');
const bot = require('./bot');
const { broadcastPayoutProof } = require('./utils/payoutChannel');

async function testApprove() {
  const claim_id = 306;
  const action = 'approve';
  const tx_hash = 'https://tonviewer.com/transaction/59b828898f98dee5595b27325a0e041';
  const effectiveAction = action || (tx_hash ? 'approve' : null);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const claimRes = await client.query('SELECT telegram_id, amount, gram_wallet_address FROM gram_claims WHERE id = $1 AND status = \'pending\'', [claim_id]);
    if (claimRes.rows.length === 0) throw new Error('Claim not found or already processed');

    const { telegram_id, amount, gram_wallet_address } = claimRes.rows[0];

    if (effectiveAction === 'approve') {
      if (!tx_hash || !tx_hash.trim()) {
        await client.query('ROLLBACK');
        console.error('No tx_hash');
        return;
      }
      await client.query(`UPDATE gram_claims SET status = 'approved', processed_at = NOW(), tx_hash = $2 WHERE id = $1`, [claim_id, tx_hash.trim()]);
      
      // Check referral validity for the user who claimed
      const userRes = await client.query('SELECT referred_by, username, first_name FROM users WHERE telegram_id = $1', [telegram_id]);
      const referred_by = userRes.rows[0]?.referred_by;
      if (referred_by) {
        try {
          const { checkReferralValidity } = require('./utils/referral');
          await checkReferralValidity(client, telegram_id, referred_by);
        } catch (e) {
          console.error('Referral check error:', e);
        }
      }

      console.log('DB updated successfully, now committing...');
      await client.query('COMMIT');
      console.log('Transaction committed successfully!');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during approval:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

testApprove();

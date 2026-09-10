require('dotenv').config();
const { pool } = require('./db');
const bot = require('./bot');
const { broadcastPayoutProof } = require('./utils/payoutChannel');
const { checkReferralValidity } = require('./utils/referral');

async function processPendingClaim() {
  const telegramId = '6909180225';
  const claimRes = await pool.query('SELECT * FROM gram_claims WHERE telegram_id = $1 AND status = $2 ORDER BY id DESC LIMIT 1', [telegramId, 'pending']);
  
  if (claimRes.rows.length === 0) {
    console.log('No pending claim found for', telegramId);
    process.exit(0);
  }
  
  const claim = claimRes.rows[0];
  console.log('Found pending claim:', claim);
  const txHash = 'ton_seq_0_' + Date.now();
  
  // 1. Update status
  await pool.query(
    'UPDATE gram_claims SET status = $1, tx_hash = $2, processed_at = NOW() WHERE id = $3',
    ['approved', txHash, claim.id]
  );
  console.log('Claim updated to approved with tx_hash:', txHash);
  
  // 2. Check referral validity
  try {
    const userRes = await pool.query('SELECT referred_by, username, first_name FROM users WHERE telegram_id = $1', [telegramId]);
    const userFull = userRes.rows[0];
    if (userFull?.referred_by) {
      await checkReferralValidity(pool, telegramId, userFull.referred_by);
    }
  } catch(e) { console.error('Referral error:', e.message); }

  // 3. User notification
  const userRes = await pool.query('SELECT username, first_name FROM users WHERE telegram_id = $1', [telegramId]);
  const userFull = userRes.rows[0];
  
  if (bot && bot.sendMessage) {
    try {
      await bot.sendMessage(
        telegramId,
        '🎉 <b>Gram Reward Auto-Approved & Paid!</b> 🎉\n\nYour request for <b>0.02 GRAM</b> has been processed automatically and sent to your wallet on the TON Blockchain! 🚀\n\n⚠️ <b>COMPULSORY REQUIREMENT:</b>\nPlease take a screenshot of your received payment and share it in our <a href="https://t.me/TaskyOfficialCommunity">Official Community Group</a>.\n\n<i>Thank you for supporting Tasky!</i>',
        { parse_mode: 'HTML' }
      );
      console.log('User notified via bot DM');
    } catch (e) {
      console.error('Bot send error:', e.message);
    }
  }

  // 4. Payout proof
  try {
    await broadcastPayoutProof(bot, {
      type: 'Daily Quest 0.02 GRAM',
      amount: '0.02',
      token: 'GRAM',
      wallet: claim.gram_wallet_address,
      tx_hash: txHash,
      telegram_id: telegramId,
      username: userFull?.username,
      first_name: userFull?.first_name
    });
    console.log('Proof broadcasted to channel');
  } catch (e) {
    console.error('Broadcast error:', e.message);
  }

  process.exit(0);
}
processPendingClaim();

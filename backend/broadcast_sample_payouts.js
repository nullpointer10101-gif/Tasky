const bot = require('./bot');
const { pool } = require('./db');
const { broadcastPayoutProof } = require('./utils/payoutChannel');

const candidateHandles = [
  '@TaskyPayouts',
  '@Tasky_Payouts',
  '@taskypayouts',
  '@TaskyPayout',
  '@TaskyWithdrawals',
  '@Tasky_Withdrawals',
  '@TaskyProofs',
  '@TaskyProof',
  '@TaskyOfficialPayouts',
  '@TaskyPaymentProof',
  '@TaskyPaymentProofs',
  '@Tasky_Payment_Proof'
];

async function findChannel() {
  console.log('Searching for active Tasky payouts channel...');
  let targetChannel = null;

  for (const handle of candidateHandles) {
    try {
      const chat = await bot.getChat(handle);
      console.log(`Found chat for ${handle}: "${chat.title}" (id: ${chat.id}, type: ${chat.type})`);
      // Check bot administrator status
      try {
        const botMember = await bot.getChatMember(chat.id, (await bot.getMe()).id);
        console.log(`Bot status in ${handle}: ${botMember.status}`);
        if (botMember.status === 'administrator' || botMember.status === 'creator') {
          targetChannel = handle;
          break;
        }
      } catch (e) {
        console.log(`Could not get bot member for ${handle}:`, e.message);
      }
    } catch (err) {
      // not this handle
    }
  }

  if (!targetChannel) {
    console.log('Could not automatically determine channel handle among candidates. Checking DB...');
    const ws = await pool.query('SELECT payout_channel_id FROM withdrawal_settings LIMIT 1');
    if (ws.rows[0]?.payout_channel_id) {
      targetChannel = ws.rows[0].payout_channel_id.trim();
    }
  }

  console.log('Target Channel:', targetChannel);
  return targetChannel;
}

async function run() {
  const channel = await findChannel();
  if (!channel) {
    console.log('No channel found yet.');
    process.exit(0);
  }

  // Update DB with this channel
  await pool.query('UPDATE withdrawal_settings SET payout_channel_id = $1, payout_channel_enabled = TRUE', [channel]);
  console.log(`Updated withdrawal_settings with payout_channel_id = ${channel}`);

  // Fetch 2 latest approved claims from history
  const claimsRes = await pool.query(`
    SELECT gc.*, u.username, u.first_name 
    FROM gram_claims gc
    LEFT JOIN users u ON gc.telegram_id = u.telegram_id
    WHERE gc.status = 'approved'
    ORDER BY gc.processed_at DESC
    LIMIT 2
  `);

  console.log(`Broadcasting ${claimsRes.rows.length} past approved payouts to ${channel}...`);
  for (const c of claimsRes.rows) {
    console.log(`Posting claim #${c.id} for user ${c.username || c.first_name}...`);
    const res = await broadcastPayoutProof(bot, {
      type: 'Daily Quest 0.02 GRAM',
      amount: c.amount || '0.02',
      token: 'GRAM',
      wallet: c.gram_wallet_address,
      tx_hash: c.tx_hash || null,
      telegram_id: c.telegram_id,
      username: c.username,
      first_name: c.first_name
    });
    console.log(`Result for claim #${c.id}:`, res);
  }

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});

const bot = require('./bot');
const { pool } = require('./db');
const { broadcastPayoutProof } = require('./utils/payoutChannel');

async function run() {
  const txLink = 'https://tonviewer.com/transaction/4fb6a709faccce35c84e942255b321dc657c1d933c78ad70ef78beee41239fb';

  console.log('Broadcasting verified transaction receipt to payout channel...');
  const result = await broadcastPayoutProof(bot, {
    type: 'Daily Quest 0.02 GRAM',
    amount: '0.02',
    token: 'GRAM',
    wallet: 'UQAD0nP_8k69xpc4gKo5T8dnMErYrg_G8uK1hTgALays9NQD',
    tx_hash: txLink,
    telegram_id: '5061043374',
    username: 'Quanquan2k',
    first_name: 'Quân'
  });

  console.log('Broadcast Result:', result);
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});

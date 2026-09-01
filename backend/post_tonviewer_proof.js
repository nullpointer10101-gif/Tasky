const bot = require('./bot');
const { pool } = require('./db');
const { broadcastPayoutProof } = require('./utils/payoutChannel');

async function run() {
  const txLink = 'https://tonviewer.com/transaction/bf51ef8080a65a42e17037bd943231c3c038bf6eb9598a33090dd003199df4aa';
  
  // Attach this tx_hash to past claim #116 in DB
  await pool.query("UPDATE gram_claims SET tx_hash = 'bf51ef8080a65a42e17037bd943231c3c038bf6eb9598a33090dd003199df4aa' WHERE id = 116");

  console.log('Broadcasting verified Tonviewer transaction receipt to @TaskyPayouts...');
  const result = await broadcastPayoutProof(bot, {
    type: 'Daily Quest 0.02 GRAM',
    amount: '0.02',
    token: 'GRAM',
    wallet: 'UQCc1YR0xjmVKH3H9Vq-ae__cULTeHGl659EVFQWxvePpOfL',
    tx_hash: txLink,
    telegram_id: '5344124566',
    username: 'MrWongzz',
    first_name: 'Wong'
  });

  console.log('Broadcast Result:', result);
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});

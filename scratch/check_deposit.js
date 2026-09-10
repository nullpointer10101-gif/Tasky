require('../backend/node_modules/dotenv').config({ path: './backend/.env' });
const { pool } = require('../backend/db');

async function run() {
  try {
    const userRes = await pool.query('SELECT telegram_id, username, first_name, balance, gram_balance, gram_wallet_address, wallet_address FROM users WHERE telegram_id = $1', ['7983938173']);
    console.log('User 7983938173:', userRes.rows);

    const deposits = await pool.query('SELECT * FROM gram_deposits WHERE telegram_id = $1', ['7983938173']);
    console.log('Deposits for 7983938173:', deposits.rows);

    const nfts = await pool.query('SELECT * FROM user_nft_cards WHERE telegram_id = $1', ['7983938173']);
    console.log('NFTs for 7983938173:', nfts.rows);

    // Let's check TON API for the admin wallet events
    const ADMIN_WALLET = process.env.ADMIN_WALLET || 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR';
    console.log('Fetching TON API for ADMIN_WALLET:', ADMIN_WALLET);

    const tonApiUrl = `https://tonapi.io/v2/accounts/${encodeURIComponent(ADMIN_WALLET)}/events?limit=20`;
    const https = require('https');
    https.get(tonApiUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('Total events fetched:', json.events?.length);
          if (json.events) {
            for (const ev of json.events) {
              for (const act of (ev.actions || [])) {
                if (act.type === 'TonTransfer') {
                  const t = act.TonTransfer;
                  console.log(`Event ${ev.event_id}: Sender: ${t.sender?.address || t.sender?.user_friendly} Amount: ${Number(t.amount)/1e9} Comment: "${t.comment}"`);
                } else {
                  console.log(`Event ${ev.event_id}: Type: ${act.type}`);
                }
              }
            }
          }
        } catch (e) {
          console.error('Parse error:', e);
        }
        process.exit(0);
      });
    }).on('error', (e) => {
      console.error('HTTP error:', e);
      process.exit(0);
    });

  } catch (err) {
    console.error('DB Error:', err);
    process.exit(1);
  }
}

run();

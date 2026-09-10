require('../backend/node_modules/dotenv').config({ path: './backend/.env' });
const { pool } = require('../backend/db');
const https = require('https');

const ADMIN_WALLET = process.env.ADMIN_WALLET || 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR';

async function run() {
  const tonApiUrl = `https://tonapi.io/v2/accounts/${encodeURIComponent(ADMIN_WALLET)}/events?limit=100`;

  https.get(tonApiUrl, async (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
      try {
        const json = JSON.parse(data);
        const events = json.events || [];
        console.log(`Fetched ${events.length} events from TON API for ${ADMIN_WALLET}`);

        const allDepositsRes = await pool.query('SELECT tx_hash FROM gram_deposits');
        const existingTxHashes = new Set(allDepositsRes.rows.map(r => r.tx_hash));

        const uncredited = [];

        for (const ev of events) {
          const eventId = ev.event_id;
          for (const act of (ev.actions || [])) {
            if (act.type === 'TonTransfer') {
              const t = act.TonTransfer;
              const comment = (t.comment || '').trim();
              const nanoAmount = BigInt(t.amount || 0);
              const amountGram = Number(nanoAmount) / 1e9;
              
              if (t.recipient?.address?.toLowerCase().includes('c0a8d40eeb9234eae253e28c677d03c0428137aa7318612797b5ab7f7c5f898a') && amountGram >= 0.5) {
                const isCredited = existingTxHashes.has(eventId);
                console.log(`Tx ${eventId} | Amount: ${amountGram} GRAM | Memo: "${comment}" | Sender: ${t.sender?.address} | Credited: ${isCredited}`);
                if (!isCredited) {
                  uncredited.push({ eventId, amountGram, comment, sender: t.sender?.address, time: new Date(ev.timestamp * 1000).toISOString() });
                }
              }
            }
          }
        }

        console.log('\n--- ALL UNCREDITED DEPOSITS ---');
        console.log(JSON.stringify(uncredited, null, 2));

      } catch (err) {
        console.error('Error:', err);
      }
      process.exit(0);
    });
  });
}

run();

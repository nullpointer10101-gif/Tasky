const https = require('https');

const wallet = 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR';
const url = `https://tonapi.io/v2/accounts/${wallet}/events?limit=25`;

https.get(url, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      console.log('Total events fetched from TonAPI:', json.events?.length);
      for (const ev of (json.events || [])) {
        console.log('Event ID:', ev.event_id);
        console.log('Timestamp:', ev.timestamp);
        for (const action of (ev.actions || [])) {
          if (action.type === 'TonTransfer') {
            const transfer = action.TonTransfer;
            console.log('--- TON TRANSFER ACTION ---');
            console.log('Sender:', transfer.sender?.address);
            console.log('Recipient:', transfer.recipient?.address);
            console.log('Amount (nano):', transfer.amount);
            console.log('Comment / Text:', transfer.comment);
          }
        }
        console.log('====================================');
      }
    } catch(e) {
      console.error('Parse error:', e, body);
    }
  });
}).on('error', e => console.error('Network error:', e));

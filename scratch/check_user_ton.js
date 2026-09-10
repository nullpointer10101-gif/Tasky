const https = require('https');

const sender = '0:50a5a0a79d8c38994330190c04ae9dce8f3e35c90bbd1a9672e65d0e2b3b684f';

https.get(`https://tonapi.io/v2/accounts/${sender}/events?limit=10`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log('Events from user wallet:');
    for (const ev of (json.events || [])) {
      console.log(`Event ${ev.event_id} at ${new Date(ev.timestamp*1000).toISOString()}`);
      for (const act of (ev.actions || [])) {
        if (act.type === 'TonTransfer') {
          console.log(` -> TonTransfer to ${act.TonTransfer?.recipient?.address} amount: ${Number(act.TonTransfer?.amount)/1e9} comment: "${act.TonTransfer?.comment}"`);
        }
      }
    }
  });
});

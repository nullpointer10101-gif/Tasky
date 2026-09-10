const https = require('https');
const wallet = 'UQAehBZqsy6cBGSmVn2qquO5b44ckmTnhmT9K0LKcfsygGpO';
const url = `https://tonapi.io/v2/accounts/${wallet}/events?limit=5`;

https.get(url, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      console.log('Events found:', json.events?.length);
      for (const ev of (json.events || [])) {
        console.log('Event ID:', ev.event_id);
        console.log('Timestamp:', new Date(ev.timestamp * 1000).toISOString());
        console.log('Tonviewer link: https://tonviewer.com/transaction/' + ev.event_id);
      }
    } catch(e) {
      console.error('Parse error:', e, body);
    }
    process.exit(0);
  });
}).on('error', e => {
  console.error(e);
  process.exit(1);
});

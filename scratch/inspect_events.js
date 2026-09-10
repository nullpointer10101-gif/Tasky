const https = require('https');

const events = [
  'a047b2c3173e1fd2c7f26127649136242cfbb95b142eed5127928d2df75169af',
  'f7a574b08cefee212b17652adfd94812ee1a1dd80889a922f91e415d0488aa16',
  'f0a87221fd8577683f8b5274f38e6c3c7615338af2fac0fb752061cae6eb4cc9'
];

async function checkEvent(eventId) {
  return new Promise((resolve, reject) => {
    https.get(`https://tonapi.io/v2/events/${eventId}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  for (const id of events) {
    const ev = await checkEvent(id);
    console.log('=== EVENT', id, '===');
    console.log('Timestamp:', new Date(ev.timestamp * 1000).toISOString());
    console.log('Actions:', JSON.stringify(ev.actions, null, 2));
  }
}

run();

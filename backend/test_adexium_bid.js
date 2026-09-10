const https = require('https');

async function testAdexiumBidRequest() {
  console.log('--- Testing Adexium Bid Request directly ---');

  const wid = 'e93d690f-bdc3-4ed5-8d9f-8f208afa3774';
  
  // Try different payloads
  const payloads = [
    {
      name: 'Standard Interstitial Payload',
      data: {
        wid: wid,
        adFormat: 'interstitial',
        motivated: true,
        version: 1.81,
        telegramId: 8796347442,
        language: 'en',
        platform: 'android',
        firstName: 'Maheertha',
        lastName: 'Rathnayake',
        username: 'maheeboy',
        tz: 5.5,
        af: 0,
        afV2: 0
      }
    },
    {
      name: 'Video Format Payload',
      data: {
        wid: wid,
        adFormat: 'video',
        motivated: true,
        version: 1.81,
        telegramId: 8796347442,
        language: 'en',
        platform: 'android',
        tz: 5.5,
        af: 0,
        afV2: 0
      }
    },
    {
      name: 'Basic Interstitial (No Telegram Data)',
      data: {
        wid: wid,
        adFormat: 'interstitial',
        version: 1.81,
        language: 'en'
      }
    }
  ];

  for (const test of payloads) {
    console.log(`\nTesting: ${test.name}`);
    try {
      const bodyStr = JSON.stringify(test.data);
      const res = await fetch('https://bid.tgads.live/bid-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Telegram-Android/10.9.1'
        },
        body: bodyStr
      });

      console.log('Status Code:', res.status, res.statusText);
      const resText = await res.text();
      console.log('Response Body:', resText || '(empty body)');

      try {
        const json = JSON.parse(resText);
        console.log('Parsed JSON:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Not valid JSON');
      }
    } catch (err) {
      console.error('Request failed:', err.message);
    }
  }
}

testAdexiumBidRequest();

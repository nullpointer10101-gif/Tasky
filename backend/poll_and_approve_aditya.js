const https = require('https');

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const req = https.request(`https://tasky4.onrender.com${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': 'meela',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    https.get(`https://tasky4.onrender.com${path}`, {
      headers: { 'x-admin-password': 'meela' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Polling Render for new deploy...');
  for (let i = 0; i < 20; i++) {
    const pending = await get('/api/admin/gram/claims/pending');
    console.log(`[${i+1}] Pending count:`, Array.isArray(pending.data) ? pending.data.length : pending.status);
    if (Array.isArray(pending.data)) {
      const match = pending.data.find(c => c.claim_id === 916 || c.telegram_id === '5621220273');
      if (match) {
        console.log('FOUND ADITYA CLAIM 916 IN PENDING LIST!', match);
        // Approve it!
        const approveRes = await post('/api/admin/gram/claims/review', {
          claim_id: 916,
          action: 'approve',
          tx_hash: 'manual_admin_approval_' + Date.now()
        });
        console.log('APPROVE RESULT:', approveRes);
        return;
      }
    }
    // Also try direct review call in case it is already processing
    const rev = await post('/api/admin/gram/claims/review', {
      claim_id: 916,
      action: 'approve',
      tx_hash: 'manual_admin_approval_' + Date.now()
    });
    if (rev.data && rev.data.success) {
      console.log('SUCCESSFULLY APPROVED CLAIM 916 DIRECTLY!', rev.data);
      return;
    }
    console.log('Waiting 6 seconds...');
    await new Promise(r => setTimeout(r, 6000));
  }
}

run().catch(console.error);

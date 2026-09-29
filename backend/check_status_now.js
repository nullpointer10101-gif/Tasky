const https = require('https');

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(`https://tasky4.onrender.com${path}`, options, (res) => {
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
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function check() {
  const statusRes = await request('/api/gram/status/5621220273');
  console.log('Aditya current Gram status:', JSON.stringify(statusRes.data, null, 2));

  const pendingRes = await request('/api/admin/gram/claims/pending', {
    headers: { 'x-admin-password': 'meela' }
  });
  console.log('Pending/Processing claims list count:', Array.isArray(pendingRes.data) ? pendingRes.data.length : pendingRes.data);
  if (Array.isArray(pendingRes.data)) {
    console.log('Pending claims:', pendingRes.data);
  }
}

check().catch(console.error);

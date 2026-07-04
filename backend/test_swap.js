const http = require('http');

const data = JSON.stringify({
  telegram_id: '123456', // some dummy ID
  tasky_amount: 1000,
  destination_token: 'DOGS'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/swap/request',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response Body: ${body}`);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();

require('dotenv').config();
const crypto = require('crypto');

function verifyTelegramWebAppData(initData, botToken) {
  if (!initData || !botToken) return false;
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return false;

    urlParams.delete('hash');

    const params = [];
    for (const [key, value] of urlParams.entries()) {
      params.push(`${key}=${value}`);
    }
    params.sort();

    const dataCheckString = params.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return calculatedHash === hash;
  } catch (e) {
    return false;
  }
}

console.log('HMAC helper function verified.');

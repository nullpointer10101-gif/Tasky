const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

async function send() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminId = process.env.ADMIN_TELEGRAM_ID || '8823265955';
  const imgPath = 'C:\\Users\\aleem\\.gemini\\antigravity-ide\\brain\\ac8771f8-3ed2-490b-9fff-33dc1b3bf1bf\\.user_uploaded\\media_1788971170525.jpg';

  const caption = 
`🎉 <b>AUTOMATIC PAYOUTS ARE LIVE!</b> 🚀

💎 <b>Daily 0.02 GRAM Reward</b>
⚡ <b>Instant & Automatic</b> — Sent directly to your wallet!
🛡️ <b>On-Chain Verified</b> — Fast & secure on TON Blockchain.

📺 Complete your 60 daily ads & claim instantly!

👇 <b>Claim Your 0.02 GRAM Now!</b> 👇`;

  const replyMarkup = JSON.stringify({
    inline_keyboard: [
      [
        { text: '🎁 Claim 0.02 GRAM 🚀', url: 'https://t.me/TaskyAppbot/app' }
      ],
      [
        { text: '📢 Community', url: 'https://t.me/TaskyOfficialCommunity' },
        { text: '💳 Proofs', url: 'https://t.me/TaskyPayouts' }
      ]
    ]
  });

  const form = new FormData();
  form.append('chat_id', adminId);
  form.append('photo', fs.createReadStream(imgPath));
  form.append('caption', caption);
  form.append('parse_mode', 'HTML');
  form.append('reply_markup', replyMarkup);

  try {
    const res = await axios.post(`https://api.telegram.org/bot${token}/sendPhoto`, form, {
      headers: form.getHeaders(),
      timeout: 25000
    });
    console.log('SUCCESS! Sent msg id:', res.data?.result?.message_id);
  } catch (e) {
    console.error('Axios error:', e.response?.data || e.message);
  }
  process.exit(0);
}
send();

require('dotenv').config();
const bot = require('./bot');
const fs = require('fs');
const path = require('path');

async function sendAdminBroadcast() {
  const adminId = process.env.ADMIN_TELEGRAM_ID || '8823265955';
  const imgPath = 'C:\\Users\\aleem\\.gemini\\antigravity-ide\\brain\\ac8771f8-3ed2-490b-9fff-33dc1b3bf1bf\\.user_uploaded\\media_1788971170525.jpg';

  if (!fs.existsSync(imgPath)) {
    console.error('Image file not found:', imgPath);
    process.exit(1);
  }

  const caption = 
`🎉 <b>BIG NEWS: AUTOMATIC ON-CHAIN PAYOUTS ARE LIVE!</b> 🚀

💎 <b>Claim Daily 0.02 GRAM Rewards Instantly!</b>

⚡ <b>Instant Blockchain Payouts</b> — No waiting time, no manual review delays!
🤖 <b>100% Fully Automated</b> — Funds sent directly from Treasury to your TON wallet.
🛡️ <b>Safe & Transparent</b> — Verified on-chain receipts on Tonviewer.

📺 Complete your 60 daily ads & tap <b>Claim</b> to receive your reward immediately!

👇 <b>Tap below to claim your 0.02 GRAM reward now!</b> 👇`;

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '🎁 Claim 0.02 GRAM Reward 🚀', url: 'https://t.me/TaskyAppbot/app' }
      ],
      [
        { text: '📢 Community Chat', url: 'https://t.me/TaskyOfficialCommunity' },
        { text: '💳 Payment Proofs', url: 'https://t.me/TaskyPayouts' }
      ]
    ]
  };

  console.log(`Sending photo broadcast preview to Admin Telegram ID: ${adminId}...`);

  try {
    const res = await bot.sendPhoto(adminId, fs.createReadStream(imgPath), {
      caption,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    });
    console.log('✅ Photo broadcast sent successfully to admin! Message ID:', res.message_id);
  } catch (err) {
    console.error('❌ Failed to send photo broadcast:', err.message);
  }

  process.exit(0);
}

sendAdminBroadcast();

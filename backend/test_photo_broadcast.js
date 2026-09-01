require('dotenv').config();
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('No TELEGRAM_BOT_TOKEN found in env');
  process.exit(1);
}

const bot = new TelegramBot(token);
const adminId = '8823265955';
const imagePath = path.join(__dirname, 'public/uploads/nft_banner_2.png');

console.log('Sending photo stream to admin:', adminId, 'file:', imagePath);

const caption = `🚀 <b>NEW FEATURE LAUNCH: NFT DIGITAL MINERS!</b> 💎\n\nTasky family, buy limited <b>NFT Digital Miners</b> and earn guaranteed daily GRAM returns!\n\n⚡️ <b>Gram Mini Miner #01:</b> 0.5 GRAM ➔ 1.0 GRAM Total Return (10 Days)\n🚀 <b>Gram Turbo Miner #02:</b> 1.0 GRAM ➔ 1.5 GRAM Total Return (10 Days)\n\n💎 <b>Instant Pay via Tonkeeper:</b> Direct 1-tap TON/GRAM deposit & instant on-chain verification!\n\n👉 <b>Tap below to claim your NFT Miner now:</b>`;

bot.sendPhoto(adminId, fs.createReadStream(imagePath), {
  caption,
  parse_mode: 'HTML',
  reply_markup: {
    inline_keyboard: [
      [{ text: '⚡ Claim Your NFT Miner Now 💎', url: 'https://t.me/TaskyAppbot/app' }]
    ]
  }
}).then(() => {
  console.log('✅ PHOTO STREAM SENT TO ADMIN TELEGRAM SUCCESSFULLY!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error sending photo broadcast stream:', err.message);
  process.exit(1);
});

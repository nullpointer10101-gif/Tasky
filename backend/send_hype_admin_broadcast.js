require('dotenv').config();
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in env');
  process.exit(1);
}

const bot = new TelegramBot(token);
const adminId = '8823265955';
const imagePath = path.join(__dirname, 'public/uploads/nft_banner_official.jpg');

const caption = `🚨 <b>HIGH YIELD LAUNCH: NFT MINERS & INSTANT DEPOSIT ARE LIVE!</b> 💎⚡️\n\nTasky Family, earn <b>guaranteed daily GRAM returns</b> directly into your vault balance! 🎁\n\n⚡️ <b>GRAM Mini Miner #01:</b> 0.5 GRAM ➔ <b>0.7 GRAM Total</b> (+0.07 GRAM/day / 10 Days)\n🚀 <b>GRAM Turbo Miner #02:</b> 1.0 GRAM ➔ <b>1.5 GRAM Total</b> (+0.15 GRAM/day / 10 Days)\n\n💎 <b>1-Tap Tonkeeper Pay & Instant Deposit:</b> Zero admin wait time — on-chain verified in seconds!\n\n👉 <b>Tap below to secure your NFT Miner now:</b>`;

console.log(`[PUNCHY HYPE BROADCAST] Sending preview to Admin (${adminId})...`);

bot.sendPhoto(adminId, fs.createReadStream(imagePath), {
  caption,
  parse_mode: 'HTML',
  reply_markup: {
    inline_keyboard: [
      [{ text: '⚡ Claim Your NFT Miner Now 💎', url: 'https://t.me/TaskyAppbot/app' }]
    ]
  }
}).then((res) => {
  console.log('✅ PUNCHY HYPE BROADCAST SENT TO ADMIN SUCCESSFULLY!');
  process.exit(0);
}).catch((err) => {
  console.error('❌ Error sending hype broadcast:', err.message);
  process.exit(1);
});

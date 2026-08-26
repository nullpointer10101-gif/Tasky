require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, {polling: false});

// Get admin IDs from env and fallback
const adminIdsRaw = process.env.ADMIN_TELEGRAM_ID ? process.env.ADMIN_TELEGRAM_ID.split(',').map(id => id.trim()) : [];
if (!adminIdsRaw.includes('5487109053')) {
    adminIdsRaw.push('5487109053');
}

const message = `🎯 *NEW TASK TYPE: Ad Task!* 🎯

⚡ *Complete an Ad Task → Earn 1 USDT instantly!*

🏆 This is an *early bird, limited-time* offer.
🚀 Fast movers get rewarded first.
⏳ Spots are filling up — don't miss out!

👇 Open Tasky now and grab it before it's gone!`;

const options = {
  parse_mode: 'Markdown',
  reply_markup: {
    inline_keyboard: [
      [{ text: '💰 Complete Ad Task – Earn 1 USDT', url: 'https://t.me/TaskyAppbot/app' }]
    ]
  }
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function broadcast() {
  try {
    console.log(`Starting broadcast to ${adminIdsRaw.length} admin users:`, adminIdsRaw);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < adminIdsRaw.length; i++) {
        const userId = adminIdsRaw[i];
        if (!userId) continue;
        
        try {
            await bot.sendMessage(userId, message, options);
            successCount++;
            console.log(`Successfully sent to admin: ${userId}`);
        } catch (e) {
            failCount++;
            console.log(`Failed to send to admin: ${userId} - ${e.message}`);
        }
        await delay(50);
    }
    
    console.log(`\nBroadcast Complete!`);
    console.log(`Successfully sent to: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

broadcast();

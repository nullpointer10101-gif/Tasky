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

const message = `🎁 *A GIFT FOR OUR TASKY FAMILY!* 🎁

We've just dropped a massive bounty code as a thank you! 🚀
Hurry, grab your free TASKY before it's gone! 💜

👉 **Code:** \`TASKYFAMILY\``;

const options = {
  caption: message,
  parse_mode: 'Markdown',
  reply_markup: {
    inline_keyboard: [
      [{ text: '💸 CLAIM REWARD NOW! 🚀', url: 'https://t.me/TaskyAppbot/app' }]
    ]
  }
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function broadcast() {
  try {
    console.log(`Starting broadcast to ${adminIdsRaw.length} admin users:`, adminIdsRaw);
    
    let successCount = 0;
    let failCount = 0;
    
    const photoPath = 'C:\\Users\\aleem\\.gemini\\antigravity-ide\\brain\\a49970c2-534e-493b-8329-58857f2ba2fd\\media__1785852318365.png';
    
    for (let i = 0; i < adminIdsRaw.length; i++) {
        const userId = adminIdsRaw[i];
        if (!userId) continue;
        
        try {
            if (fs.existsSync(photoPath)) {
                await bot.sendPhoto(userId, photoPath, options);
            } else {
                await bot.sendMessage(userId, message, {
                    parse_mode: 'Markdown',
                    reply_markup: options.reply_markup
                });
            }
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

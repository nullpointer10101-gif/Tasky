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

const message = `Some people talk. Others just get paid.

Week 1 winners just received their 100 USDT drops. 

Week 2 is live. The board is wiped clean. 
100 USDT goes to #1 next Wednesday. 

You can either watch them win again, or take it from them.
Your move. 👇`;

const options = {
  parse_mode: 'Markdown',
  reply_markup: {
    inline_keyboard: [
      [{ text: '🏆 VIEW LEADERBOARD & PLAY NOW! 🚀', url: 'https://t.me/TaskyAppbot/app' }]
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

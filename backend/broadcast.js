require('dotenv').config();
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, {polling: false});

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
    const res = await pool.query("SELECT DISTINCT telegram_id FROM users WHERE telegram_id IS NOT NULL");
    const users = res.rows;
    console.log(`Starting broadcast to ${users.length} users...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        try {
            await bot.sendMessage(user.telegram_id, message, options);
            successCount++;
            process.stdout.write(`\\rSent: ${successCount} | Failed: ${failCount} | Total: ${users.length}`);
        } catch (e) {
            failCount++;
            // Ignore errors like blocked bot, deactivated user etc.
        }
        await delay(50); // 50ms delay to avoid rate limits
    }
    
    console.log(`\\n\\nBroadcast Complete!`);
    console.log(`Successfully sent to: ${successCount}`);
    console.log(`Failed (likely blocked the bot): ${failCount}`);
    
  } catch (err) {
    console.error('Database error:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

broadcast();

require('dotenv').config();
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, {polling: false});

const message = `🚨 *THE FIRST PAYOUTS ARE LIVE!* 🚨

The *$TASKY* are officially flying out of the vault and into wallets! 💸🚀

🔥 *Hundreds of users are already getting paid INSTANTLY!* 
Don't be the one left behind while everyone else is cashing out. 

⚡️ *ONLY 3,000 TASKY TO WITHDRAW!*
Your mining rig is waiting. The tasks are stacked. The withdrawals are *AUTOMATIC*. 

What are you waiting for? Tap below to launch the app and get your withdrawal in *TODAY!* 👇`;

const options = {
  caption: message,
  parse_mode: 'Markdown',
  reply_markup: {
    inline_keyboard: [
      [{ text: '💸 OPEN APP & CASH OUT 🚀', url: 'https://t.me/TaskyAppBot/app' }]
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
    
    const photoPath = 'C:\\\\Users\\\\aleem\\\\.gemini\\\\antigravity-ide\\\\brain\\\\1b75e44d-6ce9-4ddf-9fdc-9ba4a99e34ec\\\\media_cropped.jpg';
    
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        try {
            if (fs.existsSync(photoPath)) {
                await bot.sendPhoto(user.telegram_id, photoPath, options);
            } else {
                await bot.sendMessage(user.telegram_id, message, {
                    parse_mode: 'Markdown',
                    reply_markup: options.reply_markup
                });
            }
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

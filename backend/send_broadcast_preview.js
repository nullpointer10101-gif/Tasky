require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

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
      [{ text: '💸 OPEN APP & CASH OUT 🚀', url: 'https://t.me/TaskyAppbot/app' }]
    ]
  }
};

async function sendPreview(telegramId) {
    if (!telegramId) {
        console.error('Please provide a Telegram ID as an argument.');
        process.exit(1);
    }
    
    try {
        const photoPath = 'C:\\Users\\aleem\\.gemini\\antigravity-ide\\brain\\1b75e44d-6ce9-4ddf-9fdc-9ba4a99e34ec\\media_cropped.jpg';
        if (fs.existsSync(photoPath)) {
             await bot.sendPhoto(telegramId, photoPath, options);
             console.log(`Preview with image sent successfully to ${telegramId}!`);
        } else {
             // Fallback to just sending message if image not found
             await bot.sendMessage(telegramId, message, {
                parse_mode: 'Markdown',
                reply_markup: options.reply_markup
             });
             console.log(`Preview sent without image (image not found) to ${telegramId}!`);
        }
    } catch (err) {
        console.error('Failed to send preview:', err.message);
    } finally {
        process.exit(0);
    }
}

const targetId = process.argv[2];
sendPreview(targetId);

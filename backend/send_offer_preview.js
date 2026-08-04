require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID || '8823265955';
const BANNER_PATH = path.join(__dirname, 'assets', 'offer_banner.png');

const caption =
`\uD83C\uDF81 <b>Have you claimed your 20,000 TASKY yet?</b> \uD83D\uDC40

Open TASKY now, tap the \uD83C\uDF81 Gift icon, and complete the challenge before the event is over. \uD83D\uDE80

\uD83D\uDCB5 <b>20,000 TASKY = 1 USDT</b> \u2014 real value, yours for free!

\u23F0 <b>Limited 24-hour offer \u2014 don\u2019t miss out!</b>`;

async function send() {
  try {
    console.log('Sending preview to admin...');
    await bot.sendPhoto(ADMIN_ID, fs.createReadStream(BANNER_PATH), {
      caption,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '\uD83D\uDD25 Claim My 20,000 TASKY!', url: 'https://t.me/TaskyAppbot/app' }
        ]]
      }
    });
    console.log('Done! Check your Telegram.');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

send();

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is missing in .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });

const targetId = process.argv[2] || '7983938173';

const message = `👋 *Dear User*,

Regarding your pending *GRAM Withdrawal* on Tasky:

To continue and complete your withdrawal, kindly make sure you have at least *1 NFT Holder* in your team/referrals. 

Once this condition is fulfilled, your withdrawal request will be processed automatically! ⚡️💎

Thank you for your cooperation and for being a part of Tasky! 🐾`;

const options = {
  parse_mode: 'Markdown',
  reply_markup: {
    inline_keyboard: [
      [{ text: '🚀 Open Tasky Mini App', url: 'https://t.me/TaskyAppbot/app' }]
    ]
  }
};

async function sendNotice() {
  try {
    console.log(`Sending message to Telegram ID: ${targetId}...`);
    const res = await bot.sendMessage(targetId, message, options);
    console.log('Message sent successfully! Message ID:', res.message_id);
  } catch (error) {
    console.error('Error sending message:', error.response?.body || error.message);
  } finally {
    process.exit(0);
  }
}

sendNotice();

const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID || '8823265955';

const message = `📣 <b>TASKY — NEW DROP IS LIVE!</b> 💜

🎁 Something special is waiting inside TASKY! 👀

⚡️ Open the bot
🪙 Check your available GRAM
🎯 Complete today's activities
🔥 Stay active for bigger rewards

⏳ Limited-time offer for active users only!
Don't miss out! 🚀`;

// Deep link button: clicking sends /start to bot → counts as Telegram MAU
const opts = {
  parse_mode: 'HTML',
  reply_markup: {
    inline_keyboard: [[
      { text: '🤖 Open TASKY 🚀', url: 'https://t.me/TaskyAppbot?start=open' }
    ]]
  }
};

async function run() {
  try {
    console.log(`Sending test broadcast with deep-link /start button to admin ${ADMIN_ID}...`);
    const res = await bot.sendMessage(ADMIN_ID, message, opts);
    console.log(`✅ Sent! Message ID: ${res.message_id}`);
    console.log(`✅ Button URL: https://t.me/TaskyAppbot?start=open`);
    console.log(`✅ When clicked, user triggers /start → counts as Telegram Monthly Active User!`);
  } catch (err) {
    console.error(`❌ Error:`, err.message);
  }
  process.exit(0);
}

run();

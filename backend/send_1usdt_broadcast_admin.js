const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
const fs = require('fs');
require("dotenv").config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling: false});

const caption = `🚨 <b>NEW 24H OFFER UNLOCKED!</b> 🚨\n\nYou can now instantly claim a massive reward!\n🎁 <b>1 USDT + 20,000 TASKY!</b>\n\nAll you need is <b>10 friends</b>! 🤯`;

const options = {
  parse_mode: "HTML",
  reply_markup: { 
    inline_keyboard: [[{ text: "🎁 CLAIM 1 USDT + 20K TASKY 🚀", url: "https://t.me/TaskyAppbot/app" }]] 
  }
};

const imagePath = "C:\\Users\\aleem\\.gemini\\antigravity-ide\\brain\\6afd19f2-8e50-494a-a2de-af4aa4958dfd\\.user_uploaded\\media_1787575868413.png";

async function run() {
  try {
    const adminId = process.env.ADMIN_TELEGRAM_ID;
    console.log(`Sending updated clean photo broadcast to ADMIN ONLY (${adminId})...`);
    await bot.sendPhoto(adminId, fs.createReadStream(imagePath), {
      caption: caption,
      ...options
    });
    console.log("Broadcast successfully sent to admin!");
  } catch (err) {
    console.error("Error sending message:", err);
  } finally {
    process.exit(0);
  }
}

run();

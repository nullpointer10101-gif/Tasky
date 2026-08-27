const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
require("dotenv").config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling: false});

const message = `💎 <b>GRAM Daily Ads Fixed!</b> 💎\n\nGood news! The Gram daily ad progress issue has been permanently resolved.\n\n🚀 You can now watch daily ads normally, track your progress instantly, and claim your <b>0.02 GRAM</b> daily rewards to your TON wallet!\n\n⚡️ <b>Start earning now:</b>\n👉 @TaskyAppbot`;

const options = {
  parse_mode: "HTML",
  reply_markup: { 
    inline_keyboard: [[{ text: "💎 Open Tasky App 🚀", url: "https://t.me/TaskyAppbot/app" }]] 
  }
};

async function run() {
  try {
    const adminId = process.env.ADMIN_TELEGRAM_ID || "5487109053";
    console.log(`Sending GRAM Ads Fix broadcast to ADMIN ONLY (${adminId})...`);
    await bot.sendMessage(adminId, message, options);
    console.log("Broadcast successfully sent to admin!");
  } catch (err) {
    console.error("Error sending message:", err);
  } finally {
    process.exit(0);
  }
}

run();

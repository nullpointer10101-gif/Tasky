const { Pool } = require("pg");
const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling: false});

const message = "🎉 *New Promo Code Available!*\n\nYour new code is: *WELCOME*\n\n👇 Click below to claim your reward!";
const options = {
  parse_mode: "Markdown",
  reply_markup: { inline_keyboard: [[{ text: "💰 Claim 1 USDT", url: "https://t.me/TaskyAppbot/app" }]] }
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function run() {
  try {
    const res = await pool.query("SELECT DISTINCT telegram_id FROM users WHERE telegram_id IS NOT NULL");
    const users = res.rows;
    console.log("Starting broadcast to " + users.length + " users...");
    let successCount = 0; let failCount = 0;
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      try {
        await bot.sendMessage(user.telegram_id, message, options);
        successCount++;
      } catch(e) { 
        failCount++; 
      }
      await delay(50);
      
      if ((i + 1) % 500 === 0) {
        console.log(`Progress: ${i + 1} / ${users.length} (Success: ${successCount}, Failed: ${failCount})`);
      }
    }
    console.log(`Broadcast Complete! Success: ${successCount}, Failed: ${failCount}`);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();

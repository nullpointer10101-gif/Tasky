const { Pool } = require("pg");
const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling: false});

const message = `💎 <b>GRAM Daily Ads Fixed!</b> 💎\n\nGood news! The Gram daily ad progress issue has been permanently resolved.\n\n🚀 You can now watch daily ads normally, track your progress instantly, and claim your <b>0.02 GRAM</b> daily rewards to your TON wallet!\n\n⚡️ <b>Start earning now:</b>\n👉 @TaskyAppbot`;

const options = {
  parse_mode: "HTML",
  reply_markup: { 
    inline_keyboard: [[{ text: "💎 Open Tasky App 🚀", url: "https://t.me/TaskyAppbot/app" }]] 
  }
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function run() {
  try {
    const res = await pool.query("SELECT DISTINCT telegram_id FROM users WHERE telegram_id IS NOT NULL");
    const users = res.rows;
    console.log(`Starting GRAM Ads Fix broadcast to ${users.length} users...`);
    
    let successCount = 0; 
    let failCount = 0;
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      try {
        await bot.sendMessage(user.telegram_id, message, options);
        successCount++;
      } catch(e) { 
        failCount++; 
      }
      
      await delay(50); // Rate limit protection
      
      if ((i + 1) % 100 === 0) {
        console.log(`Progress: ${i + 1} / ${users.length} (Success: ${successCount}, Failed: ${failCount})`);
      }
    }
    console.log(`\nBroadcast Complete! 🚀\nSuccess: ${successCount}\nFailed: ${failCount}`);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();

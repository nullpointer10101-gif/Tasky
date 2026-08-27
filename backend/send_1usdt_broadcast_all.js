const { Pool } = require("pg");
const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
const fs = require('fs');
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling: false});

const caption = `🚨 <b>NEW 24H OFFER UNLOCKED!</b> 🚨\n\nYou can now instantly claim a massive reward!\n🎁 <b>1 USDT + 20,000 TASKY!</b>\n\nAll you need is <b>10 friends</b>! 🤯`;

const options = {
  parse_mode: "HTML",
  reply_markup: { 
    inline_keyboard: [[{ text: "🎁 CLAIM 1 USDT + 20K TASKY 🚀", url: "https://t.me/TaskyAppbot/app" }]] 
  }
};

const imagePath = "C:\\Users\\aleem\\.gemini\\antigravity-ide\\brain\\6afd19f2-8e50-494a-a2de-af4aa4958dfd\\.user_uploaded\\media_1787575868413.png";
const delay = ms => new Promise(res => setTimeout(res, ms));

async function run() {
  try {
    const res = await pool.query("SELECT DISTINCT telegram_id FROM users WHERE telegram_id IS NOT NULL");
    const users = res.rows;
    console.log(`Starting clean photo broadcast to ${users.length} users...`);
    
    let successCount = 0; 
    let failCount = 0;
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      try {
        await bot.sendPhoto(user.telegram_id, fs.createReadStream(imagePath), {
          caption: caption,
          ...options
        });
        successCount++;
      } catch(e) { 
        failCount++; 
      }
      
      await delay(50);
      
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

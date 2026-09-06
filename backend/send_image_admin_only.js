const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const caption = `💎 <b>TASKY MINI APP UPGRADE IS LIVE!</b> 💎`;

const options = {
  caption,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ text: "💎 Claim Now 🚀", web_app: { url: "https://tasky-kohl-six.vercel.app" } }]
    ]
  }
};

const imagePath = "C:\\Users\\aleem\\.gemini\\antigravity-ide\\brain\\42f72f4c-b3ba-4c70-9d93-979d41ba7a25\\.user_uploaded\\media_1788676438515.jpg";

async function run() {
  const adminIds = ['8823265955'];
  if (process.env.ADMIN_TELEGRAM_ID && !adminIds.includes(process.env.ADMIN_TELEGRAM_ID)) {
    adminIds.push(process.env.ADMIN_TELEGRAM_ID);
  }

  for (const adminId of adminIds) {
    try {
      console.log(`Sending photo with direct web_app button to admin ${adminId}...`);
      const stream = fs.createReadStream(imagePath);
      const res = await bot.sendPhoto(adminId, stream, options);
      console.log(`✅ Successfully sent photo with direct WebApp button to admin ${adminId}! Message ID: ${res.message_id}`);
    } catch (err) {
      console.error(`❌ Failed to send to admin ${adminId}:`, err.message);
    }
  }

  process.exit(0);
}

run();

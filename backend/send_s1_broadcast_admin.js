const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const caption = `🔥 <b>Season 1 NFT Miners will close permanently in 7 days — Claim & activate your miner before the deadline!</b>`;

const options = {
  caption,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [
        { text: "💎 Claim S1 Miner Now 🚀", web_app: { url: "https://tasky-kohl-six.vercel.app" } }
      ]
    ]
  }
};

const imagePath = path.join(__dirname, 'assets', 's1_closing_official.jpg');

async function run() {
  const adminIds = ['8823265955'];
  if (process.env.ADMIN_TELEGRAM_ID && !adminIds.includes(process.env.ADMIN_TELEGRAM_ID)) {
    adminIds.push(process.env.ADMIN_TELEGRAM_ID);
  }

  for (const adminId of adminIds) {
    try {
      console.log(`Sending Season 1 closing broadcast to admin ID ${adminId}...`);
      const stream = fs.createReadStream(imagePath);
      const res = await bot.sendPhoto(adminId, stream, options);
      console.log(`✅ Successfully sent to admin ${adminId}! Message ID: ${res.message_id}`);
    } catch (err) {
      console.error(`❌ Failed to send to admin ${adminId}:`, err.message);
    }
  }

  process.exit(0);
}

run();

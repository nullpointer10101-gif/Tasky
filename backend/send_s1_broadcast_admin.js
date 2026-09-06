const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const caption = `🔥 <b>SEASON 1 GENESIS ERA — CLOSING PERMANENTLY IN 7 DAYS</b>

The initial Genesis distribution window is reaching its final countdown. Early supporters who hold tokens and active Season 1 NFT Miners are locked into the highest lifetime earning tier.

⚡ <b>What happens when Season 1 ends:</b>
• <b>Permanent Scarcity:</b> S1 Titan & Mega Miners will never be minted again.
• <b>Halving Ahead:</b> Public mining difficulty increases drastically after listing, reducing rewards for new incoming users.
• <b>Lifetime Advantage:</b> Genesis miners retain their maximum daily GRAM yield and priority in the 60% early allocation pool.

💎 <i>Top holders are locking in their daily passive yields before the final 7-day timer hits zero.</i>`;

const options = {
  caption,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [
        { text: "💎 Claim S1 Miner Now 🚀", web_app: { url: "https://tasky3.onrender.com" } }
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

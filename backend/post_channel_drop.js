const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const CHANNEL_ID = "@Tasky_Official";

const caption = `👀 <b>TOMORROW, TASKY FAMILY… SOMETHING NEW IS COMING!</b> 🔥

💰 <b>Keep your GRAM ready.</b>
🎁 <b>A new surprise offer is on the way.</b>

No spoilers yet… 🤫
Just don't say we didn't warn you. 😏

⏳ <b>TOMORROW.</b>
<b>Stay active. Stay ready.</b> 💜🚀`;

const options = {
  caption,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🤖 OPEN TASKY 🚀", url: "https://t.me/TaskyAppbot/app" }
      ]
    ]
  }
};

const imagePath = "C:\\Users\\aleem\\.gemini\\antigravity-ide\\brain\\71b18d45-a797-480e-aee4-beb1099bb450\\.user_uploaded\\media_1789752186881.jpg";

async function run() {
  try {
    console.log(`Posting to channel ${CHANNEL_ID}...`);
    const stream = fs.createReadStream(imagePath);
    const res = await bot.sendPhoto(CHANNEL_ID, stream, options);
    console.log(`✅ Successfully posted to ${CHANNEL_ID}! Message ID: ${res.message_id}`);
  } catch (err) {
    console.error(`❌ Failed to post to channel:`, err.message);
  }
  process.exit(0);
}

run();

const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
require("dotenv").config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const message = `⚡ <b>CYBER AD REACTOR: 2.00 GRAM JACKPOT IS LIVE!</b> ⚡

🔥 <b>7-Day Hyper Overdrive Event</b>
We just launched the highest-reward event in Tasky!

💰 <b>Grand Jackpot Reward:</b>
💎 <b>2.00 GRAM + 20,000 TASKY</b>

🚀 <b>How to Play & Win:</b>
1️⃣ Open the <b>Cyber Ad Reactor</b> in Tasky.
2️⃣ Watch ads to inject plasma into the Core (<b>NO DAILY LIMITS</b> - binge watch as much as you want!).
3️⃣ Unlock 5 Progressive Milestone Stages.
4️⃣ Reach 1,000 Ads to claim your <b>2.00 GRAM Jackpot</b> directly to your TON / GRAM wallet!

⏳ <b>Time is ticking:</b> Event runs for <b>7 Days only</b>.

👇 <b>Tap below to claim your jackpot:</b>`;

const options = {
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ text: "⚡ Claim Jackpot & Charge Core 💎", url: "https://t.me/TaskyAppbot/app" }]
    ]
  }
};

async function run() {
  try {
    const adminId = process.env.ADMIN_TELEGRAM_ID || "8823265955";
    console.log(`Sending Cyber Reactor broadcast preview to ADMIN ONLY (${adminId})...`);
    const res = await bot.sendMessage(adminId, message, options);
    console.log("Broadcast successfully sent to admin! Message ID:", res.message_id);
  } catch (err) {
    console.error("Error sending message to admin:", err);
  } finally {
    process.exit(0);
  }
}

run();

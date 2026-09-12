const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
require("dotenv").config();
const { pool } = require("./db");

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

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function broadcastToAll() {
  try {
    console.log("Fetching all active users from database...");
    const res = await pool.query(
      "SELECT telegram_id FROM users WHERE telegram_id IS NOT NULL ORDER BY id DESC"
    );

    const users = res.rows;
    console.log(`Total users targeted: ${users.length}`);

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      try {
        await bot.sendMessage(u.telegram_id, message, options);
        sent++;
      } catch (err) {
        failed++;
      }

      if ((i + 1) % 25 === 0) {
        console.log(`Progress: ${i + 1}/${users.length} sent (${sent} ok, ${failed} failed)`);
        await delay(1000); // 25 msg/sec rate limit
      }
    }

    console.log(`Broadcast completed! Sent: ${sent}, Failed/Blocked: ${failed}`);
  } catch (err) {
    console.error("Broadcast failed:", err);
  } finally {
    process.exit(0);
  }
}

// NOTE: Only run when explicitly triggered by admin
if (process.argv.includes("--confirm")) {
  broadcastToAll();
} else {
  console.log("Safety guard: Run with --confirm to send to all users. Example: node send_reactor_broadcast_all.js --confirm");
  process.exit(0);
}

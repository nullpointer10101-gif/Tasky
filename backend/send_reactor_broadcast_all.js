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

    const allUsers = res.rows;
    // Skip the first 800 users who were already sent the broadcast
    const offset = parseInt(process.env.BROADCAST_OFFSET || "800", 10);
    const users = allUsers.slice(offset);

    console.log(`Total users in DB: ${allUsers.length}`);
    console.log(`Skipping already sent: ${offset}`);
    console.log(`Remaining to send at turbo speed: ${users.length}`);

    let sent = 0;
    let failed = 0;
    const CHUNK_SIZE = 25; // 25 parallel requests per batch (Max Telegram capacity)

    for (let i = 0; i < users.length; i += CHUNK_SIZE) {
      const chunk = users.slice(i, i + CHUNK_SIZE);

      const promises = chunk.map((u) =>
        bot.sendMessage(u.telegram_id, message, options)
          .then(() => ({ success: true }))
          .catch((err) => {
            // If rate limited by Telegram, capture retry delay if any
            return { success: false, error: err?.message };
          })
      );

      const results = await Promise.allSettled(promises);
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.success) {
          sent++;
        } else {
          failed++;
        }
      }

      const totalProcessed = offset + i + chunk.length;
      console.log(
        `⚡ Turbo Progress: ${totalProcessed}/${allUsers.length} total (${sent} new ok, ${failed} failed)`
      );

      // 800ms cooldown between parallel batches to stay perfectly within Telegram limits
      await delay(800);
    }

    console.log(`🎉 Turbo Broadcast Completed! Sent: ${sent}, Failed/Blocked: ${failed}`);
  } catch (err) {
    console.error("Broadcast error:", err);
  } finally {
    process.exit(0);
  }
}

if (process.argv.includes("--confirm")) {
  broadcastToAll();
} else {
  console.log("Safety guard: Run with --confirm to send. Example: node send_reactor_broadcast_all.js --confirm");
  process.exit(0);
}

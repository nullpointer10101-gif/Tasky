const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { pool } = require("./db");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const WEBAPP_URL = "https://tasky-v3.vercel.app";

const messageText = `👑 <b>TASKY CHAMPIONSHIP — ON-CHAIN PAYOUTS SENT!</b> 💎
━━━━━━━━━━━━━━━━━━━━━━━━
⚡ <b>REAL MONEY PAID DIRECTLY ON TON BLOCKCHAIN!</b> 💸

No empty promises. <b>Tasky PAYS REAL CRYPTO</b> every single week directly to top players! 🔥

🏆 <b>Top Paid Champions:</b>
🥇 <b>#1</b> @DoSToN_SoDiQoV — <b>1.00 GRAM</b> • <a href="https://tonviewer.com/transaction/2eb17a89176d8c46d3f70a565395a052905d74e94c11d2ab3351302a481bad6b">Proof ↗</a>
🥈 <b>#2</b> @Khoalqc — <b>0.50 GRAM</b> • <a href="https://tonviewer.com/transaction/1b5a72dfdc6518fd35702726ea7ffd885bb4b7084285ca4653bc99c5d469df8d">Proof ↗</a>
🥉 <b>#3</b> @Huong19769 — <b>0.30 GRAM</b> • <a href="https://tonviewer.com/transaction/d99e7f7e1976fdc4898861f8acc4c7538d072da5cff33795778be3430a54aaf3">Proof ↗</a>
📜 <i>All 20 on-chain verification links in <a href="https://t.me/Tasky_Official/155">@Tasky_Official</a>!</i>

━━━━━━━━━━━━━━━━━━━━━━━━
🔥 <b>THE NEXT BIG BAG IS WAITING FOR YOU!</b>
🚀 <b>20-DAY REFERRAL CHAMPIONSHIP IS LIVE!</b>

💰 <b>Top 20 Winners share 1.50+ GRAM &amp; 76,000 TASKY!</b>
👥 Invite active friends, climb the leaderboard, and secure your next crypto prize!

⚡ <b>Tap the button below to open Tasky directly!</b> 👇`;

const options = {
  parse_mode: "HTML",
  disable_web_page_preview: true,
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🚀 Open Tasky Mini App", web_app: { url: WEBAPP_URL } }
      ]
    ]
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTurboBroadcast() {
  console.log("⚡ Starting Turbo High-Throughput Broadcast Engine...");
  
  const res = await pool.query(
    "SELECT telegram_id FROM users WHERE telegram_id IS NOT NULL AND is_banned = FALSE ORDER BY id DESC"
  );
  const allUsers = res.rows;
  const offset = 1800; // Resume right from where previous batch stopped
  const users = allUsers.slice(offset);

  console.log(`📊 Total Database Users: ${allUsers.length}`);
  console.log(`⏩ Resuming from index: ${offset} | Remaining to process: ${users.length}`);

  let sent = 0;
  let blocked = 0;
  let errors = 0;
  const startTime = Date.now();

  const CONCURRENCY = 30; // 30 active workers
  let index = 0;

  async function worker() {
    while (index < users.length) {
      const currentIndex = index++;
      const u = users[currentIndex];
      if (!u) break;

      try {
        await bot.sendMessage(u.telegram_id, messageText, options);
        sent++;
      } catch (err) {
        if (err.message && (err.message.includes("blocked") || err.message.includes("deactivated") || err.message.includes("user not found") || err.message.includes("chat not found"))) {
          blocked++;
        } else if (err.message && err.message.includes("429")) {
          // Rate limit backoff
          await delay(1500);
        } else {
          errors++;
        }
      }

      if (currentIndex % 150 === 0 || currentIndex === users.length - 1) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const totalProcessed = offset + currentIndex + 1;
        const percent = Math.min(100, Math.round((totalProcessed / allUsers.length) * 100));
        console.log(`🚀 [${percent}%] (${totalProcessed}/${allUsers.length}) | Sent: ${sent} | Blocked: ${blocked} | Speed: ${(sent / Math.max(1, (Date.now() - startTime)/1000)).toFixed(1)} msg/s | ${elapsed}s`);
      }

      // Micro delay to maintain smooth stream
      await delay(25);
    }
  }

  // Spawn 30 concurrent stream workers
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 TURBO BROADCAST 100% COMPLETE in ${totalTime}s!`);
  console.log(`✅ Newly Delivered in this batch: ${sent}`);
  console.log(`🚫 Inactive/Blocked: ${blocked}`);
  console.log(`⚠️ Other Errors: ${errors}`);

  await pool.end();
  process.exit(0);
}

runTurboBroadcast().catch((err) => {
  console.error("Fatal turbo broadcast error:", err);
  process.exit(1);
});

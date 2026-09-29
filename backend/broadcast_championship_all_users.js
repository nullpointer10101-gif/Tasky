const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { pool } = require("./db");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const messageText = `👑 <b>TASKY CHAMPIONSHIP — ON-CHAIN PAYOUTS SENT!</b> 💎
━━━━━━━━━━━━━━━━━━━━━━━━
⚡ <b>REAL MONEY PAID ON TON BLOCKCHAIN!</b> 💸

No empty promises. <b>Tasky PAYS REAL CRYPTO</b> directly to our community every single week! 🔥

🏆 <b>Top Champions Received On-Chain GRAM:</b>
🥇 <b>#1</b> @DoSToN_SoDiQoV — <b>1.00 GRAM</b> • <a href="https://tonviewer.com/transaction/2eb17a89176d8c46d3f70a565395a052905d74e94c11d2ab3351302a481bad6b">Proof ↗</a>
🥈 <b>#2</b> @Khoalqc — <b>0.50 GRAM</b> • <a href="https://tonviewer.com/transaction/1b5a72dfdc6518fd35702726ea7ffd885bb4b7084285ca4653bc99c5d469df8d">Proof ↗</a>
🥉 <b>#3</b> @Huong19769 — <b>0.30 GRAM</b> • <a href="https://tonviewer.com/transaction/d99e7f7e1976fdc4898861f8acc4c7538d072da5cff33795778be3430a54aaf3">Proof ↗</a>
📜 <i>All 20 on-chain verification links posted in <a href="https://t.me/Tasky_Official/155">@Tasky_Official</a>!</i>

━━━━━━━━━━━━━━━━━━━━━━━━
🔥 <b>THE NEXT BIG BAG IS WAITING FOR YOU!</b>
🚀 <b>20-DAY REFERRAL CHAMPIONSHIP IS LIVE!</b>

💰 <b>Top 20 Winners share 1.50+ GRAM &amp; 76,000 TASKY!</b>
👥 Invite active friends, climb the leaderboard, and secure your next crypto prize!

⚡ <b>Tap below to start winning!</b> 👇`;

const options = {
  parse_mode: "HTML",
  disable_web_page_preview: true,
  reply_markup: {
    inline_keyboard: [
      [{ text: "🚀 Open Tasky", url: "https://t.me/TaskyAppbot" }]
    ]
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function broadcastTurbo() {
  console.log("🚀 Starting High-Speed Broadcast to All Tasky Users...");
  
  const res = await pool.query(
    "SELECT telegram_id FROM users WHERE telegram_id IS NOT NULL AND is_banned = FALSE ORDER BY id DESC"
  );
  const users = res.rows;
  console.log(`📊 Found ${users.length} total active users to broadcast.`);

  let sent = 0;
  let blocked = 0;
  let errors = 0;

  const BATCH_SIZE = 25; // 25 messages per batch for Telegram rate limit compliance (~25-30 msg/sec)
  const startTime = Date.now();

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const chunk = users.slice(i, i + BATCH_SIZE);

    await Promise.all(
      chunk.map(async (u) => {
        try {
          await bot.sendMessage(u.telegram_id, messageText, options);
          sent++;
        } catch (err) {
          if (err.message && (err.message.includes("blocked") || err.message.includes("deactivated") || err.message.includes("user not found") || err.message.includes("chat not found"))) {
            blocked++;
          } else {
            errors++;
          }
        }
      })
    );

    if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= users.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const percent = Math.min(100, Math.round(((i + BATCH_SIZE) / users.length) * 100));
      console.log(`⚡ [${percent}%] Processed ${Math.min(i + BATCH_SIZE, users.length)}/${users.length} | Sent: ${sent} | Blocked: ${blocked} | Errors: ${errors} | ${elapsed}s`);
    }

    await delay(1000); // 1-second pause between 25-message batches (safe 25 msg/s rate)
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 BROADCAST COMPLETE in ${totalTime}s!`);
  console.log(`✅ Successfully Delivered: ${sent}`);
  console.log(`🚫 Blocked/Inactive: ${blocked}`);
  console.log(`⚠️ Other Errors: ${errors}`);

  await pool.end();
  process.exit(0);
}

broadcastTurbo().catch((err) => {
  console.error("Fatal broadcast error:", err);
  process.exit(1);
});

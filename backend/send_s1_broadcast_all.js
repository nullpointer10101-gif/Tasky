const { Pool } = require("pg");
const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const fileId = "AgACAgUAAxkDAAEDb9pqnVGiS8qpz588hOZmeQ67yHbhPgACvRNrG6OI6FTJ00SR-6DcggEAAwIAA3kAAz0E";

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
        { text: "💎 Claim S1 Miner Now 🚀", url: "https://t.me/TaskyAppbot/app" }
      ]
    ]
  }
};

async function run() {
  console.log("🚀 Starting High-Speed Season 1 Broadcast to All Users...");

  try {
    const res = await pool.query("SELECT DISTINCT telegram_id FROM users WHERE telegram_id IS NOT NULL AND is_banned = FALSE");
    const users = res.rows.map(r => r.telegram_id);
    console.log(`📢 Total Target Users: ${users.length}`);

    let successCount = 0;
    let failedCount = 0;
    let blockedCount = 0;
    const startTime = Date.now();

    const BATCH_SIZE = 25;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (tid) => {
        try {
          await bot.sendPhoto(tid, fileId, options);
          successCount++;
        } catch (err) {
          failedCount++;
          const errMsg = err.message || "";
          if (errMsg.includes("bot was blocked") || errMsg.includes("user is deactivated") || errMsg.includes("chat not found")) {
            blockedCount++;
          }
        }
      }));

      const progress = Math.min(i + BATCH_SIZE, users.length);
      const percent = ((progress / users.length) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${percent}%] ${progress}/${users.length} sent | Success: ${successCount}, Blocked/Failed: ${failedCount} (${elapsed}s)`);

      // Safe pause between batches (approx 25 msgs / 350ms = 70/s burst with backoff)
      await new Promise(r => setTimeout(r, 400));
    }

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🎉 BROADCAST COMPLETE in ${totalElapsed}s!`);
    console.log(`✅ Total Delivered: ${successCount}`);
    console.log(`🚫 Blocked / Deactivated Users: ${blockedCount}`);
    console.log(`❌ Other Failures: ${failedCount - blockedCount}`);

  } catch (err) {
    console.error("Broadcast Fatal Error:", err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();

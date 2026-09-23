const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
const fs = require("fs");
const path = require("path");
const { pool } = require("./db");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const caption = `💎 <b>TASKY MINI APP UPGRADE IS LIVE!</b> 💎`;

const buttonMarkup = {
  inline_keyboard: [
    [{ text: "💎 Claim Now 🚀", web_app: { url: "https://tasky-v3.vercel.app" } }]
  ]
};

const imagePath = "C:\\Users\\aleem\\.gemini\\antigravity-ide\\brain\\42f72f4c-b3ba-4c70-9d93-979d41ba7a25\\.user_uploaded\\media_1788676438515.jpg";

function isUserBlockError(errMsg) {
  if (!errMsg) return false;
  return /blocked|deactivated|chat not found|user not found|PEER_ID_INVALID/i.test(String(errMsg));
}

async function sendWithRetry(sendFn, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await sendFn();
    } catch (err) {
      if (isUserBlockError(err.message)) throw err;
      if (err.message && (err.message.includes('429') || /retry after/i.test(err.message))) {
        const match = err.message.match(/retry after (\d+)/i);
        const retrySec = match ? parseInt(match[1], 10) : 2;
        console.warn(`[BROADCAST 429] Rate limited. Sleeping ${retrySec + 1}s before retry...`);
        await new Promise(r => setTimeout(r, (retrySec + 1) * 1000));
      } else if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500));
      } else {
        throw err;
      }
    }
  }
}

async function run() {
  console.log("Fetching target active users from database...");
  const usersRes = await pool.query(
    "SELECT telegram_id FROM users WHERE is_banned = false AND telegram_id IS NOT NULL ORDER BY id DESC"
  );
  const targets = usersRes.rows.map(r => r.telegram_id);
  console.log(`Found ${targets.length} total active users to broadcast to.`);

  if (targets.length === 0) {
    console.log("No users found.");
    process.exit(0);
  }

  let cachedFileId = null;
  let successCount = 0;
  let failedCount = 0;
  let blockedCount = 0;

  const BATCH_SIZE = 25;
  const startTime = Date.now();

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (tid) => {
      try {
        const photoSource = cachedFileId || fs.createReadStream(imagePath);
        const res = await sendWithRetry(() => bot.sendPhoto(tid, photoSource, {
          caption,
          parse_mode: "HTML",
          reply_markup: buttonMarkup
        }));

        if (!cachedFileId && res && res.photo && res.photo.length > 0) {
          cachedFileId = res.photo[res.photo.length - 1].file_id;
          console.log(`✨ Captured Telegram photo file_id: ${cachedFileId}`);
        }

        successCount++;
      } catch (err) {
        if (isUserBlockError(err.message)) {
          blockedCount++;
        } else {
          failedCount++;
          console.warn(`[Send Error] User ${tid}:`, err.message);
        }
      }
    }));

    const processed = Math.min(i + BATCH_SIZE, targets.length);
    const pct = Math.round((processed / targets.length) * 100);
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Progress ${pct}%] Sent: ${successCount} | Blocked: ${blockedCount} | Other Failed: ${failedCount} | Elapsed: ${elapsedSec}s`);

    await new Promise(r => setTimeout(r, 350));
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n🎉 Broadcast Finished in ${totalTime}s!`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`🚫 Blocked/Deactivated: ${blockedCount}`);
  console.log(`❌ Failed: ${failedCount}`);

  process.exit(0);
}

run();

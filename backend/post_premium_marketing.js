const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const MAIN_CHANNEL_ID = "@Tasky_Official";
const PAYOUT_CHANNEL_ID = "@TaskyPayouts";
const imagePath = "C:\\Users\\aleem\\.gemini\\antigravity-ide\\brain\\a296cc6f-83bb-4d6b-833a-662ba27ad958\\tasky_championship_payout_banner_1790709535519.jpg";

const caption =
`👑 <b>TASKY CHAMPIONSHIP — GRAND FINALE PAYOUTS</b> 💎
━━━━━━━━━━━━━━━━━━━━━
🔥 <b>REAL ON-CHAIN CRYPTO SENT TO TOP 30 CHAMPIONS!</b>

While other apps make empty promises, <b>Tasky delivers REAL CRYPTO</b> directly to our community every single week on the TON Blockchain! 💸⚡

🏆 <b>TOP PODIUM CHAMPIONS:</b>
🥇 <b>#1:</b> @DoSToN_SoDiQoV (8,250 Ads) ➔ <b>1.00 GRAM</b> • <a href="https://tonviewer.com/transaction/2eb17a89176d8c46d3f70a565395a052905d74e94c11d2ab3351302a481bad6b">Verify TX 🔗</a>
🥈 <b>#2:</b> @Khoalqc (6,741 Ads) ➔ <b>0.50 GRAM</b> • <a href="https://tonviewer.com/transaction/1b5a72dfdc6518fd35702726ea7ffd885bb4b7084285ca4653bc99c5d469df8d">Verify TX 🔗</a>
🥉 <b>#3:</b> @Huong19769 (5,765 Ads) ➔ <b>0.30 GRAM</b> • <a href="https://tonviewer.com/transaction/d99e7f7e1976fdc4898861f8acc4c7538d072da5cff33795778be3430a54aaf3">Verify TX 🔗</a>
🏅 <b>#4:</b> @Apex_Legends2026 ➔ <b>0.10 GRAM</b> • <a href="https://tonviewer.com/transaction/e8b1d38c5beeeecbdfede53b38692b54a16164c564b7cd249bf1d374cfd16c07">Verify TX 🔗</a>
🏅 <b>#8:</b> @justinjnrpat07 ➔ <b>0.10 GRAM</b> • <a href="https://tonviewer.com/transaction/9ec93c92af95a6594d6772e79468a8404ed1e90b8f32e5be095c0dc9a5cef13d">Verify TX 🔗</a>
🏅 <b>#9:</b> @sonasimri ➔ <b>0.10 GRAM</b> • <a href="https://tonviewer.com/transaction/ae82e860938f80885253f533b8032cd7da0c0e0f67947503a784849487fcd909">Verify TX 🔗</a>
<i>…plus 24 more finalists rewarded!</i>

━━━━━━━━━━━━━━━━━━━━━
🚀 <b>NEW 20-DAY REFERRAL SEASON IS LIVE!</b>
💰 Top 20 Winners share <b>1.50+ GRAM &amp; 76,000 TASKY</b>!
👥 Simply invite friends (1 task required) to rank up!

👇 <b>Tap below to enter the new season &amp; earn!</b> 👇`;

const reply_markup = {
  inline_keyboard: [
    [
      { text: "🚀 OPEN TASKY & JOIN NEW SEASON 💎", url: "https://t.me/TaskyAppbot/app" }
    ],
    [
      { text: "💬 Join Winners Community", url: "https://t.me/TaskyOfficialCommunity" },
      { text: "📢 Payout Proofs Channel", url: "https://t.me/TaskyPayouts" }
    ]
  ]
};

async function sendPremiumPost() {
  console.log("Caption length:", caption.length, "/ 1024 max");
  try {
    console.log(`Posting photo + caption to ${MAIN_CHANNEL_ID}...`);
    const stream = fs.createReadStream(imagePath);
    const res = await bot.sendPhoto(MAIN_CHANNEL_ID, stream, {
      caption,
      parse_mode: "HTML",
      reply_markup
    });
    console.log(`✅ Successfully posted premium broadcast to ${MAIN_CHANNEL_ID}! Message ID: ${res.message_id}`);
  } catch (err) {
    console.error(`❌ Failed to post:`, err.message);
  }
  process.exit(0);
}

sendPremiumPost().catch(console.error);

const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const messageText = `👑 <b>TASKY CHAMPIONSHIP — ON-CHAIN PAYOUTS SENT!</b> 💎
━━━━━━━━━━━━━━━━━━━━━━━━
⚡ <b>REAL MONEY PAID ON TON BLOCKCHAIN!</b> 💸

No empty promises. <b>Tasky PAYS REAL CRYPTO</b> every single week directly to our community! 🔥

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

async function sendDirect() {
  const adminId = process.env.ADMIN_TELEGRAM_ID || "8823265955";
  console.log(`Sending direct broadcast preview to Admin (${adminId})...`);
  try {
    const res = await bot.sendMessage(adminId, messageText, options);
    console.log(`✅ Direct Admin Message Delivered! ID: ${res.message_id}`);
  } catch (err) {
    console.error(`❌ Send Error:`, err.message);
  }
  process.exit(0);
}

sendDirect();

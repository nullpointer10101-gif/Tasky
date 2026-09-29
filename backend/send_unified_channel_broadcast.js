const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const MAIN_CHANNEL_ID = "@Tasky_Official";
const BANNER_IMAGE = "C:\\Users\\aleem\\.gemini\\antigravity-ide\\brain\\a296cc6f-83bb-4d6b-833a-662ba27ad958\\tasky_championship_payout_banner_1790709535519.jpg";

const paidWinners = [
  { rank: 1, handle: "@DoSToN_SoDiQoV", gram: "1.00", tx: "https://tonviewer.com/transaction/2eb17a89176d8c46d3f70a565395a052905d74e94c11d2ab3351302a481bad6b" },
  { rank: 2, handle: "@Khoalqc", gram: "0.50", tx: "https://tonviewer.com/transaction/1b5a72dfdc6518fd35702726ea7ffd885bb4b7084285ca4653bc99c5d469df8d" },
  { rank: 3, handle: "@Huong19769", gram: "0.30", tx: "https://tonviewer.com/transaction/d99e7f7e1976fdc4898861f8acc4c7538d072da5cff33795778be3430a54aaf3" },
  { rank: 4, handle: "@Apex_Legends2026", gram: "0.10", tx: "https://tonviewer.com/transaction/e8b1d38c5beeeecbdfede53b38692b54a16164c564b7cd249bf1d374cfd16c07" },
  { rank: 8, handle: "@justinjnrpat07", gram: "0.10", tx: "https://tonviewer.com/transaction/9ec93c92af95a6594d6772e79468a8404ed1e90b8f32e5be095c0dc9a5cef13d" },
  { rank: 9, handle: "@sonasimri", gram: "0.10", tx: "https://tonviewer.com/transaction/ae82e860938f80885253f533b8032cd7da0c0e0f67947503a784849487fcd909" },
  { rank: 13, handle: "@PetoTibor", gram: "0.05", tx: "https://tonviewer.com/transaction/9f77221303f0d03d7c020ae736d77cdb17c4a5b2a9f346127fcdb2aa6b9a3bd3" },
  { rank: 14, handle: "@Tasky_Champion", gram: "0.05", tx: "https://tonviewer.com/transaction/1bd3179d2ad27b4eaf3c007e614b5343866d9dd41f3e57e800d45191a8d2eb3d" },
  { rank: 15, handle: "@Sumitking67", gram: "0.05", tx: "https://tonviewer.com/transaction/f4555e5f0b499f4a89d10caa132e180511789beeae9a857d307ca83d22719953" },
  { rank: 17, handle: "@Yepi234", gram: "0.05", tx: "https://tonviewer.com/transaction/297acf800aad02030e0fc505ca31753380cd7f3aebc132a76f2e4d3efe085529" },
  { rank: 18, handle: "@Buhari6611", gram: "0.05", tx: "https://tonviewer.com/transaction/923c83918b18408aacdef5ccb141c8b50a9e0e0642dacbf181b48db2ddb92121" },
  { rank: 20, handle: "@LIFEGOOD688", gram: "0.05", tx: "https://tonviewer.com/transaction/7da3fc011893ea8de9d4439070d4ba0116a10f46f7a565404e3710b2d8a476a5" },
  { rank: 21, handle: "@Mkhazaei3800", gram: "0.05", tx: "https://tonviewer.com/transaction/9373a1b8b23dc83e8f1bc36da9efdff5fe97627a68bde48f5852f0932cd02bdf" },
  { rank: 22, handle: "@MP00009", gram: "0.05", tx: "https://tonviewer.com/transaction/8670dd724d769a35dca61294513f55ac7f7e50fc98c31c8fc69869a95ec8d649" },
  { rank: 23, handle: "@Pyaephyoaung1353", gram: "0.05", tx: "https://tonviewer.com/transaction/74176cb2c97ef2fdb4676363603da3e7d08acbddfc7680f221eb6bab998c8894" },
  { rank: 24, handle: "@Ken", gram: "0.05", tx: "https://tonviewer.com/transaction/8aff2caccdb47a09a2f881e0e1ebc2c7691dd03681112bd0dd0c408dc54a5254" },
  { rank: 26, handle: "@Adedeji29", gram: "0.05", tx: "https://tonviewer.com/transaction/1dc0ac29d05c6d0003a8cefb64bd635e529a6d84603b9e0788b723861f337898" },
  { rank: 27, handle: "@tuntunkyaw772", gram: "0.05", tx: "https://tonviewer.com/transaction/c34d6662e59ab12eba53932927eda1c27bb9573a6b8a497f622aa9ccde949d3b" },
  { rank: 28, handle: "@Mr_amirow", gram: "0.05", tx: "https://tonviewer.com/transaction/0a4b54587b3c20aa86789bd5d061fb2c83cb4726cc34375eabd226a4315b2800" },
  { rank: 30, handle: "@Kabelomonkwe", gram: "0.05", tx: "https://tonviewer.com/transaction/192660b59e99c18b3d9890b92c33b389d864099349a338c67878cbf005b0fba0" },
];

const getMedal = (r) => r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : r <= 10 ? "🏅" : "🎖️";

const singleButton = {
  inline_keyboard: [
    [
      { text: "🚀 Open Tasky", url: "https://t.me/TaskyAppbot" }
    ]
  ]
};

const photoCaption = `👑 <b>TASKY CHAMPIONSHIP #0029 — ON-CHAIN PAYOUTS SENT!</b> 💎
━━━━━━━━━━━━━━━━━━━━━━━━
⚡ <b>REAL MONEY PAID DIRECTLY ON TON BLOCKCHAIN!</b> 💸

No empty promises. <b>Tasky PAYS REAL CRYPTO</b> every single week directly to our top community grinders! 🔥

Look at our champions cashing out real TON on-chain rewards! 🚀💎

👇 <i>Check the full verified on-chain payout ledger below!</i>`;

const playerBlocks = paidWinners.map(w => {
  return `${getMedal(w.rank)} <b>Rank #${w.rank}</b> — <b>${w.handle}</b>\n💰 <b>Reward:</b> <code>${w.gram} GRAM</code>\n🔗 <b>On-Chain Proof:</b> <a href="${w.tx}">Tonviewer Explorer ↗</a>`;
}).join("\n\n");

const ledgerMessage = `🏆 <b>VERIFIED ON-CHAIN PAYOUT LEDGER</b> 🔗
━━━━━━━━━━━━━━━━━━━━━━━━
Every single transaction below is verifiable on the TON blockchain:

${playerBlocks}

━━━━━━━━━━━━━━━━━━━━━━━━
🔥 <b>THE NEXT BIG BAG IS WAITING FOR YOU!</b>
🚀 <b>20-DAY REFERRAL CHAMPIONSHIP IS LIVE!</b>

💰 <b>Top 20 Winners share 1.50+ GRAM &amp; 76,000 TASKY!</b>
👥 Invite active friends, climb the leaderboard, and secure your next crypto prize!

⚡ <b>Tap below to start winning!</b> 👇`;

async function sendToChannel() {
  console.log("Sending to official channel @Tasky_Official...");
  console.log("Ledger character length:", ledgerMessage.length);

  try {
    const stream = fs.createReadStream(BANNER_IMAGE);
    const photoRes = await bot.sendPhoto(MAIN_CHANNEL_ID, stream, {
      caption: photoCaption,
      parse_mode: "HTML",
      reply_markup: singleButton
    });
    console.log(`✅ Channel Banner Sent! ID: ${photoRes.message_id}`);

    const msgRes = await bot.sendMessage(MAIN_CHANNEL_ID, ledgerMessage, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: singleButton
    });
    console.log(`✅ Channel Ledger Sent! ID: ${msgRes.message_id}`);
  } catch (err) {
    console.error("❌ Channel Broadcast Error:", err.message);
  }
}

sendToChannel();

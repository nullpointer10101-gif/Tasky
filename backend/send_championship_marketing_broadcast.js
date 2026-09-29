const TelegramBotPkg = require("node-telegram-bot-api");
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const MAIN_CHANNEL_ID = "@Tasky_Official";
const PAYOUT_CHANNEL_ID = "@TaskyPayouts";

// Payouts verified on-chain from live Render API
const winnersData = [
  { rank: 1, handle: "@DoSToN_SoDiQoV", ads: 8250, gram: "1.00", tx: "https://tonviewer.com/transaction/2eb17a89176d8c46d3f70a565395a052905d74e94c11d2ab3351302a481bad6b" },
  { rank: 2, handle: "@Khoalqc", ads: 6741, gram: "0.50", tx: "https://tonviewer.com/transaction/1b5a72dfdc6518fd35702726ea7ffd885bb4b7084285ca4653bc99c5d469df8d" },
  { rank: 3, handle: "@Huong19769", ads: 5765, gram: "0.30", tx: "https://tonviewer.com/transaction/d99e7f7e1976fdc4898861f8acc4c7538d072da5cff33795778be3430a54aaf3" },
  { rank: 4, handle: "@Apex_Legends2026", ads: 5692, gram: "0.10", tx: "https://tonviewer.com/transaction/e8b1d38c5beeeecbdfede53b38692b54a16164c564b7cd249bf1d374cfd16c07" },
  { rank: 5, handle: "@JayxKill", ads: 5631, gram: "0.10", tx: null },
  { rank: 6, handle: "@sadddw3", ads: 4820, gram: "0.10", tx: null },
  { rank: 7, handle: "@markos0982", ads: 4303, gram: "0.10", tx: null },
  { rank: 8, handle: "@justinjnrpat07", ads: 2541, gram: "0.10", tx: "https://tonviewer.com/transaction/9ec93c92af95a6594d6772e79468a8404ed1e90b8f32e5be095c0dc9a5cef13d" },
  { rank: 9, handle: "@sonasimri", ads: 2111, gram: "0.10", tx: "https://tonviewer.com/transaction/ae82e860938f80885253f533b8032cd7da0c0e0f67947503a784849487fcd909" },
  { rank: 10, handle: "@aditsopoy", ads: 1858, gram: "0.10", tx: null },
  { rank: 11, handle: "@Luxury1290", ads: 1741, gram: "0.05", tx: null },
  { rank: 12, handle: "@Tasky_User", ads: 1650, gram: "0.05", tx: null },
  { rank: 13, handle: "@PetoTibor", ads: 1448, gram: "0.05", tx: "https://tonviewer.com/transaction/9f77221303f0d03d7c020ae736d77cdb17c4a5b2a9f346127fcdb2aa6b9a3bd3" },
  { rank: 14, handle: "@Tasky_User", ads: 1323, gram: "0.05", tx: "https://tonviewer.com/transaction/1bd3179d2ad27b4eaf3c007e614b5343866d9dd41f3e57e800d45191a8d2eb3d" },
  { rank: 15, handle: "@Sumitking67", ads: 1133, gram: "0.05", tx: "https://tonviewer.com/transaction/f4555e5f0b499f4a89d10caa132e180511789beeae9a857d307ca83d22719953" },
  { rank: 16, handle: "@Truc_1994", ads: 1046, gram: "0.05", tx: null },
  { rank: 17, handle: "@Yepi234", ads: 755, gram: "0.05", tx: "https://tonviewer.com/transaction/297acf800aad02030e0fc505ca31753380cd7f3aebc132a76f2e4d3efe085529" },
  { rank: 18, handle: "@Buhari6611", ads: 740, gram: "0.05", tx: "https://tonviewer.com/transaction/923c83918b18408aacdef5ccb141c8b50a9e0e0642dacbf181b48db2ddb92121" },
  { rank: 19, handle: "@tamobito", ads: 720, gram: "0.05", tx: null },
  { rank: 20, handle: "@LIFEGOOD688", ads: 687, gram: "0.05", tx: "https://tonviewer.com/transaction/7da3fc011893ea8de9d4439070d4ba0116a10f46f7a565404e3710b2d8a476a5" },
  { rank: 21, handle: "@Mkhazaei3800", ads: 568, gram: "0.05", tx: "https://tonviewer.com/transaction/9373a1b8b23dc83e8f1bc36da9efdff5fe97627a68bde48f5852f0932cd02bdf" },
  { rank: 22, handle: "@MP00009", ads: 529, gram: "0.05", tx: "https://tonviewer.com/transaction/8670dd724d769a35dca61294513f55ac7f7e50fc98c31c8fc69869a95ec8d649" },
  { rank: 23, handle: "@Pyaephyoaung1353", ads: 483, gram: "0.05", tx: "https://tonviewer.com/transaction/74176cb2c97ef2fdb4676363603da3e7d08acbddfc7680f221eb6bab998c8894" },
  { rank: 24, handle: "@Ken", ads: 462, gram: "0.05", tx: "https://tonviewer.com/transaction/8aff2caccdb47a09a2f881e0e1ebc2c7691dd03681112bd0dd0c408dc54a5254" },
  { rank: 25, handle: "@Sara", ads: 455, gram: "0.05", tx: null },
  { rank: 26, handle: "@Adedeji29", ads: 454, gram: "0.05", tx: "https://tonviewer.com/transaction/1dc0ac29d05c6d0003a8cefb64bd635e529a6d84603b9e0788b723861f337898" },
  { rank: 27, handle: "@tuntunkyaw772", ads: 430, gram: "0.05", tx: "https://tonviewer.com/transaction/c34d6662e59ab12eba53932927eda1c27bb9573a6b8a497f622aa9ccde949d3b" },
  { rank: 28, handle: "@Mr_amirow", ads: 400, gram: "0.05", tx: "https://tonviewer.com/transaction/0a4b54587b3c20aa86789bd5d061fb2c83cb4726cc34375eabd226a4315b2800" },
  { rank: 29, handle: "@Gopinath1974", ads: 360, gram: "0.05", tx: null },
  { rank: 30, handle: "@Kabelomonkwe", ads: 360, gram: "0.05", tx: "https://tonviewer.com/transaction/192660b59e99c18b3d9890b92c33b389d864099349a338c67878cbf005b0fba0" },
];

function buildMarketingMessage() {
  const getMedal = (r) => r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : r <= 10 ? "🏅" : "🎖️";

  const rowsHtml = winnersData.map(w => {
    const medal = getMedal(w.rank);
    const shortHash = w.tx ? `<a href="${w.tx}">[🔗 TX Proof]</a>` : `<i>[Wallet Missing]</i>`;
    return `${medal} <b>#${w.rank}</b> ${w.handle} — <b>${w.gram} GRAM</b> • ${shortHash}`;
  }).join("\n");

  const message =
`💎 <b>REAL MONEY. REAL PROOFS. ZERO GIMMICKS.</b> 💸

🔥 <b>We just sent REAL ON-CHAIN GRAM &amp; TASKY to all 30 Championship Winners!</b> 

While other projects make fake promises, <b>Tasky PAYS REAL CRYPTO</b> directly to our community every single season on the <b>TON Blockchain</b>! 💎⚡

━━━━━━━━━━━━━━━━━━━━
🏆 <b>OFFICIAL TOP 30 PAYOUT PROOFS:</b>
${rowsHtml}
━━━━━━━━━━━━━━━━━━━━

💰 <b>Total Distributed: 3.50+ GRAM &amp; 69,000 TASKY!</b> ✅

🚀 <b>MISSED OUT ON THIS SEASON?</b>
The brand-new <b>20-Day Referral Championship</b> is ALREADY LIVE! 
Top 20 winners will share massive GRAM &amp; TASKY pools! 👑

👇 <b>Tap below to join the new season and start earning now!</b> 👇`;

  return message;
}

async function sendBroadcast() {
  const message = buildMarketingMessage();
  console.log("Message Length:", message.length, "/ 4096 max");
  console.log("\n--- Preview Message ---\n");
  console.log(message);

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

  try {
    console.log(`\nPosting to ${MAIN_CHANNEL_ID}...`);
    const resMain = await bot.sendMessage(MAIN_CHANNEL_ID, message, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup
    });
    console.log(`✅ Successfully sent to ${MAIN_CHANNEL_ID}! Message ID: ${resMain.message_id}`);
  } catch (err) {
    console.error(`❌ Failed to send to ${MAIN_CHANNEL_ID}:`, err.message);
  }

  process.exit(0);
}

sendBroadcast().catch(console.error);

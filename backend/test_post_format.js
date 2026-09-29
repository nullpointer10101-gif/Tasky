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

const rows = paidWinners.map(w => {
  return `${getMedal(w.rank)} <b>#${w.rank}</b> ${w.handle} — <b>${w.gram} GRAM</b> (<a href="${w.tx}">Tonviewer ↗</a>)`;
}).join("\n");

const text = `👑 <b>TASKY CHAMPIONSHIP — ON-CHAIN PAYOUTS</b> 💎
━━━━━━━━━━━━━━━━━━━━━━
⚡ <b>REAL MONEY PAID ON TON BLOCKCHAIN!</b>

We don’t make empty promises — <b>Tasky pays real crypto</b> every week directly to our top grinders! 💸

🏆 <b>ALL VERIFIED PAID CHAMPIONS:</b>
${rows}

━━━━━━━━━━━━━━━━━━━━━━
⚠️ <i>Unclaimed (#5, #6, #7, #10, #11, #12, #16, #19, #25, #29): Bind your GRAM wallet in Tasky to receive your pending reward!</i>

🚀 <b>20-DAY REFERRAL CHAMPIONSHIP IS LIVE!</b>
💰 Top 20 share <b>1.50+ GRAM & 76,000 TASKY</b>!
👥 Invite active friends to rank up & win!`;

console.log("Total characters in text message:", text.length);
console.log("------------------------------------------");
console.log(text);

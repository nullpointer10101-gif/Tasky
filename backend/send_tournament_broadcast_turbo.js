const { Pool } = require('pg');
const TelegramBotPkg = require('node-telegram-bot-api');
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: false });

const message = `🔥 <b>AD CHAMPIONSHIP UPDATE — 7 HOURS LEFT!</b> ⏰

🛡️ <b>SECURITY PURGE COMPLETE:</b>
All automated bot accounts, multi-accounts & fake ad watchers have been <b>permanently removed & banned</b> from the tournament!

🏆 <b>ONLY REAL & GENUINE USERS WIN:</b>
The official leaderboard is now 100% clean and verified. Every genuine ad you watch pushes you straight up the rankings:

🥇 <b>1st Place:</b> 1.00 GRAM + 20,000 TASKY
🥈 <b>2nd Place:</b> 0.50 GRAM + 10,000 TASKY
🥉 <b>3rd Place:</b> 0.30 GRAM + 5,000 TASKY
🏅 <b>Top 10:</b> 0.10 GRAM + 2,000 TASKY
⭐ <b>Top 30:</b> 0.05 GRAM + 1,000 TASKY

⏳ <b>Tournament Ends In:</b> ~7 Hours!
Watch sponsor ads now, climb the verified ranks, and claim your guaranteed payout today! 🚀`;

const options = {
  parse_mode: 'HTML',
  reply_markup: {
    inline_keyboard: [
      [
        { text: '🏆 OPEN TOURNAMENT & WIN GRAM 🚀', web_app: { url: 'https://tasky-v3.vercel.app/' } }
      ]
    ]
  }
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function runTurboBroadcast() {
  console.log('⚡ Starting Turbo High-Speed Broadcast...');
  const res = await pool.query(`
    SELECT DISTINCT telegram_id 
    FROM users 
    WHERE telegram_id IS NOT NULL 
      AND is_banned = FALSE
  `);
  const users = res.rows.map(r => r.telegram_id);
  const total = users.length;
  console.log(`📢 Total Target Users: ${total}`);

  let successCount = 0;
  let failedCount = 0;
  let blockedCount = 0;
  const startTime = Date.now();

  // High-speed concurrent batching (30 parallel requests per batch)
  const BATCH_SIZE = 30;
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (tid) => {
      try {
        await bot.sendMessage(tid, message, options);
        successCount++;
      } catch (err) {
        failedCount++;
        const msg = err?.message || '';
        if (msg.includes('blocked') || msg.includes('deactivated') || msg.includes('chat not found')) {
          blockedCount++;
        } else if (msg.includes('429') || msg.includes('retry after')) {
          // brief pause on 429
          const match = msg.match(/retry after (\d+)/i);
          const sec = match ? parseInt(match[1], 10) : 1;
          await delay(sec * 1000);
        }
      }
    }));

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const speed = ((i + batch.length) / Math.max(1, elapsedSec)).toFixed(1);
    process.stdout.write(`\r🚀 Sent: ${successCount} | Failed: ${failedCount} (Blocked: ${blockedCount}) | Progress: ${Math.min(total, i + BATCH_SIZE)}/${total} (${speed} msgs/sec)`);

    // 1000ms delay per 30-message chunk keeps throughput at exactly Telegram's 30 msgs/sec limit
    await delay(1000);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n🎉 Turbo Broadcast Finished in ${totalTime}s!`);
  console.log(`✅ Delivered: ${successCount}`);
  console.log(`❌ Inactive/Blocked: ${blockedCount}`);
  console.log(`⚠️ Other Failures: ${failedCount - blockedCount}`);

  await pool.end();
  process.exit(0);
}

runTurboBroadcast();

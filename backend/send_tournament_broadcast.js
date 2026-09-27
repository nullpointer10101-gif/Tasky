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

// 100% Working Native WebApp Button (Opens directly inside Telegram Mini App)
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

async function main() {
  const isPreview = process.argv.includes('--preview');
  const previewTarget = process.argv[3] || process.env.ADMIN_TELEGRAM_ID || '8823265955';

  if (isPreview) {
    console.log(`Sending preview with direct WebApp button to Admin (TG: ${previewTarget})...`);
    try {
      await bot.sendMessage(previewTarget, message, options);
      console.log(`✅ Preview sent successfully to ${previewTarget}!`);
    } catch (err) {
      console.error('❌ Failed to send preview:', err.message);
    }
    await pool.end();
    process.exit(0);
  }

  // Full Broadcast to all non-banned users
  console.log('Fetching active users for full broadcast...');
  const res = await pool.query(`
    SELECT DISTINCT telegram_id 
    FROM users 
    WHERE telegram_id IS NOT NULL 
      AND is_banned = FALSE
  `);
  const users = res.rows;
  console.log(`Starting broadcast to ${users.length} verified users...`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    try {
      await bot.sendMessage(user.telegram_id, message, options);
      successCount++;
    } catch (e) {
      failCount++;
    }

    if ((i + 1) % 50 === 0 || i === users.length - 1) {
      process.stdout.write(`\rProgress: ${i + 1}/${users.length} | Sent: ${successCount} | Failed: ${failCount}`);
    }

    await delay(35);
  }

  console.log(`\n\n🎉 Broadcast Complete!`);
  console.log(`Successfully sent to: ${successCount}`);
  console.log(`Failed (blocked/deactivated): ${failCount}`);

  await pool.end();
  process.exit(0);
}

main();

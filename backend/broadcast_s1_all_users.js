require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });
const imagePath = path.join(__dirname, 'assets', 's1_closing_official.jpg');

const caption = `🔥 <b>SEASON 1 GENESIS ERA — CLOSING PERMANENTLY IN 7 DAYS</b>

The initial Genesis distribution window is reaching its final countdown. Early supporters who hold tokens and active Season 1 NFT Miners are locked into the highest lifetime earning tier.

⚡ <b>What happens when Season 1 ends:</b>
• <b>Permanent Scarcity:</b> S1 Titan & Mega Miners will never be minted again.
• <b>Halving Ahead:</b> Public mining difficulty increases drastically after listing, reducing rewards for new incoming users.
• <b>Lifetime Advantage:</b> Genesis miners retain their maximum daily GRAM yield and priority in the 60% early allocation pool.

💎 <i>Top holders are locking in their daily passive yields before the final 7-day timer hits zero.</i>`;

const options = {
  caption,
  parse_mode: 'HTML',
  reply_markup: {
    inline_keyboard: [
      [
        { text: '💎 Claim S1 Miner Now 🚀', web_app: { url: 'https://tasky3.onrender.com' } }
      ]
    ]
  }
};

(async () => {
  try {
    const usersRes = await pool.query('SELECT telegram_id FROM users WHERE is_banned = false ORDER BY id ASC');
    const targets = usersRes.rows.map(r => r.telegram_id);
    console.log(`🚀 Starting Global S1 Closing Photo Broadcast to ALL USERS (${targets.length} active targets)...`);

    let success = 0;
    let failed = 0;

    const BATCH_SIZE = 25;
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (tid) => {
        try {
          await bot.sendPhoto(tid, fs.createReadStream(imagePath), options);
          success++;
        } catch (e) {
          failed++;
        }
      }));

      if ((i + BATCH_SIZE) % 250 === 0 || i + BATCH_SIZE >= targets.length) {
        console.log(`[PROGRESS] Processed ${Math.min(i + BATCH_SIZE, targets.length)} / ${targets.length} (Success: ${success}, Inactive/Blocked: ${failed})`);
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n🎉 GLOBAL S1 BROADCAST COMPLETED!`);
    console.log(`✅ Successfully delivered: ${success}`);
    console.log(`⚠️ Blocked/Deactivated by user: ${failed}`);
  } catch (err) {
    console.error('❌ Broadcast execution error:', err.message);
  } finally {
    process.exit();
  }
})();

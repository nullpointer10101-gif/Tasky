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

const bot = new TelegramBot(token);
const imagePath = path.join(__dirname, 'public/uploads/nft_banner_official.jpg');

const caption = `🚨 <b>HIGH YIELD LAUNCH: NFT MINERS & INSTANT DEPOSIT ARE LIVE!</b> 💎⚡️\n\nTasky Family, earn <b>guaranteed daily GRAM returns</b> directly into your vault balance! 🎁\n\n⚡️ <b>GRAM Mini Miner #01:</b> 0.5 GRAM ➔ <b>0.7 GRAM Total</b> (+0.07 GRAM/day / 10 Days)\n🚀 <b>GRAM Turbo Miner #02:</b> 1.0 GRAM ➔ <b>1.5 GRAM Total</b> (+0.15 GRAM/day / 10 Days)\n\n💎 <b>1-Tap Tonkeeper Pay & Instant Deposit:</b> Zero admin wait time — on-chain verified in seconds!\n\n👉 <b>Tap below to secure your NFT Miner now:</b>`;

(async () => {
  try {
    const usersRes = await pool.query('SELECT telegram_id FROM users WHERE is_banned = false');
    const allTargets = usersRes.rows.map(r => r.telegram_id);
    
    // Start from index 1500 (since 0..1500 are already sent!)
    const START_INDEX = 1500;
    const targets = allTargets.slice(START_INDEX);

    console.log(`🚀 [FINAL SPRINT] Resuming Global Broadcast from index ${START_INDEX} (${targets.length} remaining users)...`);

    let success = 1024;
    let failed = 501;

    const BATCH_SIZE = 20;
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (tid) => {
        try {
          await bot.sendPhoto(tid, fs.createReadStream(imagePath), {
            caption,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '⚡ Claim Your NFT Miner Now 💎', url: 'https://t.me/TaskyAppbot/app' }]
              ]
            }
          });
          success++;
        } catch (e) {
          failed++;
        }
      }));

      const currentTotal = START_INDEX + Math.min(i + BATCH_SIZE, targets.length);
      console.log(`[PROGRESS] Processed ${currentTotal} / ${allTargets.length} (Delivered: ${success}, Failed/Blocked: ${failed})`);
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`🎉 COMPLETED! ALL ${allTargets.length} USERS PROCESSED! Delivered: ${success}, Failed/Blocked: ${failed}`);
  } catch (err) {
    console.error('❌ Final Sprint error:', err.message);
  } finally {
    process.exit();
  }
})();

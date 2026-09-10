const axios = require('axios');
const https = require('https');
const path = require('path');
const { pool } = require('./db');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const token = process.env.TELEGRAM_BOT_TOKEN;
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 30 });

const client = axios.create({
  baseURL: `https://api.telegram.org/bot${token}`,
  httpsAgent,
  timeout: 10000
});

const caption = 
`🎉 <b>AUTOMATIC PAYOUTS ARE LIVE!</b> 🚀

💎 <b>Daily 0.02 GRAM Reward</b>
⚡ <b>Instant & Automatic</b> — Sent directly to your wallet!
🛡️ <b>On-Chain Verified</b> — Fast & secure on TON Blockchain.

📺 Complete your 60 daily ads & claim instantly!

👇 <b>Claim Your 0.02 GRAM Now!</b> 👇`;

const replyMarkup = {
  inline_keyboard: [
    [
      { text: '🎁 Claim 0.02 GRAM 🚀', url: 'https://t.me/TaskyAppbot/app' }
    ],
    [
      { text: '📢 Community', url: 'https://t.me/TaskyOfficialCommunity' },
      { text: '💳 Proofs', url: 'https://t.me/TaskyPayouts' }
    ]
  ]
};

const FILE_ID = 'AgACAgUAAxkDAAEEWe9qoYjFyrdPGA-5EHe-rN6wXl_3YAACiBlrG001CVV9whK-hxC3IwEAAwIAA3kAAz0E';

function isUserBlockError(errMsg) {
  if (!errMsg) return false;
  return /blocked|deactivated|chat not found|user not found|PEER_ID_INVALID|bot was blocked/i.test(String(errMsg));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function sendPhotoToUser(chatId, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await client.post('/sendPhoto', {
        chat_id: chatId,
        photo: FILE_ID,
        caption: caption,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      });
      return { success: true };
    } catch (err) {
      const respData = err.response?.data;
      const desc = respData?.description || err.message;

      if (isUserBlockError(desc)) {
        return { success: false, blocked: true };
      }

      if (err.response?.status === 429 || respData?.parameters?.retry_after) {
        const retrySec = respData?.parameters?.retry_after || 2;
        await sleep((retrySec + 1) * 1000);
      } else if (attempt < retries) {
        await sleep(300);
      } else {
        return { success: false, error: desc };
      }
    }
  }
}

async function run() {
  console.log('Fetching active users from database...');
  const usersRes = await pool.query(
    'SELECT telegram_id FROM users WHERE is_banned = false AND telegram_id IS NOT NULL ORDER BY id DESC'
  );
  const targets = usersRes.rows.map(r => r.telegram_id);
  console.log(`🚀 Broadcasting to ${targets.length} users with High-Speed HTTP/2 Keep-Alive Pipeline...`);

  let successCount = 0;
  let blockedCount = 0;
  let failedCount = 0;

  const BATCH_SIZE = 25;
  const startTime = Date.now();

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(batch.map(tid => sendPhotoToUser(tid)));

    for (const r of results) {
      if (r.success) successCount++;
      else if (r.blocked) blockedCount++;
      else failedCount++;
    }

    const processed = Math.min(i + BATCH_SIZE, targets.length);
    const pct = Math.round((processed / targets.length) * 100);
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);

    if (processed % 100 === 0 || processed === targets.length || processed <= 50) {
      console.log(`[Progress ${pct}% (${processed}/${targets.length})] ✅ Sent: ${successCount} | 🚫 Blocked: ${blockedCount} | ❌ Failed: ${failedCount} | ⏱️ ${elapsedSec}s`);
    }

    await sleep(400); // Respect Telegram 30 msg/sec global limit
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n🎉 Broadcast 100% Complete in ${totalTime}s!`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`🚫 Blocked/Deactivated: ${blockedCount}`);
  console.log(`❌ Failed: ${failedCount}`);

  process.exit(0);
}

run().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});

// broadcast_offer.js
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

// Prevent PG idle connection errors from crashing the script
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const BANNER_PATH = path.join(__dirname, 'assets', 'offer_banner.png');

const caption =
`\uD83C\uDF81 <b>Have you claimed your 20,000 TASKY yet?</b> \uD83D\uDC40

Open TASKY now, tap the \uD83C\uDF81 Gift icon, and complete the challenge before the event is over. \uD83D\uDE80

\uD83D\uDCB5 <b>20,000 TASKY = 1 USDT</b> \u2014 real value, yours for free!

\u23F0 <b>Limited 24-hour offer \u2014 don\u2019t miss out!</b>`;

const inlineKeyboard = {
  reply_markup: {
    inline_keyboard: [[
      { text: '\uD83D\uDD25 Claim My 20,000 TASKY!', url: 'https://t.me/TaskyAppbot/app' }
    ]]
  },
  parse_mode: 'HTML'
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function broadcast() {
  let client;
  try {
    client = await pool.connect();
    console.log('Fetching users from DB...');
    const result = await client.query('SELECT telegram_id FROM users WHERE is_banned = FALSE');
    const users = result.rows;
    console.log(`Found ${users.length} active users to broadcast to.`);

    if (users.length === 0) {
      console.log('No users found. Exiting.');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < users.length; i++) {
      const telegramId = users[i].telegram_id;
      
      let retries = 3;
      let success = false;
      while (retries > 0 && !success) {
        try {
          if (fs.existsSync(BANNER_PATH)) {
            await bot.sendPhoto(telegramId, fs.createReadStream(BANNER_PATH), {
              caption,
              parse_mode: 'HTML',
              reply_markup: inlineKeyboard.reply_markup
            });
          } else {
            await bot.sendMessage(telegramId, caption, inlineKeyboard);
          }
          successCount++;
          success = true;
          process.stdout.write(`\rProgress: ${i + 1}/${users.length} (Success: ${successCount}, Failed: ${failCount})`);
        } catch (err) {
          if (err.code === 'ENOTFOUND' || err.code === 'ECONNRESET') {
            // Network error, wait and retry
            retries--;
            await delay(1000);
          } else {
            // Probably blocked bot (403), stop retrying for this user
            failCount++;
            success = true; // Move to next
            if (err.response && err.response.statusCode === 403) {
               // User blocked bot, ignore
            } else {
               // Ignore other errors to keep going
            }
          }
        }
      }
      
      if (!success) {
        failCount++; // Failed after retries
      }
      
      await delay(50); 
    }

    console.log('\n\nBroadcast completed!');
    console.log(`Total sent successfully: ${successCount}`);
    console.log(`Total failed (e.g. bot blocked or network issues): ${failCount}`);

  } catch (err) {
    console.error('Error during broadcast:', err.message);
  } finally {
    if (client) client.release();
    pool.end();
    process.exit(0);
  }
}

broadcast();

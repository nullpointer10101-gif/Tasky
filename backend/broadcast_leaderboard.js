const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

const caption = '🔥 *THE TASKY LEADERBOARD IS LIVE!* 🔥\n\nGrind Tasks. Invite Friends. *Dominate.* 👑\n\n🏆 *WEEKLY REWARDS:*\n🥇 1st: *100 USDT* 💵\n🥈 2nd: *50 USDT* 💵\n🥉 3rd: *20 USDT* 💵\n🏅 4th-10th: *50,000 TASKY* 🪙\n\n💸 *GUARANTEED WEEKLY PAYOUTS!*\nReset every 7 days. Fresh competition. MASSIVE rewards.\n\nWho will be #1? 👑\n👇 Claim your 100 USDT NOW! 👇';

const opts = {
    caption: caption,
    parse_mode: 'Markdown',
    reply_markup: {
        inline_keyboard: [[{ text: 'Claim 100 USDT 💸', url: 'https://t.me/TaskyAppbot/app' }]]
    }
};

const photoPath = 'C:\\Users\\aleem\\.gemini\\antigravity-ide\\brain\\998eba36-471e-4d17-bb0a-fdd088a38d49\\media__1785355011828.png';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    console.log('Fetching users...');
    const res = await pool.query('SELECT telegram_id FROM users WHERE telegram_id IS NOT NULL');
    const users = res.rows;
    console.log(`Found ${users.length} users. Starting broadcast...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < users.length; i++) {
        const userId = users[i].telegram_id;
        try {
            await bot.sendPhoto(userId, fs.createReadStream(photoPath), opts);
            successCount++;
            process.stdout.write(`\rSent: ${successCount} | Failed: ${failCount} | Total: ${i + 1}/${users.length}`);
        } catch (e) {
            failCount++;
        }
        
        // Sleep to respect Telegram limits (30 msgs per sec). 35ms sleep -> ~28 msgs per sec.
        await delay(35);
    }
    
    console.log(`\n\nBroadcast Complete!`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed (Blocked bot, etc): ${failCount}`);
    process.exit(0);
}

run();

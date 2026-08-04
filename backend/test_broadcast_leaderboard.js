const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const fs = require('fs');

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

async function run() {
    const adminId = process.env.ADMIN_TELEGRAM_ID;
    if (!adminId) {
        console.error("No ADMIN_TELEGRAM_ID found in .env");
        process.exit(1);
    }
    console.log(`Sending preview to admin ID: ${adminId}`);
    try {
        if (fs.existsSync(photoPath)) {
            await bot.sendPhoto(adminId, fs.createReadStream(photoPath), opts);
            console.log('Preview with image sent successfully!');
        } else {
            console.log("Image not found. Sending text only.");
            await bot.sendMessage(adminId, caption, {
                parse_mode: 'Markdown',
                reply_markup: opts.reply_markup
            });
            console.log('Preview text sent successfully!');
        }
    } catch (e) {
        console.error("Failed:", e.message);
    } finally {
        process.exit(0);
    }
}

run();

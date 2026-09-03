require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) { console.error('No TELEGRAM_BOT_TOKEN'); process.exit(1); }

const bot = new TelegramBot(token, { polling: false });

const adminId = '8823265955';
const officialPath = path.join(__dirname, 'public/uploads/nft_banner_official.jpg');
const imageUrl = 'https://tasky-ivho.onrender.com/uploads/nft_banner_official.jpg';
const caption = '🧪 <b>Test NFT Broadcast</b>';
const replyMarkup = { inline_keyboard: [[{ text: '⚡ Claim Now', url: 'https://t.me/TaskyAppbot/app' }]] };

async function run() {
  // Test 1: sendPhoto with local file
  console.log('--- Test 1: sendPhoto with LOCAL FILE PATH ---');
  try {
    const res = await bot.sendPhoto(adminId, officialPath, { caption, parse_mode: 'HTML', reply_markup: replyMarkup });
    console.log('✅ Local file photo sent! msg_id:', res.message_id);
  } catch(e) {
    console.error('❌ Local file error:', e.response?.body || e.message);
  }

  // Test 2: sendPhoto with URL
  console.log('\n--- Test 2: sendPhoto with IMAGE URL ---');
  try {
    const res = await bot.sendPhoto(adminId, imageUrl, { caption, parse_mode: 'HTML', reply_markup: replyMarkup });
    console.log('✅ URL photo sent! msg_id:', res.message_id);
  } catch(e) {
    console.error('❌ URL photo error:', e.response?.body || e.message);
  }

  // Test 3: sendMessage (text only)
  console.log('\n--- Test 3: sendMessage TEXT ONLY ---');
  try {
    const res = await bot.sendMessage(adminId, caption, { parse_mode: 'HTML', reply_markup: replyMarkup });
    console.log('✅ Text message sent! msg_id:', res.message_id);
  } catch(e) {
    console.error('❌ Text message error:', e.response?.body || e.message);
  }
}

run();

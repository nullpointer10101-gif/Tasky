require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('No TELEGRAM_BOT_TOKEN');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });

async function testTarget() {
  const adminId = '8823265955';
  console.log(`Sending test message to admin ID ${adminId}...`);
  try {
    const res = await bot.sendMessage(adminId, '🧪 Tasky Admin Broadcast Test');
    console.log('✅ SUCCESS! Message ID:', res.message_id);
  } catch (err) {
    console.error('❌ TELEGRAM API ERROR:', err.response?.body || err.message);
  }
}

testTarget();

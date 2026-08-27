const bot = require('./bot');
require('dotenv').config();

async function testMsg() {
  try {
    // Assuming you have a telegram_id you can test with, or we just verify bot is defined
    console.log("bot.sendMessage is function?", typeof bot.sendMessage === 'function');
  } catch (e) {
    console.error(e);
  }
  process.exit();
}
testMsg();

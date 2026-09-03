require('dotenv').config();
const path = require('path');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
console.log('Bot token present:', !!token);

if (!token) {
  console.error('No TELEGRAM_BOT_TOKEN in .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });
const targetId = '6446145632'; // Kanzx
const officialPath = path.join(__dirname, 'public/uploads/nft_banner_official.jpg');

async function testMethods() {
  console.log('File path:', officialPath, 'Exists:', fs.existsSync(officialPath));

  // Method 1: Absolute File Path String
  try {
    console.log('Testing Method 1: Absolute file path string...');
    const r1 = await bot.sendPhoto(targetId, officialPath, {
      caption: 'Method 1: Absolute File Path String test',
      parse_mode: 'HTML'
    });
    console.log('Method 1 Success! Message ID:', r1.message_id);
  } catch (err) {
    console.error('Method 1 Failed:', err.message);
  }

  // Method 2: Buffer
  try {
    console.log('Testing Method 2: Buffer...');
    const buffer = fs.readFileSync(officialPath);
    const r2 = await bot.sendPhoto(targetId, buffer, {
      caption: 'Method 2: Buffer test',
      parse_mode: 'HTML'
    });
    console.log('Method 2 Success! Message ID:', r2.message_id);
  } catch (err) {
    console.error('Method 2 Failed:', err.message);
  }

  // Method 3: createReadStream
  try {
    console.log('Testing Method 3: createReadStream...');
    const stream = fs.createReadStream(officialPath);
    const r3 = await bot.sendPhoto(targetId, stream, {
      caption: 'Method 3: createReadStream test',
      parse_mode: 'HTML'
    });
    console.log('Method 3 Success! Message ID:', r3.message_id);
  } catch (err) {
    console.error('Method 3 Failed:', err.message);
  }
}

testMethods();

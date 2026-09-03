require('dotenv').config();
const path = require('path');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.BOT_TOKEN);

async function testSend() {
  const targets = ['8823265955', '6446145632'];
  const officialPath = path.join(__dirname, 'public/uploads/nft_banner_official.jpg');
  console.log('Testing sendPhoto using file:', officialPath, 'Exists:', fs.existsSync(officialPath));

  for (const tid of targets) {
    try {
      console.log(`Sending to ${tid}...`);
      const res = await bot.sendPhoto(tid, fs.createReadStream(officialPath), {
        caption: `🧪 <b>ADMIN TEST BROADCAST: NFT MINERS ARE LIVE!</b> 💎\n\nTasky family, buy limited <b>Tasky NFT Digital Miners</b> and earn guaranteed daily GRAM returns!`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⚡ Claim Your NFT Miner Now 💎', url: 'https://t.me/TaskyAppbot/app' }]
          ]
        }
      });
      console.log(`✅ Success for ${tid}! Message ID: ${res.message_id}`);
    } catch (err) {
      console.error(`❌ Failed for ${tid}:`, err.message);
    }
  }
}

testSend();

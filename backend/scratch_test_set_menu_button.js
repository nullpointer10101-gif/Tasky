const axios = require('axios');
require('dotenv').config({ path: './.env' });

const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || process.env.TG_BOT_TOKEN;

async function main() {
  if (!token) return;

  try {
    console.log('--- Test 4: Delete My Commands ---');
    let delRes = await axios.post(`https://api.telegram.org/bot${token}/deleteMyCommands`, {});
    console.log('deleteMyCommands response:', delRes.data);

    let check = await axios.post(`https://api.telegram.org/bot${token}/getChatMenuButton`, {});
    console.log('getChatMenuButton (global after deleteMyCommands):', check.data);

    // Re-apply setChatMenuButton globally
    let setRes = await axios.post(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      menu_button: {
        type: 'web_app',
        text: 'Open TASKY',
        web_app: { url: 'https://tasky-v3.vercel.app' }
      }
    });
    console.log('setChatMenuButton global response:', setRes.data);

    check = await axios.post(`https://api.telegram.org/bot${token}/getChatMenuButton`, {});
    console.log('getChatMenuButton (global after setChatMenuButton):', check.data);

  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

main();

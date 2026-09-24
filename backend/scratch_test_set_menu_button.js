const axios = require('axios');
require('dotenv').config({ path: './.env' });

const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || process.env.TG_BOT_TOKEN;

async function main() {
  if (!token) return;

  try {
    const adminId = '8823265955';
    const check = await axios.post(`https://api.telegram.org/bot${token}/getChatMenuButton`, { chat_id: adminId });
    console.log(`getChatMenuButton for ${adminId}:`, JSON.stringify(check.data, null, 2));
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

main();

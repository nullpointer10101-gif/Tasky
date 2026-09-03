require('dotenv').config();
const bot = require('./bot');

function sendAdminBroadcast(message, extraOpts = {}) {
  try {
    const adminIds = ['8823265955'];
    if (process.env.ADMIN_TELEGRAM_ID && !adminIds.includes(process.env.ADMIN_TELEGRAM_ID)) {
      adminIds.push(process.env.ADMIN_TELEGRAM_ID);
    }
    const targetBot = (bot && !bot.isDummy && typeof bot.sendMessage === 'function') ? bot : null;
    if (targetBot) {
      adminIds.forEach(adminId => {
        targetBot.sendMessage(adminId, message, { parse_mode: 'HTML', ...extraOpts }).catch(err => {
          console.warn(`[ADMIN NOTIFY] Failed to notify ${adminId}:`, err.message);
        });
      });
    } else {
      console.error('Target bot not available or dummy');
    }
  } catch (err) {
    console.error('[ADMIN NOTIFY ERROR]:', err.message);
  }
}

console.log('Sending test deposit notification...');
sendAdminBroadcast(
  `💰 <b>NEW GRAM DEPOSIT VERIFIED!</b>\n\n` +
  `👤 <b>User:</b> @testuser (<code>8823265955</code>)\n` +
  `💎 <b>Amount Credited:</b> +1.500 GRAM\n` +
  `🔗 <b>Tx Hash:</b> <code>abc123xyz...9876</code>\n` +
  `⚡ <b>Verification:</b> TON Blockchain Auto-Verified\n` +
  `💳 <b>New User Balance:</b> 10.500 GRAM`
);

console.log('Sending test NFT purchase notification...');
sendAdminBroadcast(
  `🛒 <b>🚀 NEW NFT MINER PURCHASE</b>\n\n` +
  `👤 <b>User:</b> @testuser (<code>8823265955</code>)\n` +
  `⚡ <b>NFT Miner:</b> Tasky Turbo Miner #02\n` +
  `💰 <b>Price Paid:</b> 1.0 GRAM\n` +
  `📈 <b>Daily Return:</b> +0.15 GRAM/day (10 Days Total)\n` +
  `💳 <b>New User Balance:</b> 9.500 GRAM`
);

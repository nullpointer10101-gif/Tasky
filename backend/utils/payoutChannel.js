const { pool } = require('../db');

/**
 * Masks a Telegram ID for privacy (e.g., 8433403003 -> 8433***003)
 */
function maskTelegramId(id) {
  if (!id) return '';
  const s = String(id);
  if (s.length <= 4) return s;
  return `${s.slice(0, 4)}***${s.slice(-3)}`;
}

/**
 * Masks a Wallet address for clean display (e.g., UQD1_Wj...FxM8)
 */
function maskWallet(wallet) {
  if (!wallet) return 'N/A';
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 8)}...${wallet.slice(-6)}`;
}

/**
 * Formats a clean Tonviewer / Blockchain explorer link from a tx_hash
 */
function getExplorerLink(txHash) {
  if (!txHash) return null;
  let clean = String(txHash).trim();
  clean = clean.replace(/^['"<\[(]+|['">\])]+$/g, '').trim();
  if (!clean) return null;
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  return `https://tonviewer.com/transaction/${clean}`;
}

/**
 * Broadcasts a verified payout proof post to the configured Telegram Payout Channel.
 * 
 * @param {Object} bot Telegram Bot instance (node-telegram-bot-api)
 * @param {Object} params
 * @param {string} params.type Reward / Payout type (e.g. 'Daily Quest 0.02 GRAM', 'Gram Balance Withdrawal', 'USDT Swap')
 * @param {string|number} params.amount Amount sent
 * @param {string} params.token Currency ticker (e.g. 'GRAM', 'USDT')
 * @param {string} params.wallet Recipient wallet address
 * @param {string} [params.tx_hash] Blockchain transaction hash or link
 * @param {string|number} [params.telegram_id] Recipient Telegram user ID
 * @param {string} [params.username] Recipient Telegram @username
 * @param {string} [params.first_name] Recipient first name
 */
async function broadcastPayoutProof(bot, {
  type = 'Daily Quest Reward',
  amount = '0.02',
  token = 'GRAM',
  wallet = '',
  tx_hash = null,
  telegram_id = '',
  username = '',
  first_name = ''
}) {
  try {
    if (!bot || !bot.sendMessage) {
      console.log('[PayoutChannel] Bot instance not available, skipping proof post');
      return { skipped: true, reason: 'bot_unavailable' };
    }

    // 1. Resolve Target Channel
    let channelId = process.env.PAYOUT_CHANNEL_ID;
    let channelEnabled = true;

    try {
      const res = await pool.query('SELECT payout_channel_id, payout_channel_enabled FROM withdrawal_settings LIMIT 1');
      if (res.rows.length > 0) {
        if (res.rows[0].payout_channel_id) {
          channelId = res.rows[0].payout_channel_id.trim();
        }
        if (res.rows[0].payout_channel_enabled === false) {
          channelEnabled = false;
        }
      }
    } catch (dbErr) {
      console.error('[PayoutChannel] DB settings fetch error:', dbErr.message);
    }

    if (!channelEnabled) {
      console.log('[PayoutChannel] Payout channel broadcast is currently disabled in settings');
      return { skipped: true, reason: 'disabled' };
    }

    if (!channelId) {
      console.log('[PayoutChannel] No PAYOUT_CHANNEL_ID configured in .env or settings');
      return { skipped: true, reason: 'not_configured' };
    }

    // 2. Format User Display
    let recipientDisplay = '';
    const cleanName = (first_name || '').replace(/[<>]/g, '').trim();
    if (username) {
      recipientDisplay = `@${username.replace(/^@/, '')} ${cleanName ? `(${cleanName})` : ''}`.trim();
    } else if (cleanName) {
      recipientDisplay = cleanName;
    } else {
      recipientDisplay = 'Active Member';
    }
    if (telegram_id) {
      recipientDisplay += ` <code>[ID: ${maskTelegramId(telegram_id)}]</code>`;
    }

    // 3. Format Transaction Explorer Link
    const explorerLink = getExplorerLink(tx_hash);
    const txLine = explorerLink
      ? `🔗 <b>Tonviewer Transaction Link:</b>\n<a href="${explorerLink}">${explorerLink}</a>\n\n`
      : (wallet ? `🔗 <b>Tonviewer Explorer:</b>\n<a href="https://tonviewer.com/${wallet}">https://tonviewer.com/${maskWallet(wallet)}</a>\n\n` : '');

    const dateStr = new Date().toUTCString().replace('GMT', 'UTC');

    // 4. Construct Message HTML
    const messageHtml = 
`💎 <b>TASKY VERIFIED PAYOUT PROOF</b> 💎
━━━━━━━━━━━━━━━━━━━━

👤 <b>Recipient:</b> ${recipientDisplay}
💰 <b>Amount Paid:</b> <b>${amount} ${token}</b>
🏷 <b>Reward Type:</b> ${type}
🏦 <b>Tonkeeper Wallet:</b> <code>${wallet || 'N/A'}</code>
⏰ <b>Date & Time:</b> ${dateStr}

${txLine}━━━━━━━━━━━━━━━━━━━━
✅ <b>Status:</b> <b>Confirmed & Paid on TON Blockchain</b> ⚡
🌟 <i>Tasky delivers verified crypto earnings daily! Join our community & start earning today.</i>`;

    // 5. Build Inline Keyboard
    const inline_keyboard = [
      [
        { text: '🚀 Open Tasky & Earn', url: 'https://t.me/TaskyAppbot/app' }
      ]
    ];

    if (explorerLink) {
      inline_keyboard[0].push({ text: '🌐 View on Tonviewer', url: explorerLink });
    } else if (wallet) {
      inline_keyboard[0].push({ text: '🌐 View Wallet', url: `https://tonviewer.com/${wallet}` });
    }

    // 6. Send to Channel
    const result = await bot.sendMessage(channelId, messageHtml, {
      parse_mode: 'HTML',
      disable_web_page_preview: false,
      reply_markup: { inline_keyboard }
    });

    console.log(`[PayoutChannel] Successfully posted payout proof to ${channelId} (msg_id: ${result?.message_id})`);
    return { success: true, message_id: result?.message_id };
  } catch (err) {
    console.error(`[PayoutChannel] Failed to post payout proof to channel:`, err.message);
    return { error: err.message };
  }
}

module.exports = {
  broadcastPayoutProof,
  maskTelegramId,
  maskWallet,
  getExplorerLink
};

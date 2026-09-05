const fs = require('fs');
const path = require('path');
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
  // Auto-pad leading zero if transaction hash was copied with 63 hex characters instead of 64
  if (/^[0-9a-fA-F]{63}$/.test(clean)) {
    clean = '0' + clean;
  }
  return `https://tonviewer.com/transaction/${clean}`;
}

/**
 * Fetches the dynamic OpenGraph transfer image card URL from Tonviewer for a transaction link
 */
async function fetchTonviewerOgImage(explorerLink) {
  if (!explorerLink || !explorerLink.includes('tonviewer.com')) return null;
  try {
    const res = await fetch(explorerLink, {
      headers: { 'User-Agent': 'TelegramBot (like TwitterBot)' },
      signal: AbortSignal.timeout(4500)
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (match && match[1]) {
      return match[1];
    }
  } catch (e) {}
  return null;
}

/**
 * Broadcasts a verified payout proof post to the configured Telegram Payout Channel.
 */
async function broadcastPayoutProof(bot, {
  type = 'Daily Quest Reward',
  amount = '0.02',
  token = 'GRAM',
  wallet = '',
  tx_hash = null,
  telegram_id = '',
  username = '',
  first_name = '',
  is_nft = false,
  nft_name = ''
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

    // Auto-detect NFT payout
    const isNftPayout = is_nft || /nft|miner/i.test(type) || !!nft_name;

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

    // 3. Format Transaction Explorer Link & Fetch OG Image Card
    const explorerLink = getExplorerLink(tx_hash);
    const ogImageUrl = await fetchTonviewerOgImage(explorerLink);
    console.log('[PayoutChannel] Explorer link:', explorerLink, '| OG Image URL:', ogImageUrl ? 'Found' : 'Not Found');

    const txLine = explorerLink
      ? `🔗 <b>Tonviewer Transaction Link:</b>\n<a href="${explorerLink}">${explorerLink}</a>\n\n`
      : (wallet ? `🔗 <b>Tonviewer Explorer:</b>\n<a href="https://tonviewer.com/${wallet}">https://tonviewer.com/${maskWallet(wallet)}</a>\n\n` : '');

    const dateStr = new Date().toUTCString().replace('GMT', 'UTC');

    // 4. Construct Message HTML (NFT Miner VIP theme vs Standard theme)
    let messageHtml = '';

    if (isNftPayout) {
      // 🌟 NFT DIGITAL MINER PROOF THEME 🚀
      messageHtml = 
`✨ <b>NFT DIGITAL MINER PAYOUT PROOF</b> 🚀
💎 <b>TASKY HIGH YIELD VIP RETURN</b> 💎
━━━━━━━━━━━━━━━━━━━━

👤 <b>VIP Holder:</b> ${recipientDisplay}
💎 <b>NFT Miner:</b> <b>${nft_name || 'NFT Digital Miner'}</b>
💰 <b>Amount Paid:</b> <b>${amount} ${token}</b>
🏷 <b>Reward Type:</b> ${type}
🏦 <b>Tonkeeper Wallet:</b> <code>${wallet || 'N/A'}</code>
⏰ <b>Date & Time:</b> ${dateStr}

${txLine}━━━━━━━━━━━━━━━━━━━━
⚡️ <b>Status:</b> <b>Confirmed & Paid on TON Blockchain</b> ⚡️
💎 <i>Earn guaranteed daily passive GRAM returns with Tasky NFT Digital Miners!</i>`;
    } else {
      // ⚡️ STANDARD VERIFIED PAYOUT PROOF THEME 💎
      messageHtml = 
`⚡️ <b>TASKY VERIFIED PAYOUT PROOF</b> 💎
━━━━━━━━━━━━━━━━━━━━

👤 <b>Recipient:</b> ${recipientDisplay}
💰 <b>Amount Paid:</b> <b>${amount} ${token}</b>
🏷 <b>Reward Type:</b> ${type}
🏦 <b>Tonkeeper Wallet:</b> <code>${wallet || 'N/A'}</code>
⏰ <b>Date & Time:</b> ${dateStr}

${txLine}━━━━━━━━━━━━━━━━━━━━
✅ <b>Status:</b> <b>Confirmed & Paid on TON Blockchain</b> ⚡️
🌟 <i>Tasky delivers verified crypto earnings daily! Join our community & start earning today.</i>`;
    }

    // 5. Build Inline Keyboard
    const inline_keyboard = [
      [
        { text: isNftPayout ? '⚡ Claim NFT Miner Now 💎' : '🚀 Open Tasky & Earn', url: 'https://t.me/TaskyAppbot/app' }
      ]
    ];

    if (explorerLink) {
      inline_keyboard[0].push({ text: '🌐 View on Tonviewer', url: explorerLink });
    } else if (wallet) {
      inline_keyboard[0].push({ text: '🌐 View Wallet', url: `https://tonviewer.com/${wallet}` });
    }

    // 6. Broadcast logic:
    // A) If Tonviewer OG image card URL is found, send as PHOTO (shows transaction receipt card with amount & status)
    if (ogImageUrl) {
      try {
        const photoResult = await bot.sendPhoto(channelId, ogImageUrl, {
          caption: messageHtml,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard }
        });
        console.log(`[PayoutChannel] Successfully posted Tonviewer transaction photo card to ${channelId} (msg_id: ${photoResult?.message_id})`);
        return { success: true, message_id: photoResult?.message_id };
      } catch (photoErr) {
        console.error(`[PayoutChannel] sendPhoto with ogImageUrl failed:`, photoErr.message);
      }
    }

    // B) If it's an NFT payout, send NFT banner photo
    const bannerPath = path.join(__dirname, '../public/uploads/nft_banner_official.jpg');
    if (isNftPayout && fs.existsSync(bannerPath)) {
      try {
        const stream = fs.createReadStream(bannerPath);
        const nftResult = await bot.sendPhoto(channelId, stream, {
          caption: messageHtml,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard }
        });
        console.log(`[PayoutChannel] Successfully posted NFT banner photo to ${channelId} (msg_id: ${nftResult?.message_id})`);
        return { success: true, message_id: nftResult?.message_id };
      } catch (nftErr) {
        console.error(`[PayoutChannel] sendPhoto with NFT banner failed:`, nftErr.message);
      }
    }

    // C) Fallback: Send message with link_preview_options
    const textResult = await bot.sendMessage(channelId, messageHtml, {
      parse_mode: 'HTML',
      link_preview_options: explorerLink ? {
        url: explorerLink,
        is_disabled: false,
        prefer_large_media: true,
        show_above_text: false
      } : { is_disabled: false },
      reply_markup: { inline_keyboard }
    });

    console.log(`[PayoutChannel] Successfully posted payout proof text to ${channelId} (msg_id: ${textResult?.message_id})`);
    return { success: true, message_id: textResult?.message_id };
  } catch (err) {
    console.error(`[PayoutChannel] Failed to post payout proof to channel:`, err.message);
    return { error: err.message };
  }
}

module.exports = {
  broadcastPayoutProof,
  maskTelegramId,
  maskWallet,
  getExplorerLink,
  fetchTonviewerOgImage
};

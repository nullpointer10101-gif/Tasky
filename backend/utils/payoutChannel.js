const fs = require('fs');
const path = require('path');
const { pool } = require('../db');
const { Resvg } = require('@resvg/resvg-js');

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
 * Dynamically generates a high-DPI crisp PNG payout card image displaying the amount, recipient, and status
 */
function generatePayoutCardPngBuffer({ amount, token, recipient, wallet, type, dateStr }) {
  const amountText = `+${amount} ${token}`;
  const truncatedWallet = wallet ? (wallet.length > 20 ? `${wallet.slice(0, 10)}...${wallet.slice(-8)}` : wallet) : 'N/A';
  const cleanRecipient = (recipient || 'Active Member').replace(/[<>&]/g, '');

  const svg = `
  <svg width="800" height="420" viewBox="0 0 800 420" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0a0f1d"/>
        <stop offset="50%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#070a14"/>
      </linearGradient>

      <linearGradient id="amountGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#00f2fe"/>
        <stop offset="100%" stop-color="#4facfe"/>
      </linearGradient>

      <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>

      <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.6"/>
        <stop offset="50%" stop-color="#1e293b" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="#818cf8" stop-opacity="0.4"/>
      </linearGradient>

      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="12" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>

    <!-- Outer Frame & Background -->
    <rect width="800" height="420" rx="20" fill="url(#bgGrad)"/>
    <rect x="2" y="2" width="796" height="416" rx="18" fill="none" stroke="url(#borderGrad)" stroke-width="2"/>

    <!-- Decorative Glow Accents -->
    <circle cx="120" cy="80" r="140" fill="#00f2fe" opacity="0.08" filter="url(#glow)"/>
    <circle cx="680" cy="340" r="160" fill="#6366f1" opacity="0.08" filter="url(#glow)"/>

    <!-- Header Section -->
    <g transform="translate(30, 40)">
      <!-- Tasky Brand Pill -->
      <rect width="210" height="36" rx="18" fill="url(#badgeGrad)" stroke="#38bdf8" stroke-opacity="0.4" stroke-width="1"/>
      <text x="16" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#38bdf8">⚡ TASKY PAYOUT</text>
      <text x="175" y="23" font-size="14">💎</text>

      <!-- Status Pill -->
      <g transform="translate(510, 0)">
        <rect width="230" height="36" rx="18" fill="#065f46" fill-opacity="0.4" stroke="#10b981" stroke-width="1.5"/>
        <circle cx="20" cy="18" r="5" fill="#10b981"/>
        <text x="34" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#34d399">VERIFIED ON BLOCKCHAIN</text>
      </g>
    </g>

    <!-- Center Hero Card (Amount Container) -->
    <g transform="translate(30, 95)">
      <rect width="740" height="150" rx="16" fill="url(#badgeGrad)" stroke="#1e293b" stroke-width="1.5"/>
      
      <!-- Label -->
      <text x="370" y="38" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#94a3b8" letter-spacing="1.5" text-anchor="middle">TOTAL AMOUNT SENT</text>
      
      <!-- Big Amount Text -->
      <text x="370" y="98" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="900" fill="url(#amountGrad)" text-anchor="middle" filter="url(#glow)">${amountText}</text>
      
      <!-- Subtitle Badge -->
      <text x="370" y="130" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="500" fill="#38bdf8" text-anchor="middle">Instant TON Blockchain Transfer</text>
    </g>

    <!-- Details Grid -->
    <g transform="translate(30, 265)">
      <!-- Box Left: User & Wallet -->
      <rect width="360" height="100" rx="12" fill="#0f172a" stroke="#1e293b" stroke-width="1"/>
      <text x="20" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="500" fill="#64748b">RECIPIENT</text>
      <text x="20" y="54" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#f8fafc">${cleanRecipient}</text>
      
      <text x="20" y="80" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="500" fill="#94a3b8">Tonkeeper: <tspan fill="#38bdf8" font-family="monospace">${truncatedWallet}</tspan></text>

      <!-- Box Right: Type & Time -->
      <g transform="translate(380, 0)">
        <rect width="360" height="100" rx="12" fill="#0f172a" stroke="#1e293b" stroke-width="1"/>
        <text x="20" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="500" fill="#64748b">REWARD DETAILS</text>
        <text x="20" y="54" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#f8fafc">${type}</text>
        <text x="20" y="80" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500" fill="#64748b">Date: ${dateStr}</text>
      </g>
    </g>

    <!-- Footer Branding -->
    <g transform="translate(30, 388)">
      <text x="0" y="14" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#475569">Tasky Bot Community • Earn Daily Crypto Rewards</text>
      <text x="740" y="14" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#38bdf8" text-anchor="end">@TaskyAppbot</text>
    </g>
  </svg>
  `;

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  return resvg.render().asPng();
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
    // Option A: If Tonviewer OG image card URL is found and NOT generic fallback white logo, send Tonviewer card photo
    if (ogImageUrl && !ogImageUrl.includes('og-image.png') && !ogImageUrl.includes('assets/images')) {
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

    // Option B: If NFT payout, send official NFT banner photo
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

    // Option C: Generate dynamic crisp PNG payout card displaying exact amount (+0.02 GRAM) & recipient details
    try {
      const pngBuffer = generatePayoutCardPngBuffer({
        amount,
        token,
        recipient: username ? `@${username}` : (first_name || 'Member'),
        wallet,
        type,
        dateStr
      });

      const cardResult = await bot.sendPhoto(channelId, pngBuffer, {
        caption: messageHtml,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard }
      }, {
        filename: 'payout-proof.png',
        contentType: 'image/png'
      });

      console.log(`[PayoutChannel] Successfully posted custom dynamic amount card to ${channelId} (msg_id: ${cardResult?.message_id})`);
      return { success: true, message_id: cardResult?.message_id };
    } catch (cardErr) {
      console.error(`[PayoutChannel] sendPhoto with dynamic PNG card failed:`, cardErr.message);
    }

    // Fallback: Send message with link_preview_options
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
  fetchTonviewerOgImage,
  generatePayoutCardPngBuffer
};

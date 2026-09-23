const { pool } = require('../db');
const bot = require('../bot');
const TelegramBot = require('node-telegram-bot-api');

function getActiveTelegramBot() {
  if (bot && !bot.isDummy && typeof bot.sendMessage === 'function') {
    return bot;
  }
  const candidateTokens = [
    process.env.TELEGRAM_BOT_TOKEN,
    process.env.BOT_TOKEN,
    process.env.TG_BOT_TOKEN,
    process.env.TELEGRAM_TOKEN
  ].filter(t => t && t !== 'your_bot_token_here' && t.trim() !== '');

  if (candidateTokens.length > 0) {
    const fallbackBot = new TelegramBot(candidateTokens[0], { polling: false });
    fallbackBot.isDummy = false;
    return fallbackBot;
  }
  return null;
}

function isUserBlockError(errMsg) {
  if (!errMsg) return false;
  return /blocked|deactivated|chat not found/i.test(String(errMsg));
}

async function sendWithRetry(sendFn, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await sendFn();
    } catch (err) {
      if (err.message && (err.message.includes('429') || /retry after/i.test(err.message))) {
        const match = err.message.match(/retry after (\d+)/i);
        const retrySec = match ? parseInt(match[1], 10) : 2;
        await new Promise(r => setTimeout(r, (retrySec + 1) * 1000));
      } else {
        throw err;
      }
    }
  }
}

const TEMPLATES = [
  {
    label: "Variant 1: Daily 0.02 GRAM Quest Reminder 💎",
    text: `⚠️ <b>You have not claimed your daily GRAM reward yet!</b>\n\nGo complete your 60 daily ads now and claim your <b>0.02 GRAM</b> reward directly to your TON wallet!\n\n💎 <b>Claim your GRAM now:</b>`,
    button: "🎁 Claim 0.02 GRAM Now 🚀"
  },
  {
    label: "Variant 2: Free GRAM Daily Payout 🎁",
    text: `🔥 <b>Free GRAM waiting to be claimed!</b>\n\nDon't miss out on your daily yield. Watch your 60 short ads now and unlock <b>0.02 GRAM</b> paid instantly to your wallet!\n\n⚡️ <b>Get your free GRAM tokens here:</b>`,
    button: "💎 Claim Free GRAM Yield ⚡"
  },
  {
    label: "Variant 3: Ad Slots Refreshed ⚡",
    text: `🚀 <b>Ad slots refreshed! Ready for GRAM?</b>\n\nWatch 60 ads inside the Tasky Mini App to grab your daily <b>0.02 GRAM</b> reward. Fast, easy, and direct to your TON wallet.\n\n👉 <b>Click below to start:</b>`,
    button: "📲 Open Tasky & Earn GRAM 🎁"
  },
  {
    label: "Variant 4: High Demand Cap Urgency 🚨",
    text: `🚨 <b>URGENT: Gram rewards pool is active!</b>\n\nDaily cap is reaching limit. Finish your 60 ads right now and secure your <b>0.02 GRAM</b> direct payout before the reset!\n\n💰 <b>Secure your payout here:</b>`,
    button: "⚡️ Secure My GRAM Payout 💵"
  },
  {
    label: "Variant 5: Claim & Rank Up 🏆",
    text: `🏆 <b>Boost your Tasky status with free GRAM!</b>\n\nDaily active miners are already claiming. Watch your 60 ads to unlock <b>0.02 GRAM</b> and increase your daily rank!\n\n💎 <b>Claim & Rank Up:</b>`,
    button: "🚀 Claim & Increase Rank 🏆"
  },
  {
    label: "Variant 6: Cyber Reactor Jackpot Special 💥",
    text: `💥 <b>2.00 GRAM Jackpot Vault is Charging!</b>\n\nCharge your Cyber Reactor! Every ad watched brings you closer to unlocking the <b>2.00 GRAM</b> jackpot vault + 20,000 TASKY bonus!\n\n⚡️ <b>Charge Core & Earn GRAM:</b>`,
    button: "💥 Charge Core & Claim GRAM 💎"
  },
  {
    label: "Variant 7: Daily Bounty Refresh 💸",
    text: `🎁 <b>Fresh Daily Bounty Available!</b>\n\nYour 0.02 GRAM daily task reward is ready for pickup. Complete your short ad sessions and cash out straight to TON!\n\n💸 <b>Claim your bounty below:</b>`,
    button: "💸 Claim Daily Bounty 🚀"
  },
  {
    label: "Variant 8: Exclusive Instant Payout 👑",
    text: `👑 <b>Exclusive GRAM Rewards Active!</b>\n\nDon't leave free crypto on the table! Tap below to open Tasky, complete your ads, and receive your <b>0.02 GRAM</b> reward instantly.\n\n💎 <b>Tap to launch Tasky:</b>`,
    button: "💎 Open Tasky App Now ⚡"
  }
];

let _serviceTimer = null;

async function getAutoGramSettings() {
  try {
    const { rows } = await pool.query("SELECT value FROM system_settings WHERE key = 'auto_gram_broadcast'");
    if (rows.length > 0 && rows[0].value) {
      return rows[0].value;
    }
  } catch (e) {
    console.error('[AUTO GRAM] Error loading settings:', e.message);
  }
  return {
    enabled: false,
    templateIndex: 0,
    intervalHours: 1,
    lastRunAt: null,
    nextRunAt: null,
    runCount: 0,
    totalSentSuccess: 0
  };
}

async function saveAutoGramSettings(settings) {
  try {
    await pool.query(
      `INSERT INTO system_settings (key, value) VALUES ('auto_gram_broadcast', $1) 
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [JSON.stringify(settings)]
    );
  } catch (e) {
    console.error('[AUTO GRAM] Error saving settings:', e.message);
  }
}

async function executeHourlyBroadcast(templateIdx = 0, isAutomated = true) {
  if (global.gramReminderBroadcast && global.gramReminderBroadcast.status === 'running') {
    console.log('[AUTO GRAM] Skip broadcast: Another GRAM broadcast is currently running.');
    return { success: false, reason: 'BROADCAST_RUNNING' };
  }

  const idx = parseInt(templateIdx, 10) % TEMPLATES.length;
  const selectedTemplate = TEMPLATES[idx] || TEMPLATES[0];
  const text = selectedTemplate.text;
  const buttonText = selectedTemplate.button;

  const query = `
    SELECT telegram_id FROM users 
    WHERE is_banned = false 
      AND telegram_id IS NOT NULL
      AND telegram_id NOT IN (
        SELECT telegram_id FROM gram_claims 
        WHERE telegram_id IS NOT NULL
          AND requested_at >= NOW() - INTERVAL '24 hours'
          AND status IN ('pending', 'approved')
      )
  `;
  const usersRes = await pool.query(query);
  const targets = usersRes.rows.map(r => r.telegram_id);

  console.log(`[AUTO GRAM BROADCAST] ${isAutomated ? 'Hourly Auto-Run' : 'Manual Run'} | Target users: ${targets.length} | Template Variant: #${idx + 1}`);

  global.gramReminderBroadcast = {
    target: 'all',
    total: targets.length,
    success: 0,
    failed: 0,
    status: 'running',
    currentIdx: 0,
    templateIndex: idx,
    startTime: Date.now(),
    isAutomated
  };

  const activeBot = getActiveTelegramBot();
  if (!activeBot) {
    global.gramReminderBroadcast.status = 'failed';
    global.gramReminderBroadcast.lastError = 'Telegram bot is not initialized';
    return { success: false, reason: 'NO_BOT' };
  }

  const replyMarkup = {
    inline_keyboard: [
      [{ text: buttonText, web_app: { url: 'https://tasky-v3.vercel.app' } }]
    ]
  };

  const BATCH_SIZE = 25;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    if (global.gramReminderBroadcast && global.gramReminderBroadcast.status === 'cancelled') break;

    const batch = targets.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (tid) => {
      try {
        await sendWithRetry(() => activeBot.sendMessage(tid, text, { 
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        }));
        if (global.gramReminderBroadcast) global.gramReminderBroadcast.success++;
      } catch (err) {
        if (global.gramReminderBroadcast) {
          global.gramReminderBroadcast.failed++;
          if (!isUserBlockError(err.message)) {
            global.gramReminderBroadcast.lastError = err.message;
          }
        }
      }
    }));

    if (global.gramReminderBroadcast) {
      global.gramReminderBroadcast.currentIdx = Math.min(i + BATCH_SIZE, targets.length);
    }
    await new Promise(r => setTimeout(r, 350));
  }

  if (global.gramReminderBroadcast && global.gramReminderBroadcast.status === 'running') {
    global.gramReminderBroadcast.status = 'completed';
  }

  console.log(`[AUTO GRAM BROADCAST] Finished! Variant #${idx + 1} | Sent: ${global.gramReminderBroadcast?.success}, Failed: ${global.gramReminderBroadcast?.failed}`);
  return {
    success: true,
    sent: global.gramReminderBroadcast?.success || 0,
    failed: global.gramReminderBroadcast?.failed || 0
  };
}

async function checkAndRunScheduledBroadcast() {
  const settings = await getAutoGramSettings();
  if (!settings || !settings.enabled) return;

  const now = Date.now();
  if (settings.nextRunAt && now < settings.nextRunAt) {
    return; // Not due yet
  }

  console.log('[AUTO GRAM] Hourly broadcast trigger activated!');
  
  // Calculate next run time (1 hour from now)
  const nextRun = now + 60 * 60 * 1000;
  settings.lastRunAt = now;
  settings.nextRunAt = nextRun;
  settings.runCount = (settings.runCount || 0) + 1;

  // Grab current template index for this broadcast
  const currentTemplateIdx = (parseInt(settings.templateIndex, 10) || 0) % TEMPLATES.length;

  // Auto-rotate to the next template index for the upcoming hour
  const nextTemplateIdx = (currentTemplateIdx + 1) % TEMPLATES.length;
  settings.templateIndex = nextTemplateIdx;

  await saveAutoGramSettings(settings);

  console.log(`[AUTO GRAM] Hourly run dispatching Variant #${currentTemplateIdx + 1}. Next hour scheduled with Variant #${nextTemplateIdx + 1}.`);

  // Run broadcast in background
  executeHourlyBroadcast(currentTemplateIdx, true).catch(err => {
    console.error('[AUTO GRAM] Error in hourly auto broadcast:', err.message);
  });
}

function startAutoGramBroadcastService() {
  if (_serviceTimer) clearInterval(_serviceTimer);
  
  // Check schedule every 60 seconds
  _serviceTimer = setInterval(() => {
    checkAndRunScheduledBroadcast().catch(err => console.error('[AUTO GRAM SERVICE] Error:', err.message));
  }, 60000);

  // Initial check on startup
  setTimeout(() => {
    checkAndRunScheduledBroadcast().catch(err => console.error('[AUTO GRAM SERVICE INITIAL] Error:', err.message));
  }, 10000);

  console.log('✅ Auto GRAM Broadcast Service started (rotating variants hourly, schedule checked every 60s)');
}

module.exports = {
  getAutoGramSettings,
  saveAutoGramSettings,
  executeHourlyBroadcast,
  startAutoGramBroadcastService,
  TEMPLATES
};

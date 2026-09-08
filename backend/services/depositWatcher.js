/**
 * Automatic Background Deposit Watcher
 * Polls TON API for incoming transfers to the Admin Wallet and credits users automatically.
 */

const https = require('https');
const { pool } = require('../db');
const bot = require('../bot');

const ADMIN_WALLET = process.env.ADMIN_WALLET || 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR';

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
    }
  } catch (err) {
    console.error('[ADMIN NOTIFY ERROR]:', err.message);
  }
}

function fetchTonApiEvents(limit = 50) {
  return new Promise((resolve, reject) => {
    const tonApiUrl = `https://tonapi.io/v2/accounts/${encodeURIComponent(ADMIN_WALLET)}/events?limit=${limit}`;
    https.get(tonApiUrl, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.events || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Scan recent events and credit all uncredited deposits matching users
 */
async function processIncomingDeposits() {
  try {
    const events = await fetchTonApiEvents(50);
    if (!events || events.length === 0) return { credited: 0 };

    // 1. Fetch all already credited transaction hashes
    const existingRes = await pool.query('SELECT tx_hash FROM gram_deposits');
    const creditedHashes = new Set(existingRes.rows.map(r => r.tx_hash));

    let creditedCount = 0;

    for (const ev of events) {
      const eventId = ev.event_id;
      if (creditedHashes.has(eventId)) continue;

      for (const action of (ev.actions || [])) {
        if (action.type === 'TonTransfer') {
          const transfer = action.TonTransfer;
          const comment = (transfer.comment || '').trim();
          const senderAddress = (transfer.sender?.address || transfer.sender?.user_friendly || '').trim().toLowerCase();
          const nanoAmount = BigInt(transfer.amount || 0);
          const depositedGram = Number(nanoAmount) / 1e9;

          if (depositedGram <= 0) continue;

          // Try to extract Telegram ID from comment (e.g. TASKY_7983938173 or numeric ID)
          let targetTelegramId = null;
          const memoMatch = comment.match(/TASKY_(\d+)/i) || comment.match(/\b(\d{6,15})\b/);
          if (memoMatch) {
            targetTelegramId = memoMatch[1];
          }

          let userRow = null;
          if (targetTelegramId) {
            const userRes = await pool.query('SELECT telegram_id, username, first_name, gram_balance, balance FROM users WHERE telegram_id = $1', [targetTelegramId]);
            if (userRes.rows.length > 0) {
              userRow = userRes.rows[0];
            }
          }

          // If no memo match, check by sender wallet address
          if (!userRow && senderAddress) {
            const walletRes = await pool.query(
              'SELECT telegram_id, username, first_name, gram_balance, balance FROM users WHERE LOWER(gram_wallet_address) = $1 OR LOWER(wallet_address) = $1',
              [senderAddress]
            );
            if (walletRes.rows.length > 0) {
              userRow = walletRes.rows[0];
              targetTelegramId = userRow.telegram_id;
            }
          }

          if (userRow && targetTelegramId) {
            // Found a valid uncredited deposit for this user! Credit it atomically.
            const client = await pool.connect();
            try {
              await client.query('BEGIN');

              // Check again inside transaction to prevent race condition
              const check = await client.query('SELECT id FROM gram_deposits WHERE tx_hash = $1', [eventId]);
              if (check.rows.length === 0) {
                await client.query(
                  `INSERT INTO gram_deposits (telegram_id, amount_gram, tx_hash, auto_verified, status)
                   VALUES ($1, $2, $3, TRUE, 'approved')`,
                  [targetTelegramId, depositedGram, eventId]
                );

                const updateRes = await client.query(
                  `UPDATE users 
                   SET gram_balance = COALESCE(gram_balance, 0) + $1
                   WHERE telegram_id = $2
                   RETURNING telegram_id, username, first_name, gram_balance, balance`,
                  [depositedGram, targetTelegramId]
                );

                await client.query('COMMIT');
                creditedHashes.add(eventId);
                creditedCount++;

                const displayName = userRow.username ? `@${userRow.username}` : (userRow.first_name || targetTelegramId);
                const txHashDisplay = eventId.length > 20 ? `${eventId.substring(0, 10)}...${eventId.substring(eventId.length - 6)}` : eventId;

                console.log(`[DepositWatcher] ✅ Automatically credited +${depositedGram} GRAM to user ${targetTelegramId} (tx: ${txHashDisplay})`);

                sendAdminBroadcast(
                  `💰 <b>AUTOMATIC GRAM DEPOSIT VERIFIED!</b>\n\n` +
                  `👤 <b>User:</b> ${displayName} (<code>${targetTelegramId}</code>)\n` +
                  `💎 <b>Amount Credited:</b> +${depositedGram.toFixed(3)} GRAM\n` +
                  `🔗 <b>Tx Hash:</b> <code>${txHashDisplay}</code>\n` +
                  `⚡ <b>Verification:</b> TON Blockchain Auto-Watcher\n` +
                  `💳 <b>New User Balance:</b> ${parseFloat(updateRes.rows[0]?.gram_balance || 0).toFixed(3)} GRAM`
                );

                if (bot && !bot.isDummy && typeof bot.sendMessage === 'function') {
                  bot.sendMessage(
                    targetTelegramId,
                    `🎉 <b>Deposit Received & Credited!</b>\n\n` +
                    `Your deposit of <b>+${depositedGram.toFixed(3)} GRAM</b> has been automatically verified on the blockchain and added to your Vault balance.`,
                    { parse_mode: 'HTML' }
                  ).catch(() => {});
                }
              } else {
                await client.query('ROLLBACK');
              }
            } catch (dbErr) {
              await client.query('ROLLBACK');
              console.error('[DepositWatcher] DB Credit error:', dbErr.message);
            } finally {
              client.release();
            }
          }
        }
      }
    }

    return { credited: creditedCount };
  } catch (err) {
    console.error('[DepositWatcher] Error processing deposits:', err.message);
    return { credited: 0, error: err.message };
  }
}

/**
 * Start the continuous deposit watcher
 */
function startDepositWatcher(intervalMs = 30000) {
  console.log(`[DepositWatcher] Starting TON deposit watcher (interval: ${intervalMs / 1000}s)...`);
  
  // Initial run
  setTimeout(() => {
    processIncomingDeposits().catch(err => console.error('[DepositWatcher] Initial scan failed:', err.message));
  }, 3000);

  // Periodic poll
  setInterval(() => {
    processIncomingDeposits().catch(err => console.error('[DepositWatcher] Interval scan failed:', err.message));
  }, intervalMs);
}

module.exports = {
  startDepositWatcher,
  processIncomingDeposits
};

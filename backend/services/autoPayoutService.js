/**
 * Auto-Payout Service
 * Sends TON automatically from treasury wallet for small swaps (<= AUTO_PAYOUT_MAX_TON).
 * Uses @ton/ton SDK with mnemonic from TREASURY_MNEMONIC env var.
 */

const { TonClient, WalletContractV4, internal, fromNano, toNano, SendMode } = require('@ton/ton');
const { mnemonicToWalletKey } = require('@ton/crypto');
const { pool } = require('../db');
const bot = require('../bot');

const AUTO_PAYOUT_MAX_TON = parseFloat(process.env.AUTO_PAYOUT_MAX_TON || '0.03');
const TREASURY_MNEMONIC = process.env.TREASURY_MNEMONIC || '';
const IS_MAINNET = process.env.TON_NETWORK !== 'testnet';

let tonClient = null;

function getClient() {
  if (!tonClient) {
    tonClient = new TonClient({
      endpoint: IS_MAINNET
        ? 'https://toncenter.com/api/v2/jsonRPC'
        : 'https://testnet.toncenter.com/api/v2/jsonRPC',
      apiKey: process.env.TONCENTER_API_KEY || undefined,
    });
  }
  return tonClient;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function withRetry(fn, maxRetries = 5, delayMs = 1500) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit = err?.response?.status === 429 || 
        err?.message?.includes('429') || 
        err?.message?.includes('Ratelimit');
      if (isRateLimit && i < maxRetries - 1) {
        const waitTime = delayMs * (i + 1);
        console.warn(`[AutoPayout] Rate limited, retrying in ${waitTime}ms (attempt ${i + 1}/${maxRetries})...`);
        await sleep(waitTime);
      } else {
        throw err;
      }
    }
  }
  return await fn();
}

let lastLowBalanceAlertTime = 0;

function notifyAdminLowBalance(needed, balance = 0) {
  const now = Date.now();
  if (now - lastLowBalanceAlertTime < 4 * 60 * 60 * 1000) return; // 1 notification every 4 hours max
  lastLowBalanceAlertTime = now;
  if (bot && bot.sendMessage && process.env.ADMIN_TELEGRAM_ID) {
    bot.sendMessage(
      process.env.ADMIN_TELEGRAM_ID,
      `⚠️ <b>Treasury Wallet Low:</b> Treasury has low balance (${balance ? balance.toFixed(4) : '0'} TON). Auto-payouts will resume automatically once topped up.`,
      { parse_mode: 'HTML' }
    ).catch(() => {});
  }
}

/**
 * Check if the treasury wallet has enough balance to cover the payout + gas
 */
async function hasTreasuryBalance(requiredTon) {
  try {
    if (!TREASURY_MNEMONIC) {
      console.warn('[AutoPayout] TREASURY_MNEMONIC is not configured.');
      return false;
    }
    const mnemonic = TREASURY_MNEMONIC.trim().split(' ');
    const key = await mnemonicToWalletKey(mnemonic);
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
    const client = getClient();
    const contract = client.open(wallet);
    const balance = await withRetry(() => contract.getBalance());
    const balanceTon = parseFloat(fromNano(balance));
    const needed = requiredTon + 0.005; // 0.005 TON gas buffer
    console.log(`[AutoPayout] Treasury balance: ${balanceTon.toFixed(4)} TON (needed: ${needed.toFixed(4)} TON)`);
    if (balanceTon < needed) {
      notifyAdminLowBalance(needed, balanceTon);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[AutoPayout] hasTreasuryBalance error:', err.message);
    return false;
  }
}

/**
 * Send TON from treasury to recipient wallet
 * Returns { success: boolean, txHash?: string, error?: string }
 */
async function sendTon(toAddress, amountTon, comment = '🎁 TASKY Daily Gram Payout 🎁') {
  try {
    if (!TREASURY_MNEMONIC) {
      return { success: false, error: 'TREASURY_MNEMONIC not configured in environment' };
    }

    const mnemonic = TREASURY_MNEMONIC.trim().split(' ');
    const key = await mnemonicToWalletKey(mnemonic);
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
    const client = getClient();
    const contract = client.open(wallet);
    
    // 1. Fetch current seqno with retry
    await sleep(1000);
    const seqno = await withRetry(() => contract.getSeqno());
    console.log(`[AutoPayout] Current Treasury seqno: ${seqno}, sending ${amountTon} TON to ${toAddress}`);

    // 2. Broadcast transfer transaction
    await withRetry(() => contract.sendTransfer({
      secretKey: key.secretKey,
      seqno,
      sendMode: SendMode.PAY_GAS_SEPARATELY | SendMode.IGNORE_ERRORS,
      messages: [
        internal({
          to: toAddress,
          value: toNano(Number(amountTon).toFixed(9)),
          bounce: false,
          body: comment,
        }),
      ],
    }));

    console.log(`[AutoPayout] Transfer broadcasted successfully! Polling confirmation...`);

    // 3. Wait for tx seqno to increment (max 30s)
    let attempts = 0;
    let confirmed = false;
    while (attempts < 8) {
      await sleep(3500);
      try {
        const newSeqno = await contract.getSeqno();
        if (newSeqno > seqno) {
          confirmed = true;
          console.log(`[AutoPayout] On-chain confirmed with new seqno: ${newSeqno}`);
          break;
        }
      } catch (pollErr) {
        console.warn(`[AutoPayout] Poll attempt ${attempts + 1} notice:`, pollErr.message);
      }
      attempts++;
    }

    // 4. Fetch the real on-chain transaction hash for clean Tonviewer links
    let realTxHash = null;
    try {
      await sleep(1500);
      const txs = await withRetry(() => client.getTransactions(wallet.address, { limit: 1 }), 3, 2000);
      if (txs && txs.length > 0) {
        realTxHash = txs[0].hash().toString('hex');
        console.log(`[AutoPayout] Real On-Chain TX Hash: ${realTxHash}`);
      }
    } catch (txErr) {
      console.warn('[AutoPayout] Could not fetch real tx hash, using fallback:', txErr.message);
    }

    // Use the real 64-character hex transaction hash
    const txRef = realTxHash || `ton_seq_${seqno}_${Date.now()}`;
    return { success: true, txHash: txRef, confirmed };
  } catch (err) {
    console.error('[AutoPayout] sendTon error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Main function — called from swap.js after a swap is inserted.
 * Swaps are kept strictly in pending for manual admin review.
 */
async function tryAutoPayout(swap, user) {
  // Swaps require manual review
  return;
}

/**
 * Main function — called from gram.js after a daily claim is inserted.
 * STRICTLY restricted to Daily Gram Claims (0.02 GRAM / TON).
 *
 * @param {string} recordId - the id of the claim
 * @param {string} tableName - strictly 'gram_claims'
 * @param {number} receiveAmount - amount of TON/GRAM to send
 * @param {string} walletAddress - the destination wallet address
 * @param {string} telegramId - user's telegram id
 * @param {boolean} isFlagged - whether the request was flagged as fraud
 * @param {string} flagReason - reason for flagging
 */
global.processingPayouts = global.processingPayouts || new Set();

async function tryAutoPayoutGram(recordId, tableName, receiveAmount, walletAddress, telegramId, isFlagged, flagReason) {
  const payoutKey = `${tableName}_${recordId}`;
  if (global.processingPayouts.has(payoutKey)) {
    console.log(`[AutoPayout] Payout ${payoutKey} is already in progress, skipping duplicate call.`);
    return { success: false, reason: 'Already in progress' };
  }

  global.processingPayouts.add(payoutKey);

  try {
    // 0. Strict check: ONLY Daily Gram Claims are eligible for auto-payout
    if (tableName !== 'gram_claims') {
      console.log(`[AutoPayout] Skipping ${tableName} #${recordId}: Auto-payout is strictly for Daily Gram Claims only.`);
      return { success: false, reason: 'Auto-payout is only enabled for Daily Gram Claims.' };
    }

    // 0.1 Check if claim was already approved or processed
    const currentClaimRes = await pool.query('SELECT status, tx_hash FROM gram_claims WHERE id = $1', [recordId]);
    if (!currentClaimRes.rows[0] || currentClaimRes.rows[0].status === 'approved') {
      console.log(`[AutoPayout] Skipping claim #${recordId}: already approved.`);
      return { success: false, reason: 'Already approved' };
    }

    // 1. Check if auto payout is globally enabled in settings
    const settingsRes = await pool.query('SELECT auto_payout_enabled FROM withdrawal_settings LIMIT 1');
    const isAutoPayoutEnabled = settingsRes.rows[0]?.auto_payout_enabled === true;
    if (!isAutoPayoutEnabled) {
      console.log(`[AutoPayout] Skipping ${tableName} #${recordId}: Auto-payout is disabled in settings.`);
      return { success: false, reason: 'Auto-payout is disabled in settings.' };
    }

    // 2. Check treasury mnemonic configuration
    if (!TREASURY_MNEMONIC) {
      console.log(`[AutoPayout] Skipping ${tableName} #${recordId}: TREASURY_MNEMONIC is not configured in .env.`);
      return { success: false, reason: 'TREASURY_MNEMONIC is not configured.' };
    }

    // 3. Only auto-pay if amount is within threshold
    if (receiveAmount > AUTO_PAYOUT_MAX_TON) {
      console.log(`[AutoPayout] Skipping ${tableName} #${recordId}: ${receiveAmount} > threshold ${AUTO_PAYOUT_MAX_TON}`);
      return { success: false, reason: 'Amount exceeds auto-payout max threshold.' };
    }

    // 4. Skip flagged payouts (keep for manual admin review)
    if (isFlagged) {
      console.log(`[AutoPayout] Skipping ${tableName} #${recordId}: Flagged for security (${flagReason})`);
      return { success: false, reason: 'Flagged for security review.' };
    }

    // 5. Check treasury has enough balance for amount + gas
    const hasBalance = await hasTreasuryBalance(receiveAmount);
    if (!hasBalance) {
      console.log(`[AutoPayout] Skipping ${tableName} #${recordId}: Treasury balance too low for payout + gas.`);
      return { success: false, reason: 'Treasury balance too low.' };
    }

    console.log(`[AutoPayout] Executing on-chain payout for ${tableName} #${recordId}: ${receiveAmount} TON/GRAM → ${walletAddress}`);

    // 6. Send transaction on TON Blockchain
    const result = await sendTon(walletAddress, receiveAmount);

    if (result.success) {
      const txHash = result.txHash;

      // 7. Update claim status to approved with tx_hash
      if (tableName === 'gram_claims') {
        await pool.query(
          `UPDATE gram_claims SET status = 'approved', tx_hash = $1, processed_at = NOW() WHERE id = $2`,
          [txHash, recordId]
        );

        // Check referral validity for referrer
        try {
          const userRes = await pool.query('SELECT referred_by, username, first_name FROM users WHERE telegram_id = $1', [telegramId]);
          const referred_by = userRes.rows[0]?.referred_by;
          if (referred_by) {
            const { checkReferralValidity } = require('../utils/referral');
            await checkReferralValidity(pool, telegramId, referred_by);
          }
        } catch (refErr) {
          console.warn('[AutoPayout] Referral validation error:', refErr.message);
        }
      } else {
        await pool.query(
          `UPDATE gram_withdrawals SET status = 'done', tx_hash = $1, processed_at = NOW() WHERE id = $2`,
          [txHash, recordId]
        );
      }

      // 8. Fetch full user context for notifications (Safe with fallback)
      let userFull = {};
      try {
        const userCtxRes = await pool.query(`
          SELECT 
            u.username, u.first_name, u.gram_balance, u.referred_by,
            u.created_at as joined_at,
            (SELECT COUNT(*) FROM gram_claims WHERE telegram_id = u.telegram_id AND status = 'approved') as total_claims,
            (SELECT COALESCE(SUM(amount), 0) FROM gram_claims WHERE telegram_id = u.telegram_id AND status = 'approved') as total_earned,
            (SELECT MAX(created_at) FROM gram_claims WHERE telegram_id = u.telegram_id AND status != 'pending') as last_claim_at,
            (SELECT COUNT(*) FROM gram_claims WHERE telegram_id = u.telegram_id) as total_attempts,
            (SELECT COUNT(*) FROM referrals WHERE referrer_telegram_id = u.telegram_id) as referral_count,
            (SELECT username FROM users WHERE telegram_id = u.referred_by) as referrer_username
          FROM users u WHERE u.telegram_id = $1
        `, [telegramId]);
        userFull = userCtxRes.rows[0] || {};
      } catch (ctxErr) {
        console.warn('[AutoPayout] Full user context query failed (falling back):', ctxErr.message);
        try {
          const simpleRes = await pool.query('SELECT username, first_name, gram_balance, referred_by, created_at as joined_at FROM users WHERE telegram_id = $1', [telegramId]);
          userFull = simpleRes.rows[0] || {};
        } catch (e) {
          console.warn('[AutoPayout] Simple user query error:', e.message);
        }
      }

      // 9. Send success notification to user
      if (bot && bot.sendMessage) {
        try {
          const txLink = txHash ? (txHash.startsWith('http') ? txHash : `https://tonviewer.com/transaction/${txHash}`) : null;
          const txText = txLink ? `\n🎁 <b>Payment Proof:</b> <a href="${txLink}">View Transaction</a>` : '';

          await bot.sendMessage(
            telegramId,
            `🎁 <b>Gram Reward Auto-Approved & Paid!</b> 🎁\n\nYour request for <b>${receiveAmount} GRAM</b> has been processed automatically and sent to your wallet on the TON Blockchain! 🚀${txText}\n\n⚠️ <b>COMPULSORY REQUIREMENT:</b>\nPlease take a screenshot of your received payment and share it in our <a href="https://t.me/TaskyOfficialCommunity">Official Community Group</a>.\n\n<i>Thank you for supporting Tasky!</i>`,
            {
              parse_mode: 'HTML',
              link_preview_options: txLink ? {
                url: txLink,
                is_disabled: false,
                prefer_large_media: true,
                show_above_text: false
              } : { is_disabled: false }
            }
          );
        } catch (botErr) {
          console.error('[AutoPayout] Failed to notify user:', botErr.message);
        }
      }

      // 10. Broadcast verified payout proof to official Telegram Payout Channel
      try {
        const { broadcastPayoutProof } = require('../utils/payoutChannel');
        await broadcastPayoutProof(bot, {
          type: 'Daily Quest 0.02 GRAM',
          amount: String(receiveAmount || '0.02'),
          token: 'GRAM',
          wallet: walletAddress,
          tx_hash: txHash,
          telegram_id: telegramId,
          username: userFull?.username,
          first_name: userFull?.first_name
        });
      } catch (proofErr) {
        console.error('[AutoPayout] Failed to broadcast payout proof:', proofErr.message);
      }

      // 11. Notify Admin — Rich detailed message
      const adminId = process.env.ADMIN_TELEGRAM_ID || '8823265955';
      if (bot && bot.sendMessage && adminId) {
        try {
          const txLink = txHash ? (txHash.startsWith('http') ? txHash : `https://tonviewer.com/transaction/${txHash}`) : null;
          const safeName = (userFull?.first_name || 'Unknown').replace(/[<>&]/g, '');
          const safeUser = userFull?.username ? `@${userFull.username}` : `ID: ${telegramId}`;
          const totalClaims = parseInt(userFull?.total_claims || 0);
          const totalAttempts = parseInt(userFull?.total_attempts || 0);
          const totalEarned = parseFloat(userFull?.total_earned || 0).toFixed(3);
          const gramBal = parseFloat(userFull?.gram_balance || 0).toFixed(4);
          const referralCount = parseInt(userFull?.referral_count || 0);
          const referrerUser = userFull?.referrer_username ? `@${userFull.referrer_username}` : (userFull?.referred_by ? `ID: ${userFull.referred_by}` : 'None');
          const joinedAt = userFull?.joined_at ? new Date(userFull.joined_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown';
          const lastClaimAt = userFull?.last_claim_at ? new Date(userFull.last_claim_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'First time';
          const walletShort = walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : 'N/A';
          const claimType = tableName === 'gram_claims' ? '🎁 GRAM Daily Claim' : '💸 GRAM Withdrawal';
          const attemptLabel = `${totalClaims + 1} of ${totalAttempts + 1} attempts`;

          const adminMsg =
            `⚡ <b>Auto-Payout Successful!</b> ⚡\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>${safeName}</b>  •  <code>${safeUser}</code>\n` +
            `🆔 TG ID: <code>${telegramId}</code>\n` +
            `📅 Joined: ${joinedAt}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💳 <b>Payout Details</b>\n` +
            `   Type: ${claimType}\n` +
            `   Record: <code>#${recordId}</code> (${tableName})\n` +
            `   Amount: <b>${receiveAmount} GRAM</b>\n` +
            `   Attempt: ${attemptLabel}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📊 <b>User Stats</b>\n` +
            `   ✅ Total Paid: ${totalClaims} claims · ${totalEarned} GRAM\n` +
            `   💎 GRAM Balance: ${gramBal} GRAM\n` +
            `   📅 Last Claim: ${lastClaimAt}\n` +
            `   👥 Referrals Made: ${referralCount}\n` +
            `   🔗 Referred By: ${referrerUser}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🏦 <b>Wallet:</b> <code>${walletShort}</code>\n` +
            (txLink ? `🔗 <b>TX:</b> <a href="${txLink}">View on Tonviewer</a>\n` : '') +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `✅ <b>Funds sent on-chain & user notified.</b>`;

          await bot.sendMessage(adminId, adminMsg, {
            parse_mode: 'HTML',
            link_preview_options: txLink ? {
              url: txLink,
              is_disabled: false,
              prefer_large_media: true,
              show_above_text: false
            } : { is_disabled: true }
          }).catch(e => console.warn('[AutoPayout] Admin notify warning:', e.message));
        } catch (adminErr) {
          console.error('[AutoPayout] Failed to notify admin:', adminErr.message);
        }
      }

      console.log(`[AutoPayout] ✅ ${tableName} #${recordId} completed on-chain. TX: ${txHash}`);
      return { success: true, txHash };
    } else {
      console.error(`[AutoPayout] ❌ On-chain send failed for ${tableName} #${recordId}: ${result.error}`);
      const adminId = process.env.ADMIN_TELEGRAM_ID || '8823265955';
      if (bot && bot.sendMessage && adminId) {
        bot.sendMessage(
          adminId,
          `❌ <b>Auto-Payout FAILED:</b> Could not send ${receiveAmount} to <code>${walletAddress}</code> for ${tableName} #${recordId}.\n<b>Error:</b> <code>${result.error}</code>`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      }
      return { success: false, error: result.error };
    }
  } catch (err) {
    console.error(`[AutoPayout] tryAutoPayoutGram error:`, err);
    return { success: false, error: err.message };
  } finally {
    global.processingPayouts.delete(payoutKey);
  }
}

let isProcessingPending = false;

async function processPendingGramClaims() {
  if (isProcessingPending) return;
  if (!TREASURY_MNEMONIC) return;

  try {
    isProcessingPending = true;
    const pendingRes = await pool.query(`
      SELECT id, telegram_id, gram_wallet_address, amount, is_flagged, flag_reason
      FROM gram_claims
      WHERE status = 'pending' AND (is_flagged = FALSE OR is_flagged IS NULL)
      ORDER BY id ASC
      LIMIT 3
    `);

    if (pendingRes.rows.length === 0) return;

    // Check treasury balance once before iterating
    const hasBalance = await hasTreasuryBalance(0.02);
    if (!hasBalance) {
      // Treasury balance is low; hasTreasuryBalance already sent 1 throttled notification
      return;
    }

    for (const claim of pendingRes.rows) {
      console.log(`[AutoPayout] ⚡ Background processor auto-paying claim #${claim.id} (${claim.telegram_id})...`);
      await tryAutoPayoutGram(
        claim.id,
        'gram_claims',
        parseFloat(claim.amount || 0.02),
        claim.gram_wallet_address,
        claim.telegram_id,
        false,
        null
      );
      await sleep(2500); // 2.5s spacing between payouts
    }
  } catch (err) {
    console.error('[AutoPayout] processPendingGramClaims error:', err.message);
  } finally {
    isProcessingPending = false;
  }
}

/**
 * Syncs recent approved payouts from past 24h that might have missed channel broadcasting
 */
async function syncRecentApprovedPayouts() {
  try {
    const recentRes = await pool.query(`
      SELECT gc.id, gc.telegram_id, gc.gram_wallet_address, gc.amount, gc.tx_hash, gc.processed_at,
             u.username, u.first_name
      FROM gram_claims gc
      LEFT JOIN users u ON gc.telegram_id = u.telegram_id
      WHERE gc.status = 'approved' 
        AND gc.tx_hash IS NOT NULL
        AND gc.processed_at >= NOW() - INTERVAL '24 hours'
      ORDER BY gc.processed_at DESC
      LIMIT 5
    `);

    if (recentRes.rows.length > 0) {
      console.log(`[AutoPayout] Checking ${recentRes.rows.length} recent approved payouts for channel broadcast sync...`);
      const { broadcastPayoutProof } = require('../utils/payoutChannel');
      for (const claim of recentRes.rows) {
        if (!claim.tx_hash) continue;
        await broadcastPayoutProof(bot, {
          type: 'Daily Quest 0.02 GRAM',
          amount: String(claim.amount || '0.02'),
          token: 'GRAM',
          wallet: claim.gram_wallet_address,
          tx_hash: claim.tx_hash,
          telegram_id: claim.telegram_id,
          username: claim.username,
          first_name: claim.first_name
        });
        await sleep(1500);
      }
    }
  } catch (syncErr) {
    console.warn('[AutoPayout] Sync recent approved payouts warning:', syncErr.message);
  }
}

function startAutoPayoutProcessor() {
  console.log('[AutoPayout] ⚡ Auto-Payout Background Worker initialized (20s interval)');
  setInterval(processPendingGramClaims, 20000);
  setTimeout(processPendingGramClaims, 4000);
  setTimeout(syncRecentApprovedPayouts, 7000); // Sync recent payouts on startup
}

module.exports = {
  tryAutoPayout,
  tryAutoPayoutGram,
  hasTreasuryBalance,
  sendTon,
  processPendingGramClaims,
  syncRecentApprovedPayouts,
  startAutoPayoutProcessor
};

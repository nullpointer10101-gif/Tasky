/**
 * Auto-Payout Service
 * Sends TON automatically from treasury wallet for small swaps (<= AUTO_PAYOUT_MAX_TON).
 * Uses @ton/ton SDK with mnemonic from TREASURY_MNEMONIC env var.
 */

const { TonClient, WalletContractV4, internal, fromNano, toNano } = require('@ton/ton');
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
    const needed = requiredTon + 0.01; // 0.01 TON buffer for gas
    console.log(`[AutoPayout] Treasury Address (V4R2): ${wallet.address.toString({ bounceable: false })}`);
    console.log(`[AutoPayout] Treasury balance: ${balanceTon} TON, needed: ${needed} TON`);
    return balanceTon >= needed;
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
 * Decides whether to auto-pay or leave in pending.
 *
 * @param {object} swap — the newly inserted swap row
 * @param {object} user — the user row
 */
async function tryAutoPayout(swap, user) {
  const receiveAmount = parseFloat(swap.receive_amount);

  // Only auto-pay TON for now
  if (swap.receive_token !== 'TON') {
    console.log(`[AutoPayout] Skipping ${swap.id}: not TON (${swap.receive_token})`);
    return;
  }

  // Check if auto payout is globally enabled
  const settingsRes = await pool.query('SELECT auto_payout_enabled FROM withdrawal_settings LIMIT 1');
  const isAutoPayoutEnabled = settingsRes.rows[0]?.auto_payout_enabled === true;
  if (!isAutoPayoutEnabled) {
    console.log(`[AutoPayout] Skipping ${swap.id}: Auto-payout is globally disabled.`);
    return;
  }

  // Only auto-pay if amount is small enough
  if (receiveAmount > AUTO_PAYOUT_MAX_TON) {
    console.log(`[AutoPayout] Skipping ${swap.id}: ${receiveAmount} TON > threshold ${AUTO_PAYOUT_MAX_TON}`);
    return;
  }

  // Skip flagged swaps
  if (swap.is_flagged) {
    console.log(`[AutoPayout] Skipping ${swap.id}: flagged (${swap.flag_reason})`);
    return;
  }

  // Check treasury has enough
  const hasBalance = await hasTreasuryBalance(receiveAmount);
  if (!hasBalance) {
    console.log(`[AutoPayout] Skipping ${swap.id}: treasury balance too low`);
    // Notify admin
    if (bot?.sendMessage && process.env.ADMIN_TELEGRAM_ID) {
      bot.sendMessage(process.env.ADMIN_TELEGRAM_ID,
        `⚠️ Auto-payout skipped for Swap #${swap.id}: treasury balance too low. Please top up.`
      ).catch(() => {});
    }
    return;
  }

  console.log(`[AutoPayout] Processing swap ${swap.id}: ${receiveAmount} TON → ${swap.wallet_address}`);

  const result = await sendTon(swap.wallet_address, receiveAmount);

  if (result.success) {
    // Mark swap as done
    await pool.query(
      `UPDATE swaps SET status = 'done', tx_hash = $1, processed_at = NOW() WHERE id = $2`,
      [result.txHash, swap.id]
    );
    // Notify user
    if (bot?.sendMessage) {
      bot.sendMessage(swap.telegram_id,
        `✅ Swap complete! ${receiveAmount.toFixed(4)} TON sent to your wallet.\nTX Ref: ${result.txHash}`
      ).catch(() => {});
    }
    console.log(`[AutoPayout] ✅ Swap ${swap.id} completed. TX: ${result.txHash}`);
  } else {
    console.error(`[AutoPayout] ❌ Swap ${swap.id} failed: ${result.error}`);
    // Leave as pending, admin can process manually
    if (bot?.sendMessage && process.env.ADMIN_TELEGRAM_ID) {
      bot.sendMessage(process.env.ADMIN_TELEGRAM_ID,
        `❌ Auto-payout FAILED for Swap #${swap.id} (${receiveAmount} TON → ${swap.wallet_address})\nError: ${result.error}`
      ).catch(() => {});
    }
  }
}

/**
 * Main function — called from gram.js / gram_currency.js after a claim/withdrawal is inserted.
 * Decides whether to auto-pay or leave in pending.
 *
 * @param {string} recordId - the id of the claim/withdrawal
 * @param {string} tableName - 'gram_claims' or 'gram_withdrawals'
 * @param {number} receiveAmount - amount of TON/GRAM to send
 * @param {string} walletAddress - the destination wallet address
 * @param {string} telegramId - user's telegram id
 * @param {boolean} isFlagged - whether the request was flagged as fraud
 * @param {string} flagReason - reason for flagging
 */
async function tryAutoPayoutGram(recordId, tableName, receiveAmount, walletAddress, telegramId, isFlagged, flagReason) {
  try {
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
      if (bot && bot.sendMessage && process.env.ADMIN_TELEGRAM_ID) {
        bot.sendMessage(
          process.env.ADMIN_TELEGRAM_ID,
          `⚠️ <b>Auto-Payout Skipped:</b> Treasury balance is too low to send ${receiveAmount} GRAM to ${walletAddress}. Please top up the treasury wallet.`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      }
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

      // 8. Fetch user details for notification & proof broadcast
      const userRes = await pool.query('SELECT username, first_name FROM users WHERE telegram_id = $1', [telegramId]);
      const userFull = userRes.rows[0];

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

      // 11. Notify Admin Telegram ID
      const adminId = process.env.ADMIN_TELEGRAM_ID || '8823265955';
      if (bot && bot.sendMessage && adminId) {
        try {
          const safeName = (userFull?.username ? `@${userFull.username}` : (userFull?.first_name || 'User')).replace(/[<>&]/g, '');
          const txLink = txHash ? (txHash.startsWith('http') ? txHash : `https://tonviewer.com/transaction/${txHash}`) : null;
          const adminMsg = `⚡ <b>Auto-Payout Processed & Paid!</b> ⚡\n\n` +
            `🆔 <b>Record ID:</b> #${recordId} (<code>${tableName}</code>)\n` +
            `👤 <b>User:</b> ${safeName} (<code>${telegramId}</code>)\n` +
            `💰 <b>Amount:</b> <b>${receiveAmount} TON/GRAM</b>\n` +
            `🏦 <b>Wallet:</b> <code>${walletAddress}</code>\n` +
            (txLink ? `🔗 <b>Explorer:</b> <a href="${txLink}">View on Tonviewer</a>\n\n` : '\n') +
            `✅ Funds sent on-chain & user notified.`;

          await bot.sendMessage(adminId, adminMsg, {
            parse_mode: 'HTML',
            link_preview_options: txLink ? {
              url: txLink,
              is_disabled: false,
              prefer_large_media: true,
              show_above_text: false
            } : { is_disabled: false }
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
  }
}

module.exports = {
  tryAutoPayout,
  tryAutoPayoutGram,
  hasTreasuryBalance,
  sendTon
};

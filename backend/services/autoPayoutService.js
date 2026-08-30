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

/**
 * Check if the treasury wallet has enough balance to cover the payout + gas
 */
async function hasTreasuryBalance(requiredTon) {
  try {
    const mnemonic = TREASURY_MNEMONIC.trim().split(' ');
    const key = await mnemonicToWalletKey(mnemonic);
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
    const client = getClient();
    const contract = client.open(wallet);
    const balance = await contract.getBalance();
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
async function sendTon(toAddress, amountTon) {
  try {
    if (!TREASURY_MNEMONIC) {
      return { success: false, error: 'TREASURY_MNEMONIC not configured' };
    }

    const mnemonic = TREASURY_MNEMONIC.trim().split(' ');
    const key = await mnemonicToWalletKey(mnemonic);
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
    const client = getClient();
    const contract = client.open(wallet);
    const seqno = await contract.getSeqno();

    await contract.sendTransfer({
      secretKey: key.secretKey,
      seqno,
      messages: [
        internal({
          to: toAddress,
          value: toNano(amountTon.toFixed(9)),
          bounce: false,
          body: 'TASKY Swap Payout',
        }),
      ],
    });

    // Wait for tx to appear (max 30s)
    let attempts = 0;
    while (attempts < 10) {
      await new Promise(r => setTimeout(r, 3000));
      const newSeqno = await contract.getSeqno();
      if (newSeqno > seqno) break;
      attempts++;
    }

    // Build a pseudo tx hash from seqno + timestamp for record-keeping
    const txRef = `auto_${seqno}_${Date.now()}`;
    return { success: true, txHash: txRef };
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
  // Check if auto payout is globally enabled
  const settingsRes = await pool.query('SELECT auto_payout_enabled FROM withdrawal_settings LIMIT 1');
  const isAutoPayoutEnabled = settingsRes.rows[0]?.auto_payout_enabled === true;
  if (!isAutoPayoutEnabled) {
    console.log(`[AutoPayout] Skipping ${tableName} #${recordId}: Auto-payout is globally disabled.`);
    return;
  }

  // Only auto-pay if amount is small enough
  if (receiveAmount > AUTO_PAYOUT_MAX_TON) {
    console.log(`[AutoPayout] Skipping ${tableName} #${recordId}: ${receiveAmount} > threshold ${AUTO_PAYOUT_MAX_TON}`);
    return;
  }

  // Skip flagged payouts
  if (isFlagged) {
    console.log(`[AutoPayout] Skipping ${tableName} #${recordId}: flagged (${flagReason})`);
    return;
  }

  // Check treasury has enough
  const hasBalance = await hasTreasuryBalance(receiveAmount);
  if (!hasBalance) {
    console.log(`[AutoPayout] Skipping ${tableName} #${recordId}: treasury balance too low`);
    // Notify admin
    if (bot?.sendMessage && process.env.ADMIN_TELEGRAM_ID) {
      bot.sendMessage(process.env.ADMIN_TELEGRAM_ID,
        `⚠️ Auto-payout skipped for ${tableName} #${recordId}: treasury balance too low. Please top up.`
      ).catch(() => {});
    }
    return;
  }

  console.log(`[AutoPayout] Processing ${tableName} #${recordId}: ${receiveAmount} TON → ${walletAddress}`);

  const result = await sendTon(walletAddress, receiveAmount);

  if (result.success) {
    // Mark record as done
    if (tableName === 'gram_claims') {
      await pool.query(`UPDATE gram_claims SET status = 'approved' WHERE id = $1`, [recordId]);
    } else {
      await pool.query(`UPDATE gram_withdrawals SET status = 'done' WHERE id = $1`, [recordId]);
    }

    // Notify user
    if (bot?.sendMessage) {
      bot.sendMessage(telegramId,
        `✅ Your GRAM claim of ${receiveAmount} is complete! Sent to your wallet.`
      ).catch(() => {});
    }
    console.log(`[AutoPayout] ✅ ${tableName} #${recordId} completed. TX: ${result.txHash}`);
  } else {
    console.error(`[AutoPayout] ❌ ${tableName} #${recordId} failed: ${result.error}`);
    // Leave as pending, admin can process manually
    if (bot?.sendMessage && process.env.ADMIN_TELEGRAM_ID) {
      bot.sendMessage(process.env.ADMIN_TELEGRAM_ID,
        `❌ Auto-payout FAILED for ${tableName} #${recordId} (${receiveAmount} → ${walletAddress})\nError: ${result.error}`
      ).catch(() => {});
    }
  }
}

module.exports = {
  tryAutoPayout,
  tryAutoPayoutGram,
  hasTreasuryBalance,
  sendTon
};

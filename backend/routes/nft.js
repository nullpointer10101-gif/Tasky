const express = require('express');
const router = express.Router();
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

// Ensure user_nft_cards has total_days column and seed NFT Cards (including 5 GRAM Mega Miner #03)
pool.query('ALTER TABLE user_nft_cards ADD COLUMN IF NOT EXISTS total_days INT DEFAULT NULL').catch(err => {
  console.error('Error adding total_days column to user_nft_cards:', err.message);
});

pool.query(`
  INSERT INTO nft_cards (id, name, description, price_gram, daily_yield_gram, duration_days, total_yield_gram, rarity, icon_key, max_supply, is_active)
  VALUES 
    (1, 'Gram Mini Miner #01', 'Entry-level digital miner. Earn 0.07 GRAM daily for 10 days.', 0.5, 0.07, 10, 0.70, 'rare', 'bolt', 1000, true),
    (2, 'Gram Turbo Miner #02', 'High-speed digital miner. Earn 0.15 GRAM daily for 10 days.', 1.0, 0.15, 10, 1.5, 'legendary', 'rocket', 1000, true),
    (3, 'Gram Mega Miner #03', 'Ultra-powered digital miner. Earn 0.70 GRAM daily for 10 days.', 5.0, 0.70, 10, 7.0, 'mythic', 'flame', 1000, true)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_gram = EXCLUDED.price_gram,
    daily_yield_gram = EXCLUDED.daily_yield_gram,
    duration_days = EXCLUDED.duration_days,
    total_yield_gram = EXCLUDED.total_yield_gram,
    rarity = EXCLUDED.rarity,
    icon_key = EXCLUDED.icon_key,
    is_active = EXCLUDED.is_active;
`).catch(err => console.error('Error seeding nft_cards:', err.message));

/**
 * Helper to distribute 3-Level Team Referral Commissions on NFT Purchases
 * Level 1 (Direct Referrer): 30% (1.5 GRAM on a 5 GRAM NFT!)
 * Level 2 (Second Level Upline): 10% (0.5 GRAM on a 5 GRAM NFT!)
 * Level 3 (Third Level Upline): 4% (0.2 GRAM on a 5 GRAM NFT!)
 */
async function distributeNftReferralCommissions(dbPool, buyerTelegramId, priceGram, nftName) {
  try {
    const LEVEL_RATES = [
      { level: 1, percent: 0.30 }, // 30% Level 1 (Direct Referrer = 1.5 GRAM on 5 GRAM purchase)
      { level: 2, percent: 0.10 }, // 10% Level 2
      { level: 3, percent: 0.04 }  // 4% Level 3
    ];

    let currentUserId = buyerTelegramId;

    // Get Buyer Info for Notification
    const buyerRes = await dbPool.query('SELECT username, first_name FROM users WHERE telegram_id = $1', [buyerTelegramId]);
    const buyerObj = buyerRes.rows[0] || {};
    const buyerName = buyerObj.username ? `@${buyerObj.username}` : (buyerObj.first_name || buyerTelegramId);

    for (const { level, percent } of LEVEL_RATES) {
      // Find direct referrer of currentUserId
      const refRes = await dbPool.query('SELECT referred_by FROM users WHERE telegram_id = $1', [currentUserId]);
      const uplineId = refRes.rows[0]?.referred_by;

      if (!uplineId) break; // No further upline in chain

      const commAmount = parseFloat((priceGram * percent).toFixed(4));
      if (commAmount > 0) {
        // Credit GRAM balance to upline
        const userRes = await dbPool.query('SELECT gram_balance FROM users WHERE telegram_id = $1', [uplineId]);
        let updateQuery = 'UPDATE users SET balance = balance + $1 WHERE telegram_id = $2';
        if (userRes.rows[0]?.gram_balance !== null && userRes.rows[0]?.gram_balance !== undefined) {
          updateQuery = 'UPDATE users SET gram_balance = gram_balance + $1 WHERE telegram_id = $2';
        }
        await dbPool.query(updateQuery, [commAmount, uplineId]);

        console.log(`[NFT COMM] Level ${level} commission: +${commAmount} GRAM paid to ${uplineId} (Buyer: ${buyerTelegramId}, NFT: ${nftName})`);

        // Send Telegram notification to upline
        if (bot && !bot.isDummy && typeof bot.sendMessage === 'function') {
          const msg = `🎁 <b>Level ${level} Team NFT Commission!</b>\n\n` +
                      `👤 <b>Team Member:</b> ${buyerName}\n` +
                      `⚡ <b>NFT Miner:</b> ${nftName}\n` +
                      `💰 <b>Your Commission (${(percent * 100).toFixed(0)}%):</b> +${commAmount} GRAM\n\n` +
                      `Keep expanding your 3-level team to maximize passive referral rewards! 🚀`;
          bot.sendMessage(uplineId, msg, { parse_mode: 'HTML' }).catch(err => {
            console.warn(`[NFT COMM NOTIFY] Failed to notify ${uplineId}:`, err.message);
          });
        }
      }

      currentUserId = uplineId; // Ascend to next level up in tree
    }
  } catch (err) {
    console.error('[NFT COMM ERROR]:', err.message);
  }
}

/**
 * GET /api/nft/marketplace
 * Fetch available NFT Cards for purchase
 */
router.get('/marketplace', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM nft_cards WHERE is_active = TRUE ORDER BY price_gram DESC');
    res.json({
      success: true,
      cards: rows,
      deposit_wallet: ADMIN_WALLET
    });
  } catch (err) {
    console.error('Error fetching NFT marketplace:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/nft/buy
 * Purchase NFT card with GRAM balance
 * If user already has an active NFT card of this type, keep daily reward same and extend duration/days!
 */
router.post('/buy', async (req, res) => {
  const { telegram_id, nft_id } = req.body;
  if (!telegram_id || !nft_id) {
    return res.status(400).json({ error: 'telegram_id and nft_id are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch NFT details
    const nftRes = await client.query('SELECT * FROM nft_cards WHERE id = $1 AND is_active = TRUE', [nft_id]);
    if (nftRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'NFT card not found or inactive' });
    }
    const nft = nftRes.rows[0];
    const priceGram = parseFloat(nft.price_gram);

    // 2. Fetch User Gram Balance & Details
    const userRes = await client.query('SELECT username, first_name, balance, gram_balance FROM users WHERE telegram_id = $1 FOR UPDATE', [telegram_id]);
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];
    const currentBalance = parseFloat(user.gram_balance || user.balance || 0);

    if (currentBalance < priceGram) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Insufficient GRAM balance! Price is ${priceGram} GRAM, but your current balance is ${currentBalance.toFixed(3)} GRAM. Deposit or earn GRAM to purchase!` 
      });
    }

    // 3. Deduct GRAM Balance
    let updateQuery = 'UPDATE users SET balance = balance - $1 WHERE telegram_id = $2 RETURNING balance';
    if (user.gram_balance !== null && user.gram_balance !== undefined) {
      updateQuery = 'UPDATE users SET gram_balance = gram_balance - $1 WHERE telegram_id = $2 RETURNING gram_balance as balance';
    }
    const updateRes = await client.query(updateQuery, [priceGram, telegram_id]);

    // 4. Check if user already has an active NFT card for this nft_id
    const activeCardRes = await client.query(
      `SELECT * FROM user_nft_cards 
       WHERE telegram_id = $1 AND nft_id = $2 AND is_completed = FALSE 
       ORDER BY purchased_at DESC LIMIT 1 FOR UPDATE`,
      [telegram_id, nft_id]
    );

    let isUpgrade = false;
    let newTotalDays = parseInt(nft.duration_days, 10);

    if (activeCardRes.rows.length > 0) {
      // Active card exists: Upgrade duration/days! Daily yield stays the same.
      const activeCard = activeCardRes.rows[0];
      const currentTotalDays = parseInt(activeCard.total_days || nft.duration_days, 10);
      newTotalDays = currentTotalDays + parseInt(nft.duration_days, 10);

      await client.query(
        `UPDATE user_nft_cards SET total_days = $1 WHERE id = $2`,
        [newTotalDays, activeCard.id]
      );
      isUpgrade = true;
    } else {
      // Create new User NFT Card Entry
      await client.query(
        `INSERT INTO user_nft_cards (telegram_id, nft_id, total_days, purchased_at, last_claimed_at, claims_done, total_earned_gram, is_completed)
         VALUES ($1, $2, $3, NOW(), NULL, 0, 0, FALSE)`,
        [telegram_id, nft_id, newTotalDays]
      );
    }

    // 5. Update NFT Sold Count
    await client.query('UPDATE nft_cards SET sold_count = sold_count + 1 WHERE id = $1', [nft_id]);

    await client.query('COMMIT');

    // 6. Distribute 3-Level Team Referral Commissions (7% / 3% / 1%)
    distributeNftReferralCommissions(pool, telegram_id, priceGram, nft.name);

    // Notify Admin
    const displayName = user.username ? `@${user.username}` : (user.first_name || telegram_id);
    const actionTag = isUpgrade ? '🔄 NFT MINER UPGRADE' : '🚀 NEW NFT MINER PURCHASE';
    sendAdminBroadcast(
      `🛒 <b>${actionTag}</b>\n\n` +
      `👤 <b>User:</b> ${displayName} (<code>${telegram_id}</code>)\n` +
      `⚡ <b>NFT Miner:</b> ${nft.name}\n` +
      `💰 <b>Price Paid:</b> ${priceGram} GRAM\n` +
      `📈 <b>Daily Return:</b> +${nft.daily_yield_gram} GRAM/day (${newTotalDays} Days Total)\n` +
      `💳 <b>New User Balance:</b> ${parseFloat(updateRes.rows[0].balance).toFixed(3)} GRAM`
    );

    const successMessage = isUpgrade
      ? `🎉 Upgraded ${nft.name}! Duration extended by +${nft.duration_days} days (Total: ${newTotalDays} days). Daily return remains ${nft.daily_yield_gram} GRAM/day.`
      : `🎉 Successfully purchased ${nft.name}! Check your Inventory to claim daily yield.`;

    res.json({
      success: true,
      message: successMessage,
      new_balance: parseFloat(updateRes.rows[0].balance),
      is_upgrade: isUpgrade
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error buying NFT:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * GET /api/nft/my-cards
 * Fetch user's owned NFTs, claim eligibility, & status
 */
router.get('/my-cards', async (req, res) => {
  const telegram_id = req.query.telegram_id || req.body?.telegram_id;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id is required' });

  try {
    const query = `
      SELECT 
        unc.id as instance_id,
        unc.telegram_id,
        unc.purchased_at,
        unc.last_claimed_at,
        unc.claims_done,
        unc.total_earned_gram,
        unc.is_completed,
        unc.total_days,
        nc.id as nft_id,
        nc.name,
        nc.description,
        nc.price_gram,
        nc.daily_yield_gram,
        nc.duration_days,
        nc.total_yield_gram,
        nc.rarity,
        nc.icon_key
      FROM user_nft_cards unc
      JOIN nft_cards nc ON unc.nft_id = nc.id
      WHERE unc.telegram_id = $1
      ORDER BY unc.purchased_at DESC
    `;
    const { rows } = await pool.query(query, [telegram_id]);

    const cards = rows.map(card => {
      const claimsDone = parseInt(card.claims_done, 10) || 0;
      const durationDays = parseInt(card.total_days || card.duration_days, 10) || 10;
      const isMaxedOut = claimsDone >= durationDays || card.is_completed;
      const dailyYield = parseFloat(card.daily_yield_gram) || 0;
      const totalYield = durationDays * dailyYield;

      let canClaim = false;
      let nextClaimSeconds = 0;

      if (!isMaxedOut) {
        if (!card.last_claimed_at) {
          canClaim = true;
        } else {
          const lastClaim = new Date(card.last_claimed_at).getTime();
          const elapsed = (Date.now() - lastClaim) / 1000;
          const COOLDOWN_SEC = 24 * 3600; // 24 hours
          if (elapsed >= COOLDOWN_SEC) {
            canClaim = true;
          } else {
            nextClaimSeconds = Math.ceil(COOLDOWN_SEC - elapsed);
          }
        }
      }

      return {
        ...card,
        price_gram: parseFloat(card.price_gram) || 0,
        daily_yield_gram: dailyYield,
        duration_days: durationDays,
        total_yield_gram: totalYield,
        total_earned_gram: parseFloat(card.total_earned_gram) || 0,
        can_claim: canClaim,
        next_claim_seconds: Math.max(0, nextClaimSeconds || 0),
        days_remaining: Math.max(0, durationDays - claimsDone)
      };
    });

    res.json({ success: true, cards });
  } catch (err) {
    console.error('Error fetching user NFT cards:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/nft/claim-yield
 * Claim daily GRAM yield from an owned NFT
 */
router.post('/claim-yield', async (req, res) => {
  const { telegram_id, instance_id } = req.body;
  if (!telegram_id || !instance_id) {
    return res.status(400).json({ error: 'telegram_id and instance_id are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cardRes = await client.query(`
      SELECT unc.*, nc.daily_yield_gram, nc.duration_days, nc.name
      FROM user_nft_cards unc
      JOIN nft_cards nc ON unc.nft_id = nc.id
      WHERE unc.id = $1 AND unc.telegram_id = $2 FOR UPDATE
    `, [instance_id, telegram_id]);

    if (cardRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'NFT miner card not found' });
    }

    const card = cardRes.rows[0];
    const claimsDone = parseInt(card.claims_done, 10) || 0;
    const durationDays = parseInt(card.total_days || card.duration_days, 10) || 10;

    if (claimsDone >= durationDays || card.is_completed) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `This NFT Miner has completed all ${durationDays} days of yield!` });
    }

    if (card.last_claimed_at) {
      const elapsed = (Date.now() - new Date(card.last_claimed_at).getTime()) / 1000;
      if (elapsed < 24 * 3600) {
        await client.query('ROLLBACK');
        const remainingHours = Math.ceil((24 * 3600 - elapsed) / 3600);
        return res.status(400).json({ error: `Daily yield already claimed today! Next claim available in ~${remainingHours}h.` });
      }
    }

    const yieldAmount = parseFloat(card.daily_yield_gram);
    const newClaimsDone = claimsDone + 1;
    const isCompleted = newClaimsDone >= durationDays;

    // 1. Update NFT instance status
    await client.query(`
      UPDATE user_nft_cards
      SET last_claimed_at = NOW(),
          claims_done = $1,
          total_earned_gram = total_earned_gram + $2,
          is_completed = $3
      WHERE id = $4
    `, [newClaimsDone, yieldAmount, isCompleted, instance_id]);

    // 2. Add yield to user's balance
    const userRes = await client.query('SELECT gram_balance FROM users WHERE telegram_id = $1', [telegram_id]);
    let updateQuery = 'UPDATE users SET balance = balance + $1 WHERE telegram_id = $2 RETURNING balance';
    if (userRes.rows[0]?.gram_balance !== null && userRes.rows[0]?.gram_balance !== undefined) {
      updateQuery = 'UPDATE users SET gram_balance = gram_balance + $1 WHERE telegram_id = $2 RETURNING gram_balance as balance';
    }
    const updateRes = await client.query(updateQuery, [yieldAmount, telegram_id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `🎉 Claimed +${yieldAmount} GRAM daily return from ${card.name}! (${newClaimsDone}/${durationDays} Days)`,
      claimed_amount: yieldAmount,
      new_balance: parseFloat(updateRes.rows[0].balance),
      claims_done: newClaimsDone,
      is_completed: isCompleted
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error claiming NFT yield:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/nft/deposit/auto-verify
 * Automatic TON Blockchain deposit verifier - Zero Admin Required!
 */
router.post('/deposit/auto-verify', async (req, res) => {
  const { telegram_id, tx_hash } = req.body;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id is required' });

  const cleanTxHash = tx_hash ? tx_hash.trim().replace(/^['"]+|['"]+$/g, '') : null;
  const userMemo = `TASKY_${telegram_id}`;

  try {
    // 1. Check if Tx Hash was already credited in DB
    if (cleanTxHash) {
      const existing = await pool.query('SELECT * FROM gram_deposits WHERE tx_hash = $1', [cleanTxHash]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'This transaction hash has already been credited to your balance!' });
      }
    }

    // 2. Query TON API for recent events on Admin Wallet (Events API decodes comments reliably)
    const tonApiUrl = `https://tonapi.io/v2/accounts/${encodeURIComponent(ADMIN_WALLET)}/events?limit=50`;
    
    https.get(tonApiUrl, (apiRes) => {
      let body = '';
      apiRes.on('data', chunk => body += chunk);
      apiRes.on('end', async () => {
        try {
          const json = JSON.parse(body);
          const events = json.events || [];

          let matchedEvent = null;
          let depositedGram = 0;
          let matchedHash = cleanTxHash;

          for (const ev of events) {
            const eventId = ev.event_id;
            for (const action of (ev.actions || [])) {
              if (action.type === 'TonTransfer') {
                const transfer = action.TonTransfer;
                const comment = transfer.comment || '';
                
                // Check if comment matches TASKY_<TELEGRAM_ID> OR tx hash matches cleanTxHash
                const isMemoMatch = comment.includes(userMemo) || comment.includes(String(telegram_id));
                const isHashMatch = cleanTxHash && (eventId === cleanTxHash || eventId.toLowerCase() === cleanTxHash.toLowerCase());

                if (isMemoMatch || isHashMatch) {
                  const nanoAmount = BigInt(transfer.amount || 0);
                  depositedGram = Number(nanoAmount) / 1e9;

                  if (depositedGram > 0) {
                    matchedEvent = ev;
                    matchedHash = eventId;
                    break;
                  }
                }
              }
            }
            if (matchedEvent) break;
          }

          if (!matchedEvent || depositedGram <= 0) {
            return res.status(404).json({
              error: `No uncredited incoming deposit found for memo "${userMemo}". Make sure you transferred to ${ADMIN_WALLET} with comment "${userMemo}" and try again!`
            });
          }

          // Check DB again to ensure matchedHash wasn't credited concurrently
          const dbCheck = await pool.query('SELECT * FROM gram_deposits WHERE tx_hash = $1', [matchedHash]);
          if (dbCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Transaction has already been credited.' });
          }

          // Credit user's balance automatically!
          const client = await pool.connect();
          try {
            await client.query('BEGIN');

            // Record deposit entry
            await client.query(
              `INSERT INTO gram_deposits (telegram_id, amount_gram, tx_hash, auto_verified, status)
               VALUES ($1, $2, $3, TRUE, 'approved')`,
              [telegram_id, depositedGram, matchedHash]
            );

            // Update user balance & fetch details for admin broadcast
            const userRes = await client.query('SELECT username, first_name, gram_balance FROM users WHERE telegram_id = $1', [telegram_id]);
            let updateQuery = 'UPDATE users SET balance = balance + $1 WHERE telegram_id = $2 RETURNING balance';
            if (userRes.rows[0]?.gram_balance !== null && userRes.rows[0]?.gram_balance !== undefined) {
              updateQuery = 'UPDATE users SET gram_balance = gram_balance + $1 WHERE telegram_id = $2 RETURNING gram_balance as balance';
            }
            const updateRes = await client.query(updateQuery, [depositedGram, telegram_id]);

            await client.query('COMMIT');

            // Notify Admin of Deposit
            const user = userRes.rows[0] || {};
            const displayName = user.username ? `@${user.username}` : (user.first_name || telegram_id);
            const txHashDisplay = matchedHash ? (matchedHash.length > 20 ? `${matchedHash.substring(0, 10)}...${matchedHash.substring(matchedHash.length - 6)}` : matchedHash) : 'N/A';

            sendAdminBroadcast(
              `💰 <b>NEW GRAM DEPOSIT VERIFIED!</b>\n\n` +
              `👤 <b>User:</b> ${displayName} (<code>${telegram_id}</code>)\n` +
              `💎 <b>Amount Credited:</b> +${depositedGram.toFixed(3)} GRAM\n` +
              `🔗 <b>Tx Hash:</b> <code>${txHashDisplay}</code>\n` +
              `⚡ <b>Verification:</b> TON Blockchain Auto-Verified\n` +
              `💳 <b>New User Balance:</b> ${parseFloat(updateRes.rows[0].balance).toFixed(3)} GRAM`
            );

            return res.json({
              success: true,
              message: `🎉 Automatic Deposit Verified! +${depositedGram.toFixed(3)} GRAM credited instantly to your account.`,
              amount_gram: depositedGram,
              new_balance: parseFloat(updateRes.rows[0].balance),
              tx_hash: matchedHash
            });
          } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
          } finally {
            client.release();
          }
        } catch (parseErr) {
          console.error('TON API parse error:', parseErr);
          return res.status(500).json({ error: 'Failed to parse blockchain response. Please try again in a moment.' });
        }
      });
    }).on('error', (netErr) => {
      console.error('TON API net error:', netErr);
      return res.status(500).json({ error: 'Blockchain network error. Please try again.' });
    });
  } catch (err) {
    console.error('Error in auto deposit verification:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Helper to distribute 3-Level Team Referral Commissions (30% Level 1 / 10% Level 2 / 4% Level 3)
 */
async function distributeNftReferralCommissions(dbPool, buyerTelegramId, priceGram, nftName) {
  try {
    const buyerRes = await dbPool.query('SELECT username, first_name, referred_by FROM users WHERE telegram_id = $1', [buyerTelegramId]);
    if (buyerRes.rows.length === 0) return;
    const buyer = buyerRes.rows[0];
    const buyerName = buyer.username ? `@${buyer.username}` : (buyer.first_name || `User ${buyerTelegramId}`);

    const rates = [
      { level: 1, percent: 0.30, label: 'Level 1 (Direct)' },
      { level: 2, percent: 0.10, label: 'Level 2' },
      { level: 3, percent: 0.04, label: 'Level 3' }
    ];

    let currentReferrerId = buyer.referred_by;

    for (const rate of rates) {
      if (!currentReferrerId) break;

      const commAmount = parseFloat((priceGram * rate.percent).toFixed(4));
      if (commAmount <= 0) break;

      const refRes = await dbPool.query('SELECT telegram_id, referred_by, gram_balance FROM users WHERE telegram_id = $1', [currentReferrerId]);
      if (refRes.rows.length === 0) break;
      const referrer = refRes.rows[0];

      let updateQuery = 'UPDATE users SET balance = balance + $1 WHERE telegram_id = $2 RETURNING balance';
      if (referrer.gram_balance !== null && referrer.gram_balance !== undefined) {
        updateQuery = 'UPDATE users SET gram_balance = gram_balance + $1 WHERE telegram_id = $2 RETURNING gram_balance as balance';
      }
      const updatedRef = await dbPool.query(updateQuery, [commAmount, currentReferrerId]);
      const newBal = updatedRef.rows[0]?.balance || 0;

      if (bot && typeof bot.sendMessage === 'function') {
        const msg = `🎉 <b>Team NFT Commission Received!</b>\n\n` +
          `👤 <b>Team Member:</b> ${buyerName}\n` +
          `⚡ <b>NFT Purchased:</b> ${nftName} (${priceGram} GRAM)\n` +
          `🏆 <b>Commission Tier:</b> ${rate.label} (${(rate.percent * 100).toFixed(0)}%)\n` +
          `💰 <b>Reward Credited:</b> +${commAmount.toFixed(3)} GRAM\n` +
          `💳 <b>New Vault Balance:</b> ${parseFloat(newBal).toFixed(3)} GRAM`;
        bot.sendMessage(currentReferrerId, msg, { parse_mode: 'HTML' }).catch(err => {
          console.warn(`[NFT COMM NOTIFY] Failed to notify ${currentReferrerId}:`, err.message);
        });
      }

      currentReferrerId = referrer.referred_by;
    }
  } catch (err) {
    console.error('Error in distributeNftReferralCommissions:', err.message);
  }
}

module.exports = router;


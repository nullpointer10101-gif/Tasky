const express = require('express');
const router = express.Router();
const https = require('https');
const { pool } = require('../db');

const ADMIN_WALLET = process.env.ADMIN_WALLET || 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR';

// Helper to fetch recent TON API events for Admin Wallet
function fetchTonEvents(limit = 30) {
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
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

// ─── 1. CREATE CAMPAIGN INVOICE ──────────────────────────────────────────────
router.post('/create', async (req, res) => {
  const { telegram_id, promotion_type, title, target_url, target_users } = req.body;

  if (!telegram_id || !title || !target_url || !target_users) {
    return res.status(400).json({ error: 'Missing required parameters (title, target_url, target_users)' });
  }

  const usersCount = parseInt(target_users, 10);
  if (isNaN(usersCount) || usersCount < 1000) {
    return res.status(400).json({ error: 'Minimum target is 1,000 users (1.0 GRAM)' });
  }

  // Rate: 500 users = 0.5 GRAM => 0.001 GRAM per user
  const priceGram = (usersCount / 500) * 0.5;
  const pType = ['channel', 'bot', 'link'].includes(promotion_type) ? promotion_type : 'channel';

  // Generate unique Memo: PROMO_<tid>_<random_hex>
  const uniqueMemo = `PROMO_${telegram_id}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  try {
    const result = await pool.query(
      `INSERT INTO partner_promotions 
        (telegram_id, promotion_type, title, target_url, target_users, price_gram, memo, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_payment')
       RETURNING *`,
      [telegram_id, pType, title.trim(), target_url.trim(), usersCount, priceGram, uniqueMemo]
    );

    const campaign = result.rows[0];

    return res.json({
      success: true,
      campaign: {
        id: campaign.id,
        telegram_id: campaign.telegram_id,
        promotion_type: campaign.promotion_type,
        title: campaign.title,
        target_url: campaign.target_url,
        target_users: campaign.target_users,
        price_gram: parseFloat(campaign.price_gram),
        memo: campaign.memo,
        admin_wallet: ADMIN_WALLET,
        status: campaign.status,
        created_at: campaign.created_at
      }
    });
  } catch (err) {
    console.error('[PARTNER CREATE ERROR]:', err);
    return res.status(500).json({ error: 'Failed to create campaign invoice' });
  }
});

// Helper function to activate campaign & insert into tasks table
async function activateCampaign(campaign, client) {
  const isChannelOrBot = campaign.promotion_type === 'channel' || campaign.promotion_type === 'bot';
  const verificationType = isChannelOrBot ? 'auto_telegram' : 'timer_10s';
  const icon = campaign.promotion_type === 'channel' ? 'Send' : (campaign.promotion_type === 'bot' ? 'Bot' : 'Globe');

  // Insert active task into tasks table
  const taskRes = await client.query(
    `INSERT INTO tasks 
      (title, subtitle, type, reward_tasky, reward_gram, action_url, verification_type, icon, placement_category, max_participants, is_active, admin_only, is_featured)
     VALUES ($1, $2, 'social', 200, 0.0001, $3, $4, $5, 'partner', $6, TRUE, FALSE, TRUE)
     RETURNING id`,
    [
      campaign.title,
      `Promoted ${campaign.promotion_type.toUpperCase()} Project`,
      campaign.target_url,
      verificationType,
      icon,
      campaign.target_users
    ]
  );

  const taskId = taskRes.rows[0].id;

  // Update campaign status
  await client.query(
    `UPDATE partner_promotions 
     SET status = 'active', created_task_id = $1 
     WHERE id = $2`,
    [taskId, campaign.id]
  );

  return taskId;
}

// ─── 2. PAY WITH INTERNAL GRAM BALANCE ──────────────────────────────────────
router.post('/pay-internal', async (req, res) => {
  const { telegram_id, campaign_id } = req.body;

  if (!telegram_id || !campaign_id) {
    return res.status(400).json({ error: 'Missing telegram_id or campaign_id' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch campaign
    const campRes = await client.query(
      `SELECT * FROM partner_promotions WHERE id = $1 AND telegram_id = $2 FOR UPDATE`,
      [campaign_id, telegram_id]
    );

    if (campRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Campaign invoice not found' });
    }

    const campaign = campRes.rows[0];
    if (campaign.status === 'active') {
      await client.query('ROLLBACK');
      return res.json({ success: true, message: 'Campaign is already active!' });
    }

    const priceGram = parseFloat(campaign.price_gram);

    // Fetch user gram balance
    const userRes = await client.query(
      `SELECT gram_balance FROM users WHERE telegram_id = $1 FOR UPDATE`,
      [telegram_id]
    );

    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const userGram = parseFloat(userRes.rows[0].gram_balance || 0);

    if (userGram < priceGram) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Insufficient GRAM balance. Required: ${priceGram} GRAM, Available: ${userGram.toFixed(4)} GRAM.`
      });
    }

    // Deduct balance
    await client.query(
      `UPDATE users SET gram_balance = gram_balance - $1 WHERE telegram_id = $2`,
      [priceGram, telegram_id]
    );

    // Activate campaign & create task
    const taskId = await activateCampaign(campaign, client);

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: '🎉 Payment successful! Campaign is now LIVE on Tasky!',
      task_id: taskId
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PARTNER PAY INTERNAL ERROR]:', err);
    return res.status(500).json({ error: 'Failed to process internal GRAM payment' });
  } finally {
    client.release();
  }
});

// ─── 3. VERIFY ON-CHAIN PAYMENT (TON / GRAM) ────────────────────────────────
router.post('/verify-onchain', async (req, res) => {
  const { telegram_id, campaign_id } = req.body;

  if (!telegram_id || !campaign_id) {
    return res.status(400).json({ error: 'Missing telegram_id or campaign_id' });
  }

  const client = await pool.connect();
  try {
    const campRes = await client.query(
      `SELECT * FROM partner_promotions WHERE id = $1 AND telegram_id = $2`,
      [campaign_id, telegram_id]
    );

    if (campRes.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign invoice not found' });
    }

    const campaign = campRes.rows[0];
    if (campaign.status === 'active') {
      return res.json({ success: true, status: 'active', message: 'Campaign is already active and live!' });
    }

    const targetMemo = campaign.memo.trim().toUpperCase();

    // Scan recent events from TON API
    const events = await fetchTonEvents(40);
    let foundTransfer = false;

    for (const ev of events) {
      for (const action of (ev.actions || [])) {
        if (action.type === 'TonTransfer') {
          const comment = (action.TonTransfer?.comment || '').trim().toUpperCase();
          if (comment === targetMemo || comment.includes(targetMemo)) {
            foundTransfer = true;
            break;
          }
        }
      }
      if (foundTransfer) break;
    }

    if (foundTransfer) {
      await client.query('BEGIN');
      const taskId = await activateCampaign(campaign, client);
      await client.query('COMMIT');

      return res.json({
        success: true,
        status: 'active',
        message: '✅ On-chain payment verified! Your campaign is now live on the Partner tab!',
        task_id: taskId
      });
    } else {
      return res.json({
        success: false,
        status: 'pending_payment',
        message: 'Payment not detected yet. Please ensure you sent TON/GRAM to the admin wallet with the exact memo code.'
      });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[VERIFY ONCHAIN ERROR]:', err);
    return res.status(500).json({ error: 'Failed to verify on-chain payment' });
  } finally {
    client.release();
  }
});

// ─── 4. GET MY CAMPAIGNS ────────────────────────────────────────────────────
router.get('/my-campaigns', async (req, res) => {
  const { telegram_id } = req.query;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id is required' });

  try {
    const result = await pool.query(
      `SELECT * FROM partner_promotions WHERE telegram_id = $1 ORDER BY created_at DESC`,
      [telegram_id]
    );
    return res.json({ success: true, campaigns: result.rows });
  } catch (err) {
    console.error('[MY CAMPAIGNS ERROR]:', err);
    return res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

module.exports = router;

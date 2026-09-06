const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * Server-to-Server (S2S) Postback Handler for Ad Partners (Monetag, GigaPub)
 */

// Helper to record an S2S ad postback event
async function handleS2SPostback(provider, req, res) {
  try {
    const params = { ...req.query, ...req.body };
    const rawTelegramId = params.telegram_id || params.subid_1 || params.subid || params.sub_id_1 || params.user_id || params.custom_data;
    const zoneId = params.zone_id || params.zone || params.unit_id || '';
    const clickId = params.click_id || params.clickid || params.tx || params.tx_id || '';
    const payout = parseFloat(params.payout || params.amount || 0) || 0;

    console.log(`[Ad Postback] 📩 Received ${provider} S2S postback:`, {
      rawTelegramId,
      zoneId,
      clickId,
      payout,
      ip: req.ip
    });

    if (!rawTelegramId) {
      console.warn(`[Ad Postback] ⚠️ ${provider} postback missing telegram_id / subid`);
      return res.status(200).json({ status: 'ignored', reason: 'missing_user_identifier' });
    }

    const telegramId = rawTelegramId.toString().trim();

    // Verify user exists in database
    const userRes = await pool.query('SELECT id, is_banned FROM users WHERE telegram_id = $1', [telegramId]);
    if (userRes.rows.length === 0) {
      console.warn(`[Ad Postback] User ${telegramId} not found in database`);
      return res.status(200).json({ status: 'ignored', reason: 'user_not_found' });
    }

    if (userRes.rows[0].is_banned) {
      return res.status(200).json({ status: 'ignored', reason: 'user_banned' });
    }

    const adType = provider === 'monetag' ? 'gram_monetag' : 'gram_gigapub';

    // Insert into ad_views
    await pool.query(
      `INSERT INTO ad_views (telegram_id, ad_type) VALUES ($1, $2)`,
      [telegramId, adType]
    );

    // Increment total_ads_watched
    await pool.query(
      `UPDATE users SET total_ads_watched = COALESCE(total_ads_watched, 0) + 1 WHERE telegram_id = $1`,
      [telegramId]
    );

    console.log(`[Ad Postback] ✅ Successfully recorded S2S verified view for ${telegramId} (${adType})`);
    return res.status(200).json({ status: 'ok', provider, telegram_id: telegramId });
  } catch (err) {
    console.error(`[Ad Postback] Error processing ${provider} postback:`, err);
    return res.status(200).json({ status: 'error', message: 'internal_error' });
  }
}

// Monetag S2S Postback
router.get('/monetag', (req, res) => handleS2SPostback('monetag', req, res));
router.post('/monetag', (req, res) => handleS2SPostback('monetag', req, res));

// GigaPub S2S Postback
router.get('/gigapub', (req, res) => handleS2SPostback('gigapub', req, res));
router.post('/gigapub', (req, res) => handleS2SPostback('gigapub', req, res));

module.exports = router;

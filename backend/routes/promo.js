const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.post('/redeem', async (req, res) => {
  const { telegram_id, code } = req.body;

  if (!telegram_id || !code) {
    return res.status(400).json({ success: false, error: 'Telegram ID and Code are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch user
    const userRes = await client.query('SELECT id, balance FROM users WHERE telegram_id = $1', [telegram_id]);
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // 2. Fetch promo code with FOR UPDATE to prevent race conditions
    const promoRes = await client.query(
      `SELECT * FROM promo_codes WHERE code = $1 FOR UPDATE`,
      [code.toUpperCase()]
    );

    if (promoRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Invalid bounty code' });
    }

    const promo = promoRes.rows[0];

    if (!promo.is_active) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'This code is no longer active' });
    }

    if (promo.expires_at && new Date() > new Date(promo.expires_at)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'This code has expired' });
    }

    if (promo.current_uses >= promo.max_uses) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'This code has reached its maximum usage limit' });
    }

    // 3. Check if user already claimed
    const claimRes = await client.query(
      'SELECT id FROM user_promo_claims WHERE telegram_id = $1 AND promo_id = $2',
      [telegram_id, promo.id]
    );

    if (claimRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'You have already claimed this code' });
    }

    // 3.5 Check referral requirement
    if (promo.require_ref) {
      const refCheck = await client.query(
        `SELECT id FROM referrals 
         WHERE referrer_telegram_id = $1::bigint 
           AND created_at >= $2::timestamptz 
           AND reward_paid = TRUE 
         LIMIT 1`,
        [telegram_id, promo.created_at]
      );

      if (refCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          error: 'This code requires 1 valid new referral invited after the code was created. Have your new referral complete at least 3 tasks to become valid.' 
        });
      }
    }

    // 4. Record claim
    await client.query(
      'INSERT INTO user_promo_claims (telegram_id, promo_id) VALUES ($1, $2)',
      [telegram_id, promo.id]
    );

    // 5. Update promo uses
    await client.query(
      'UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = $1',
      [promo.id]
    );

    // 6. Update user balance (TASKY)
    await client.query(
      'UPDATE users SET balance = balance + $1 WHERE telegram_id = $2',
      [promo.reward_amount, telegram_id]
    );

    // 7. Award GRAM if promo has a gram reward
    const gramReward = parseFloat(promo.reward_gram || 0);
    if (gramReward > 0) {
      await client.query(
        'UPDATE users SET gram_balance = COALESCE(gram_balance, 0) + $1 WHERE telegram_id = $2',
        [gramReward, telegram_id]
      );
    }

    await client.query('COMMIT');
    
    const gramMsg = gramReward > 0 ? ` + ${gramReward} GRAM` : '';
    res.json({
      success: true,
      reward_amount: promo.reward_amount,
      reward_gram: gramReward,
      message: `Successfully redeemed ${promo.reward_amount} TASKY${gramMsg}!`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error redeeming promo code:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;

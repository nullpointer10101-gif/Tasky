const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * POST /api/offerwall/claim
 * Process and credit a completed offerwall reward to the user
 * Body: { userId, rewardId, projectId, amount, hash }
 */
router.post('/claim', async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId, rewardId, projectId, amount, hash } = req.body;

    if (!userId || !rewardId) {
      return res.status(400).json({ error: 'Missing userId or rewardId' });
    }

    const telegramId = parseInt(userId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ error: 'Invalid userId format' });
    }

    const rewardAmount = Math.max(0, parseFloat(amount) || 0);

    await client.query('BEGIN');

    // Check if this reward has already been processed
    const existingCheck = await client.query(
      'SELECT id, amount FROM offerwall_conversions WHERE reward_id = $1',
      [String(rewardId)]
    );

    if (existingCheck.rows.length > 0) {
      await client.query('COMMIT');
      return res.json({
        success: true,
        alreadyClaimed: true,
        message: 'Reward already claimed previously'
      });
    }

    // Insert conversion record
    await client.query(
      `INSERT INTO offerwall_conversions (telegram_id, reward_id, project_id, amount, hash, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [telegramId, String(rewardId), String(projectId || '8093'), rewardAmount, String(hash || '')]
    );

    // Credit points to user
    const userUpdate = await client.query(
      `UPDATE users 
       SET points = points + $1 
       WHERE telegram_id = $2 
       RETURNING points, gram_balance, total_points`,
      [rewardAmount, telegramId]
    );

    if (userUpdate.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      rewardAmount,
      points: userUpdate.rows[0].points,
      message: `Successfully credited ${rewardAmount} TASKY points!`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error claiming offerwall reward:', err);
    return res.status(500).json({ error: 'Internal server error processing claim' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/offerwall/stats/:telegramId
 * Retrieve user's total offerwall earnings and completed offers count
 */
router.get('/stats/:telegramId', async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ error: 'Invalid telegram ID' });
    }

    const stats = await pool.query(
      `SELECT 
         COUNT(*) as total_offers,
         COALESCE(SUM(amount), 0) as total_earned
       FROM offerwall_conversions
       WHERE telegram_id = $1`,
      [telegramId]
    );

    return res.json({
      success: true,
      stats: {
        totalOffers: parseInt(stats.rows[0].total_offers, 10) || 0,
        totalEarned: parseFloat(stats.rows[0].total_earned) || 0
      }
    });
  } catch (err) {
    console.error('Error fetching offerwall stats:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bot = require('../bot');
const { recalculateTier } = require('../utils/recalculateMachineTier');

// GET /api/mining/status/:telegram_id
router.get('/status/:telegram_id(\\d+)', async (req, res) => {
  const { telegram_id } = req.params;
  try {
    const { rows: users } = await pool.query(`
      SELECT u.id, u.mining_level, u.efficiency_percent, u.balance,
             u.holding_stable_since, u.wallet_address, ml.name as level_name, ml.base_speed_per_hour
      FROM users u
      LEFT JOIN mining_levels ml ON u.mining_level = ml.level
      WHERE u.telegram_id = $1
    `, [telegram_id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = users[0];
    
    const days_stable = user.holding_stable_since ? 
      Math.floor((new Date() - new Date(user.holding_stable_since)) / (1000 * 60 * 60 * 24)) : 0;
      
    const base_speed = Number(user.base_speed_per_hour) || 0;
    const efficiency = Number(user.efficiency_percent) || 100;
    
    // FETCH MACHINES BONUS
    const { rows: userMachines } = await pool.query(`
      SELECT m.speed_bonus_percent 
      FROM user_machines um
      JOIN machines m ON um.machine_id = m.id
      WHERE um.telegram_id = $1
    `, [telegram_id]);
    
    let total_machine_bonus_percent = 0;
    userMachines.forEach(m => total_machine_bonus_percent += Number(m.speed_bonus_percent));

    const effective_speed = base_speed * (efficiency / 100) * (1 + total_machine_bonus_percent / 100);
    const owned_machine_count = userMachines.length;

    let sessionData = null;
    
    const { rows: sessions } = await pool.query(`
      SELECT * FROM mining_sessions 
      WHERE telegram_id = $1 AND status = 'active'
      ORDER BY started_at DESC LIMIT 1
    `, [telegram_id]);

    if (sessions.length > 0) {
      const session = sessions[0];
      const now = new Date();
      const expected_claim = new Date(session.expected_claim_at);
      const is_ready_to_claim = now >= expected_claim;
      
      let estimated_current_earned = 0;
      if (is_ready_to_claim) {
        estimated_current_earned = Number(session.rate_used) * Number(session.session_duration_hours);
      } else {
        const elapsedHours = (now - new Date(session.started_at)) / (1000 * 60 * 60);
        estimated_current_earned = Number(session.rate_used) * elapsedHours;
      }

      sessionData = {
        id: session.id,
        started_at: session.started_at,
        expected_claim_at: session.expected_claim_at,
        is_ready_to_claim,
        estimated_current_earned,
        rate_used: session.rate_used
      };
    }

    res.json({
      mining_level: user.mining_level,
      level_name: user.level_name,
      base_speed_per_hour: base_speed,
      efficiency_percent: efficiency,
      total_machine_bonus_percent,
      owned_machine_count,
      effective_speed,
      balance: parseFloat(user.balance) || 0,
      holding_stable_since: user.holding_stable_since,
      wallet_address: user.wallet_address,
      days_stable,
      active_session: sessionData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/mining/start
router.post('/start', async (req, res) => {
  const { telegram_id, wallet_address } = req.body;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });
  if (!wallet_address) return res.status(400).json({ error: 'Connect your wallet to start mining' });

  try {
    const { rows: binding } = await pool.query('SELECT wallet_address FROM wallet_bindings WHERE telegram_id = $1', [telegram_id]);
    if (binding.length === 0 || binding[0].wallet_address !== wallet_address) {
       return res.status(400).json({ error: 'Connect your bound wallet to start mining' });
    }

    const { rows: sessions } = await pool.query(`
      SELECT id FROM mining_sessions 
      WHERE telegram_id = $1 AND status = 'active'
    `, [telegram_id]);

    if (sessions.length > 0) {
      return res.status(400).json({ error: 'You already have an active mining session' });
    }

    const { rows: users } = await pool.query(`
      SELECT u.mining_level, u.efficiency_percent, ml.base_speed_per_hour
      FROM users u
      LEFT JOIN mining_levels ml ON u.mining_level = ml.level
      WHERE u.telegram_id = $1
    `, [telegram_id]);

    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = users[0];

    const base_speed = Number(user.base_speed_per_hour) || 0;
    const efficiency = Number(user.efficiency_percent) || 100;
    
    // FETCH MACHINES BONUS
    const { rows: userMachines } = await pool.query(`
      SELECT m.speed_bonus_percent 
      FROM user_machines um
      JOIN machines m ON um.machine_id = m.id
      WHERE um.telegram_id = $1
    `, [telegram_id]);
    
    let total_machine_bonus_percent = 0;
    userMachines.forEach(m => total_machine_bonus_percent += Number(m.speed_bonus_percent));

    const rate_used = base_speed * (efficiency / 100) * (1 + total_machine_bonus_percent / 100);

    const session_duration_hours = 4;
    const expected_claim_at = new Date(Date.now() + session_duration_hours * 60 * 60 * 1000);

    const { rows: newSession } = await pool.query(`
      INSERT INTO mining_sessions 
      (telegram_id, wallet_address, expected_claim_at, rate_used, level_used, efficiency_used, session_duration_hours, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING *
    `, [telegram_id, wallet_address, expected_claim_at, rate_used, user.mining_level, user.efficiency_percent, session_duration_hours]);

    res.json(newSession[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/mining/claim
router.post('/claim', async (req, res) => {
  const { telegram_id, wallet_address } = req.body;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });
  if (!wallet_address) return res.status(400).json({ error: 'Reconnect your wallet to claim your mining rewards' });

  try {
    const { rows: binding } = await pool.query('SELECT wallet_address FROM wallet_bindings WHERE telegram_id = $1', [telegram_id]);
    if (binding.length === 0 || binding[0].wallet_address !== wallet_address) {
       return res.status(400).json({ error: 'Reconnect your bound wallet to claim your mining rewards' });
    }

    const { rows: sessions } = await pool.query(`
      SELECT * FROM mining_sessions 
      WHERE telegram_id = $1 AND status = 'active'
      ORDER BY started_at DESC LIMIT 1
    `, [telegram_id]);

    if (sessions.length === 0) {
      return res.status(400).json({ error: 'No active mining session to claim' });
    }

    const session = sessions[0];
    const now = new Date();
    
    if (now < new Date(session.expected_claim_at)) {
      return res.status(400).json({ error: 'Mining session not finished yet' });
    }

    const tasky_earned = Number(session.rate_used) * Number(session.session_duration_hours);

    // Transaction to mark claimed and add balance
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query(`
        UPDATE mining_sessions
        SET claimed = TRUE, claimed_at = NOW(), tasky_earned = $1, status = 'claimed'
        WHERE id = $2
      `, [tasky_earned, session.id]);

      const { rows: updatedUser } = await client.query(`
        UPDATE users
        SET balance = balance + $1
        WHERE telegram_id = $2
        RETURNING balance
      `, [tasky_earned, telegram_id]);

      await client.query('COMMIT');
      
      const new_balance = updatedUser[0].balance;

      try {
        bot.sendMessage(telegram_id, `⛏️ Mining complete! +${tasky_earned} TASKY claimed. Start your next session!`);
      } catch (e) {
        console.error('Failed to notify user about claim', e.message);
      }

      // Recalculate tier instantly after balance change
      await recalculateTier(telegram_id);

      res.json({ tasky_earned, new_balance });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/mining/levels
router.get('/levels', async (req, res) => {
  try {
    const { rows: levels } = await pool.query('SELECT * FROM mining_levels ORDER BY level ASC');
    const { rows: tiers } = await pool.query('SELECT * FROM efficiency_tiers ORDER BY min_days ASC');
    res.json({ levels, efficiency_tiers: tiers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/mining/machines/:telegram_id
router.get('/machines/:telegram_id(\\d+)', async (req, res) => {
  const { telegram_id } = req.params;
  try {
    const { rows: users } = await pool.query('SELECT balance FROM users WHERE telegram_id = $1', [telegram_id]);
    const balance = users.length > 0 ? parseFloat(users[0].balance) : 0;
    
    const { rows: machines } = await pool.query('SELECT * FROM machines ORDER BY sort_order ASC');
    const { rows: userMachines } = await pool.query('SELECT machine_id, reveal_seen FROM user_machines WHERE telegram_id = $1', [telegram_id]);
    
    const ownedMap = {};
    userMachines.forEach(um => ownedMap[um.machine_id] = um.reveal_seen);
    
    let total_bonus_percent = 0;
    const unrevealed_new_machines = [];
    const formattedMachines = machines.map(m => {
      const isOwned = ownedMap[m.id] !== undefined;
      
      if (isOwned) {
        total_bonus_percent += Number(m.speed_bonus_percent);
        if (ownedMap[m.id] === false) {
          unrevealed_new_machines.push(m.id);
        }
        return {
          id: m.id,
          name: m.name,
          rarity: m.rarity,
          min_holding: Number(m.min_holding),
          bonus: Number(m.speed_bonus_percent),
          icon_key: m.icon_key,
          status: 'owned'
        };
      } else if (balance >= Number(m.reveal_at_holding)) {
        return {
          id: m.id,
          name: m.name,
          rarity: m.rarity,
          min_holding: Number(m.min_holding),
          bonus: Number(m.speed_bonus_percent),
          icon_key: m.icon_key,
          status: 'visible'
        };
      } else {
        return {
          id: m.id,
          rarity: m.rarity,
          icon_key: 'mystery',
          status: 'hidden'
        };
      }
    });

    res.json({
      machines: formattedMachines,
      total_bonus_percent,
      unrevealed_new_machines
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/mining/machines/mark-seen
router.post('/machines/mark-seen', async (req, res) => {
  const { telegram_id, machine_id } = req.body;
  if (!telegram_id || !machine_id) return res.status(400).json({ error: 'telegram_id and machine_id required' });
  
  try {
    await pool.query(`
      UPDATE user_machines 
      SET reveal_seen = TRUE 
      WHERE telegram_id = $1 AND machine_id = $2
    `, [telegram_id, machine_id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/mining/admin/test_job — triggers a tier recalc for a user immediately
router.get('/admin/test_job/:telegram_id', async (req, res) => {
  try {
    const result = await recalculateTier(req.params.telegram_id);
    res.json({ success: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Job execution failed' });
  }
});

module.exports = router;

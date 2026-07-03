/**
 * updateMiningLevels.js — SAFETY-NET FALLBACK ONLY
 * 
 * Primary recalculation now happens synchronously inside each route that changes
 * a user's balance (tasks, checkin, mining claim, swap). This job runs every 6 hours
 * as a catch-all to correct any edge cases that may have been missed.
 * 
 * It no longer queries the TON blockchain — all logic is based on off-chain balance.
 */
const cron = require('node-cron');
const { recalculateTier } = require('../utils/recalculateMachineTier');
const { pool } = require('../db');

const runUpdateMiningLevels = async () => {
    console.log('[Mining Safety-Net] Running batch tier recalculation for all users...');
    try {
        // Fetch all users (no wallet_address filter needed — off-chain now)
        const { rows: users } = await pool.query(
            'SELECT telegram_id FROM users ORDER BY id ASC'
        );

        let processed = 0;
        let errors = 0;

        for (const user of users) {
            const result = await recalculateTier(user.telegram_id);
            if (result) processed++;
            else errors++;
        }

        console.log(`[Mining Safety-Net] Done. Processed: ${processed}, Errors: ${errors}`);
    } catch (err) {
        console.error('[Mining Safety-Net] Fatal error:', err);
    }
};

const startMiningJob = () => {
    // Run every 6 hours instead of every 30 minutes — this is now a safety-net, not primary
    cron.schedule('0 */6 * * *', runUpdateMiningLevels);
    console.log('[Mining Safety-Net] Scheduled every 6 hours as fallback.');
};

module.exports = { startMiningJob, runUpdateMiningLevels };

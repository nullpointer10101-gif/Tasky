const { pool } = require('../db');

async function runDatabaseMaintenance() {
  try {
    console.log('[DB MAINTENANCE] Starting scheduled maintenance...');

    // 1. Ensure composite indexes exist for maximum query speed
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ad_views_user_claimed ON ad_views(telegram_id, claimed);
      CREATE INDEX IF NOT EXISTS idx_ad_views_created_at ON ad_views(created_at);
      CREATE INDEX IF NOT EXISTS idx_gram_claims_user ON gram_claims(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_gram_claims_status ON gram_claims(status);
      CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_withdrawals_telegram_id ON withdrawals(telegram_id);
    `);

    // 2. Clean up old claimed ad views older than 14 days to keep storage small (<50 MB forever)
    const purgeResult = await pool.query(`
      DELETE FROM ad_views 
      WHERE claimed = TRUE AND created_at < NOW() - INTERVAL '14 days';
    `);

    if (purgeResult.rowCount > 0) {
      console.log(`[DB MAINTENANCE] Successfully purged ${purgeResult.rowCount} old claimed ad records (>14 days).`);
    } else {
      console.log('[DB MAINTENANCE] No old claimed ad records needed purging.');
    }

    // 3. Run ANALYZE to update query statistics for PostgreSQL query planner
    await pool.query('ANALYZE ad_views, users, gram_claims, withdrawals;');
    console.log('[DB MAINTENANCE] ✅ Database maintenance & index optimization complete.');

  } catch (err) {
    console.error('[DB MAINTENANCE ERROR]', err.message);
  }
}

function startDbMaintenanceService() {
  // Run once immediately 30 seconds after server boot
  setTimeout(runDatabaseMaintenance, 30 * 1000);

  // Run every 24 hours (24 * 60 * 60 * 1000 ms)
  setInterval(runDatabaseMaintenance, 24 * 60 * 60 * 1000);
  console.log('✅ DB Maintenance Service scheduled (runs daily to keep DB small & fast forever).');
}

module.exports = { startDbMaintenanceService, runDatabaseMaintenance };

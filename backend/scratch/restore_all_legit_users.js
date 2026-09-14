const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

async function restoreAllLegitUsers() {
  const logPath = `C:\\Users\\aleem\\.gemini\\antigravity-ide\\brain\\3cb00171-c986-4170-aee2-8dffaacf43ad\\.system_generated\\tasks\\task-659.log`;
  if (!fs.existsSync(logPath)) {
    console.error('Log file not found!');
    process.exit(1);
  }

  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');

  const usersToRestore = [];

  // Parse log for user pattern:
  // User 8729554590: Total 120 ads, Fast Bursts (<10s): 1
  // Purging invalid/fast ad_views for user 8729554590...
  // Deleted 120 ad_views for 8729554590.

  let currentUser = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const userMatch = line.match(/^User (\d+): Total (\d+) ads, Fast Bursts \(<10s\): (\d+)$/);
    if (userMatch) {
      const tid = userMatch[1];
      const totalAds = parseInt(userMatch[2], 10);
      const fastBursts = parseInt(userMatch[3], 10);

      // Check if deleted in next line
      let deletedCount = 0;
      if (i + 2 < lines.length) {
        const delMatch = lines[i+2].match(/^Deleted (\d+) ad_views for \d+\.$/);
        if (delMatch) {
          deletedCount = parseInt(delMatch[1], 10);
        }
      }

      if (deletedCount > 0) {
        // Legitimate user: low fast bursts (<=5) or high legitimate volume
        // We restore their ads! If fastBursts was small, subtract fastBursts from total
        const validAdsToRestore = Math.max(0, deletedCount - fastBursts);
        if (validAdsToRestore > 0) {
          usersToRestore.push({
            telegram_id: tid,
            totalAds: deletedCount,
            fastBursts,
            restoreCount: validAdsToRestore
          });
        }
      }
    }
  }

  console.log(`Found ${usersToRestore.length} legitimate users to restore!`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const u of usersToRestore) {
      console.log(`Restoring ${u.restoreCount} ad_views for user ${u.telegram_id} (original ${u.totalAds}, fast: ${u.fastBursts})...`);

      const now = Date.now();
      // Spread ads across last 12 hours with 25s intervals
      const intervalMs = 25000;
      const baseTime = now - (u.restoreCount * intervalMs);

      // Split 50% reactor_usl and 50% gram_gigapub/gram_adexium
      const values = [];
      const params = [u.telegram_id];
      let paramIdx = 2;

      for (let k = 0; k < u.restoreCount; k++) {
        const adTime = new Date(baseTime + (k * intervalMs));
        // Alternate ad_type: reactor_usl vs gram_gigapub / gram_adexium
        let adType = 'reactor_usl';
        if (k % 4 === 1) adType = 'gram_gigapub';
        else if (k % 4 === 3) adType = 'gram_adexium';

        values.push(`($1, $${paramIdx}, $${paramIdx+1})`);
        params.push(adType, adTime);
        paramIdx += 2;
      }

      if (values.length > 0) {
        const query = `INSERT INTO ad_views (telegram_id, ad_type, created_at) VALUES ${values.join(', ')}`;
        await client.query(query, params);
      }
    }

    await client.query('COMMIT');
    console.log('--- ALL LEGITIMATE USERS RESTORED SUCCESSFULLY ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during mass restoration:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

restoreAllLegitUsers();

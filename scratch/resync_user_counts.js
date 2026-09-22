process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_hdzlyY4E8Dmu@ep-floral-block-ao1exyu8-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const { pool } = require('../backend/db');

async function syncAllUserData() {
  try {
    console.log('Syncing and verifying user stats across all tables...');

    // 1. Sync total_referrals count from referrals table
    const refSync = await pool.query(`
      WITH ref_counts AS (
        SELECT referrer_telegram_id, COUNT(*) as cnt
        FROM referrals
        GROUP BY referrer_telegram_id
      )
      UPDATE users u
      SET total_referrals = COALESCE(rc.cnt, 0)
      FROM ref_counts rc
      WHERE u.telegram_id::text = rc.referrer_telegram_id::text
        AND u.total_referrals != rc.cnt;
    `);
    console.log(`Updated total_referrals for ${refSync.rowCount} users.`);

    // 2. Sync total_ads_watched count from ad_views table
    const adSync = await pool.query(`
      WITH ad_counts AS (
        SELECT telegram_id, COUNT(*) as cnt
        FROM ad_views
        GROUP BY telegram_id
      )
      UPDATE users u
      SET total_ads_watched = COALESCE(ac.cnt, 0)
      FROM ad_counts ac
      WHERE u.telegram_id::text = ac.telegram_id::text
        AND COALESCE(u.total_ads_watched, 0) != ac.cnt;
    `);
    console.log(`Updated total_ads_watched for ${adSync.rowCount} users.`);

    // 3. Ensure no banned users remain
    const unban = await pool.query('UPDATE users SET is_banned = FALSE WHERE is_banned = TRUE');
    console.log(`Unbanned ${unban.rowCount} accounts.`);

    // 4. Ensure referral_code is populated for 100% of users
    const missingRefCodes = await pool.query("SELECT id, telegram_id FROM users WHERE referral_code IS NULL OR referral_code = ''");
    console.log(`Found ${missingRefCodes.rows.length} users missing referral_code.`);
    for (const r of missingRefCodes.rows) {
      const code = 'TASKY' + Math.floor(100000 + Math.random() * 900000);
      await pool.query('UPDATE users SET referral_code = $1 WHERE id = $2', [code, r.id]);
    }

    console.log('✅ User data resync complete!');
  } catch (err) {
    console.error('Error during sync:', err);
  }
  process.exit(0);
}

syncAllUserData();

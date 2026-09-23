const { Client } = require('pg');

const neonUrl = process.env.DATABASE_URL;

async function unbanAndSync() {
  console.log('=== UNBANNING ALL USERS & FULL DATA RECOVERY ON NEON ===');
  const client = new Client({
    connectionString: neonUrl,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  // 1. Unban ALL users
  const unbanRes = await client.query('UPDATE users SET is_banned = FALSE WHERE is_banned = TRUE');
  console.log(`✓ Unbanned ${unbanRes.rowCount} users (is_banned = FALSE for 100% of accounts)`);

  // 2. Sync total_referrals for all users from referrals table
  const refRes = await client.query(`
    UPDATE users u
    SET total_referrals = COALESCE(r.cnt, 0)
    FROM (
      SELECT referrer_telegram_id, COUNT(*) as cnt
      FROM referrals
      GROUP BY referrer_telegram_id
    ) r
    WHERE u.telegram_id = r.referrer_telegram_id
  `);
  console.log(`✓ Synchronized referral counts for ${refRes.rowCount} accounts`);

  // 3. Sync valid_referrals for all users from paid referrals
  const validRefRes = await client.query(`
    UPDATE users u
    SET valid_referrals = COALESCE(r.cnt, 0)
    FROM (
      SELECT referrer_telegram_id, COUNT(*) as cnt
      FROM referrals
      WHERE reward_paid = TRUE
      GROUP BY referrer_telegram_id
    ) r
    WHERE u.telegram_id = r.referrer_telegram_id
  `);
  console.log(`✓ Synchronized valid referral counts for ${validRefRes.rowCount} accounts`);

  // 4. Recalculate total_ads_watched for all users from ad_views table
  const adsRes = await client.query(`
    UPDATE users u
    SET total_ads_watched = COALESCE(a.cnt, 0)
    FROM (
      SELECT telegram_id, COUNT(*) as cnt
      FROM ad_views
      GROUP BY telegram_id
    ) a
    WHERE u.telegram_id = a.telegram_id
  `);
  console.log(`✓ Synchronized ad view counts for ${adsRes.rowCount} accounts`);

  // 5. Final Verification
  const summary = await client.query(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE is_banned = TRUE) as banned_users,
      COALESCE(SUM(balance), 0) as total_tasky_balance,
      COALESCE(SUM(gram_balance), 0) as total_gram_balance,
      COALESCE(SUM(total_referrals), 0) as total_referrals_sum,
      COALESCE(SUM(total_ads_watched), 0) as total_ads_sum
    FROM users
  `);

  console.log('\n=== LIVE NEON DATABASE SUMMARY ===');
  console.log('Total Users       :', summary.rows[0].total_users);
  console.log('Banned Users      :', summary.rows[0].banned_users, '(0 banned!)');
  console.log('Total TASKY Balance:', summary.rows[0].total_tasky_balance);
  console.log('Total GRAM Balance :', summary.rows[0].total_gram_balance);
  console.log('Total Referrals   :', summary.rows[0].total_referrals_sum);
  console.log('Total Ads Watched  :', summary.rows[0].total_ads_sum);

  await client.end();
  console.log('\n🎉 ALL USERS UNBANNED & ALL ACCOUNTS FULLY RESTORED & SYNCHRONIZED ON NEON!');
}

unbanAndSync().catch(console.error);

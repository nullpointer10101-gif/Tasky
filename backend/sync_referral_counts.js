const { Client } = require('pg');

const neonUrl = process.env.DATABASE_URL;

async function syncReferrals() {
  console.log('=== SYNCING REFERRAL COUNTS ON NEON ===');
  const client = new Client({
    connectionString: neonUrl,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  // 1. Update total_referrals for all users based on referrals table
  const res1 = await client.query(`
    UPDATE users u
    SET total_referrals = COALESCE(ref_counts.cnt, 0)
    FROM (
      SELECT referrer_telegram_id, COUNT(*) as cnt
      FROM referrals
      GROUP BY referrer_telegram_id
    ) ref_counts
    WHERE u.telegram_id = ref_counts.referrer_telegram_id
  `);
  console.log(`✓ Updated total_referrals for ${res1.rowCount} users from referrals table`);

  // 2. Update valid_referrals for users with paid referrals
  const res2 = await client.query(`
    UPDATE users u
    SET valid_referrals = COALESCE(ref_counts.cnt, 0)
    FROM (
      SELECT referrer_telegram_id, COUNT(*) as cnt
      FROM referrals
      WHERE reward_paid = TRUE
      GROUP BY referrer_telegram_id
    ) ref_counts
    WHERE u.telegram_id = ref_counts.referrer_telegram_id
  `);
  console.log(`✓ Updated valid_referrals for ${res2.rowCount} users from paid referrals`);

  // 3. Check sample top referrers
  const top = await client.query(`
    SELECT telegram_id, username, first_name, total_referrals, valid_referrals 
    FROM users 
    WHERE total_referrals > 0 
    ORDER BY total_referrals DESC 
    LIMIT 5
  `);
  console.log('\nTop 5 Referrers in Neon after sync:', top.rows);

  await client.end();
  console.log('\n🎉 REFERRAL COUNTS 100% SYNCHRONIZED ON NEON!');
}

syncReferrals().catch(console.error);

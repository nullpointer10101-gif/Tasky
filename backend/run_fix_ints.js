const { Client } = require('pg');

const neonUrl = 'postgresql://neondb_owner:npg_hdzlyY4E8Dmu@ep-floral-block-ao1exyu8.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function runFixInts() {
  const client = new Client({
    connectionString: neonUrl,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const intAlters = [
    `ALTER TABLE users ALTER COLUMN total_referrals TYPE INT USING (CASE WHEN total_referrals::text ~ '^[0-9]+$' THEN total_referrals::text::int ELSE 0 END)`,
    `ALTER TABLE users ALTER COLUMN streak_days TYPE INT USING (CASE WHEN streak_days::text ~ '^[0-9]+$' THEN streak_days::text::int ELSE 0 END)`,
    `ALTER TABLE users ALTER COLUMN valid_referrals TYPE INT USING (CASE WHEN valid_referrals::text ~ '^[0-9]+$' THEN valid_referrals::text::int ELSE 0 END)`,
    `ALTER TABLE users ALTER COLUMN spins_available TYPE INT USING (CASE WHEN spins_available::text ~ '^[0-9]+$' THEN spins_available::text::int ELSE 0 END)`,
    `ALTER TABLE users ALTER COLUMN spins_used_today TYPE INT USING (CASE WHEN spins_used_today::text ~ '^[0-9]+$' THEN spins_used_today::text::int ELSE 0 END)`,
    `ALTER TABLE users ALTER COLUMN mining_level TYPE INT USING (CASE WHEN mining_level::text ~ '^[0-9]+$' THEN mining_level::text::int ELSE 0 END)`,
    `ALTER TABLE users ALTER COLUMN withdrawal_ads_watched TYPE INT USING (CASE WHEN withdrawal_ads_watched::text ~ '^[0-9]+$' THEN withdrawal_ads_watched::text::int ELSE 0 END)`,
    `ALTER TABLE users ALTER COLUMN withdrawal_popup_views TYPE INT USING (CASE WHEN withdrawal_popup_views::text ~ '^[0-9]+$' THEN withdrawal_popup_views::text::int ELSE 0 END)`,
    `ALTER TABLE users ALTER COLUMN total_ads_watched TYPE INT USING (CASE WHEN total_ads_watched::text ~ '^[0-9]+$' THEN total_ads_watched::text::int ELSE 0 END)`,
    `ALTER TABLE user_tasks ALTER COLUMN task_id TYPE INT USING (CASE WHEN task_id::text ~ '^[0-9]+$' THEN task_id::text::int ELSE NULL END)`,
    `ALTER TABLE user_machines ALTER COLUMN machine_id TYPE INT USING (CASE WHEN machine_id::text ~ '^[0-9]+$' THEN machine_id::text::int ELSE NULL END)`,
    `ALTER TABLE user_nft_cards ALTER COLUMN nft_id TYPE INT USING (CASE WHEN nft_id::text ~ '^[0-9]+$' THEN nft_id::text::int ELSE NULL END)`
  ];

  for (const sql of intAlters) {
    try {
      await client.query(sql);
      const match = sql.match(/ALTER TABLE (\w+) ALTER COLUMN (\w+) TYPE (\w+)/);
      if (match) console.log(`✓ ${match[1]}.${match[2]} -> ${match[3]}`);
    } catch (err) {
      console.error(`Error on (${sql}): ${err.message}`);
    }
  }

  // Now verify stats query live on Neon!
  const statsRes = await client.query(`
    SELECT 
      COUNT(*) as total_users, 
      COALESCE(SUM(balance), 0) as total_tasky, 
      COALESCE(SUM(gram_balance), 0) as total_gram,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as new_users_today
    FROM users
  `);

  console.log('\n=== LIVE STATS VERIFICATION FROM NEON ===');
  console.log('Total Users:', statsRes.rows[0].total_users);
  console.log('Total TASKY:', statsRes.rows[0].total_tasky);
  console.log('Total GRAM :', statsRes.rows[0].total_gram);
  console.log('New Users Today:', statsRes.rows[0].new_users_today);

  await client.end();
}

runFixInts().catch(console.error);

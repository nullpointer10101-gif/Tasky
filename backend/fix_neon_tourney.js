const { Client } = require('pg');

const neonUrl = 'postgresql://neondb_owner:npg_hdzlyY4E8Dmu@ep-floral-block-ao1exyu8.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function fixNeonTourney() {
  const client = new Client({
    connectionString: neonUrl,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  await client.query(`
    ALTER TABLE campaign_tournaments ADD COLUMN IF NOT EXISTS tournament_type VARCHAR(50) DEFAULT 'ad';
    ALTER TABLE campaign_tournaments ADD COLUMN IF NOT EXISTS winners_count INTEGER DEFAULT 30;
  `);

  const res = await client.query(`
    UPDATE campaign_tournaments 
    SET tournament_type = 'ad', winners_count = 30 
    WHERE id = 1 OR title ILIKE '%ad%'
    RETURNING *;
  `);
  console.log('Fixed Neon Tournament:', res.rows);

  const testWinners = await client.query(`
    SELECT u.telegram_id, u.username, u.first_name, u.gram_wallet_address,
           COUNT(a.id) as ads_watched
    FROM ad_views a
    JOIN users u ON u.telegram_id::text = a.telegram_id::text
    WHERE a.created_at >= '2026-09-20 11:45:20.029+00' AND a.created_at <= '2026-09-27 11:45:20.029+00'
      AND u.is_banned = FALSE
    GROUP BY u.telegram_id, u.username, u.first_name, u.gram_wallet_address
    ORDER BY ads_watched DESC, u.telegram_id ASC
    LIMIT 10;
  `);
  console.log('Neon Ad Winners:', testWinners.rows);

  await client.end();
}

fixNeonTourney().catch(console.error);

require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function seedNftCards() {
  await pool.query(`
    INSERT INTO nft_cards (id, name, description, price_gram, daily_yield_gram, duration_days, total_yield_gram, rarity, icon_key, max_supply, is_active)
    VALUES 
      (1, 'Gram Mini Miner #01', 'Entry-level digital miner. Earn 0.07 GRAM daily for 10 days.', 0.5, 0.07, 10, 0.70, 'rare', 'bolt', 1000, true),
      (2, 'Gram Turbo Miner #02', 'High-speed digital miner. Earn 0.15 GRAM daily for 10 days.', 1.0, 0.15, 10, 1.5, 'legendary', 'rocket', 1000, true),
      (3, 'Gram Mega Miner #03', 'Ultra-powered digital miner. Earn 0.70 GRAM daily for 10 days.', 5.0, 0.70, 10, 7.0, 'mythic', 'flame', 1000, true)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      price_gram = EXCLUDED.price_gram,
      daily_yield_gram = EXCLUDED.daily_yield_gram,
      duration_days = EXCLUDED.duration_days,
      total_yield_gram = EXCLUDED.total_yield_gram,
      rarity = EXCLUDED.rarity,
      icon_key = EXCLUDED.icon_key,
      is_active = EXCLUDED.is_active;
  `);

  const res = await pool.query('SELECT * FROM nft_cards ORDER BY id ASC');
  console.log('=== UPDATED NFT CARDS IN DATABASE ===');
  console.table(res.rows);
  await pool.end();
}

seedNftCards().catch(console.error);

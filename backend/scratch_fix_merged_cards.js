require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fixMergedCards() {
  console.log('Fixing merged cards in DB...');

  // 1. WILBERT_007 (id: 7)
  await pool.query('UPDATE user_nft_cards SET total_days = 10 WHERE id = 7');
  await pool.query(`
    INSERT INTO user_nft_cards (telegram_id, nft_id, total_days, purchased_at, last_claimed_at, claims_done, total_earned_gram, is_completed)
    VALUES ('7918368029', 2, 10, '2026-09-04 08:30:00+00', NULL, 0, 0, FALSE)
  `);
  console.log('Fixed WILBERT_007 card (Gram Turbo Miner #02 purchased today at 2:00 PM)');

  // 2. JITEENDER5809 (id: 4 & id: 6)
  await pool.query('UPDATE user_nft_cards SET total_days = 10 WHERE id = 4');
  await pool.query(`
    INSERT INTO user_nft_cards (telegram_id, nft_id, total_days, purchased_at, last_claimed_at, claims_done, total_earned_gram, is_completed)
    VALUES ('7620028567', 2, 10, '2026-09-02 12:28:31+00', NULL, 0, 0, FALSE)
  `);

  await pool.query('UPDATE user_nft_cards SET total_days = 10 WHERE id = 6');
  await pool.query(`
    INSERT INTO user_nft_cards (telegram_id, nft_id, total_days, purchased_at, last_claimed_at, claims_done, total_earned_gram, is_completed)
    VALUES ('7620028567', 1, 10, '2026-09-02 12:35:15+00', NULL, 0, 0, FALSE)
  `);
  console.log('Fixed JITEENDER5809 cards');

  // 3. kiopajje (id: 1)
  await pool.query('UPDATE user_nft_cards SET total_days = 10 WHERE id = 1');
  await pool.query(`
    INSERT INTO user_nft_cards (telegram_id, nft_id, total_days, purchased_at, last_claimed_at, claims_done, total_earned_gram, is_completed)
    VALUES ('6446145632', 1, 10, '2026-09-01 21:23:21+00', NULL, 0, 0, FALSE)
  `);
  console.log('Fixed kiopajje card');

  await pool.end();
  console.log('ALL CARDS SUCCESSFULLY UNMERGED & SPLIT INTO INDIVIDUAL PURCHASES!');
}

fixMergedCards().catch(e => { console.error(e); process.exit(1); });

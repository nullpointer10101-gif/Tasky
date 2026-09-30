const { pool } = require('./db');

async function setupGramFlipsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gram_flips (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        bet_amount NUMERIC(12, 4) NOT NULL,
        choice VARCHAR(10) NOT NULL,
        outcome VARCHAR(10) NOT NULL,
        is_win BOOLEAN NOT NULL,
        payout_multiplier NUMERIC(4, 2) DEFAULT 1.90,
        win_amount NUMERIC(12, 4) DEFAULT 0,
        house_profit NUMERIC(12, 4) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_gram_flips_telegram_id ON gram_flips(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_gram_flips_created_at ON gram_flips(created_at DESC);
    `);
    console.log('✅ gram_flips table and indexes verified/created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating gram_flips table:', err);
    process.exit(1);
  }
}

setupGramFlipsTable();

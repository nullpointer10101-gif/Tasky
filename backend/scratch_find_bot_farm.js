require('dotenv').config({ path: __dirname + '/.env' });
const { pool } = require('./db');

async function findManipulator() {
  try {
    const refRes = await pool.query(`
      SELECT telegram_id, first_name, username, total_referrals, created_at, is_banned, gram_wallet_address 
      FROM users 
      WHERE telegram_id = '1693157810'
    `);
    console.log('--- MAIN BOT FARM RINGLEADER ---');
    console.log(refRes.rows[0]);

    const botsRes = await pool.query(`
      SELECT id, telegram_id, first_name, username, created_at, is_banned, total_ads_watched, gram_wallet_address 
      FROM users 
      WHERE referred_by = '1693157810' 
      ORDER BY id ASC
    `);
    console.log(`\n--- ALL 28 FARM BOT ACCOUNTS (Referred by 1693157810) ---`);
    console.table(botsRes.rows);

    const claimsRes = await pool.query(`
      SELECT id, telegram_id, gram_wallet_address, amount, status, requested_at, rejection_reason 
      FROM gram_claims 
      WHERE id BETWEEN 456 AND 465 
      ORDER BY id ASC
    `);
    console.log('\n--- SPAM CLAIMS SUBMITTED BY THIS FARM (All Blocked & Rejected) ---');
    console.table(claimsRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

findManipulator();

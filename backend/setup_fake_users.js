require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const fakeUsers = [
  { telegram_id: 9000000001, first_name: 'NinjaTrd', valid_referrals: 110, total_referrals: 195 },
  { telegram_id: 9000000002, first_name: 'AirdropMaster99', valid_referrals: 95, total_referrals: 160 },
  { telegram_id: 9000000003, first_name: 'Elena_crypto', valid_referrals: 82, total_referrals: 145 },
  { telegram_id: 9000000004, first_name: 'TaskyFan', valid_referrals: 75, total_referrals: 130 },
  { telegram_id: 9000000005, first_name: 'Web3_Explorer', valid_referrals: 68, total_referrals: 115 },
  { telegram_id: 9000000006, first_name: 'DogeLover', valid_referrals: 62, total_referrals: 100 },
  { telegram_id: 9000000007, first_name: 'BountyHunter', valid_referrals: 55, total_referrals: 85 },
  { telegram_id: 9000000008, first_name: 'Sam_Sam', valid_referrals: 45, total_referrals: 75 },
  { telegram_id: 9000000009, first_name: 'PavelD', valid_referrals: 38, total_referrals: 60 },
  { telegram_id: 9000000010, first_name: 'MaxProfits', valid_referrals: 30, total_referrals: 50 },
];

async function run() {
  const client = await pool.connect();
  try {
    for (const user of fakeUsers) {
      // Upsert the fake users
      await client.query(`
        INSERT INTO users (telegram_id, username, first_name, valid_referrals, total_referrals)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (telegram_id) DO UPDATE SET
          valid_referrals = EXCLUDED.valid_referrals,
          total_referrals = EXCLUDED.total_referrals,
          first_name = EXCLUDED.first_name
      `, [user.telegram_id, user.first_name, user.first_name, user.valid_referrals, user.total_referrals]);
      console.log(`Inserted/Updated fake user: ${user.first_name}`);
    }
    console.log('Successfully set up 10 fake users.');
  } catch (err) {
    console.error('Error inserting fake users:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();

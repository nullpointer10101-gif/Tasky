require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getUserMaxWithdrawalLimit(telegramId, dbClient = pool) {
    try {
        const res = await dbClient.query(`
            SELECT nc.price_gram, nc.total_yield_gram
            FROM user_nft_cards unc
            JOIN nft_cards nc ON unc.nft_id = nc.id
            WHERE unc.telegram_id::text = $1::text
        `, [telegramId.toString()]);

        if (res.rows.length === 0) {
            return 0.02; // Normal user limit
        }

        let maxLimit = 0.02;
        for (const row of res.rows) {
            const price = parseFloat(row.price_gram || 0);
            const totalYield = parseFloat(row.total_yield_gram || 0);
            if (price >= 1.0 || totalYield >= 1.5) {
                maxLimit = Math.max(maxLimit, 0.05); // Turbo Miner -> 0.05
            } else if (price >= 0.5 || totalYield >= 0.7) {
                maxLimit = Math.max(maxLimit, 0.03); // Mini Miner -> 0.03
            }
        }
        return maxLimit;
    } catch (err) {
        console.error('Error fetching user NFT max withdrawal limit:', err);
        return 0.02;
    }
}

async function runTest() {
  console.log('=== TESTING DYNAMIC TIERED WITHDRAWAL LIMITS ===\n');

  // Test 1: User 7040735131 (Turbo Miner holder)
  const limit1 = await getUserMaxWithdrawalLimit('7040735131');
  console.log(`User 7040735131 (Turbo Miner Holder): ${limit1} GRAM/day`);

  // Test 2: User 8611648621 (Mini Miner holder)
  const limit2 = await getUserMaxWithdrawalLimit('8611648621');
  console.log(`User 8611648621 (Mini Miner Holder): ${limit2} GRAM/day`);

  // Test 3: Normal user (No NFT)
  const limit3 = await getUserMaxWithdrawalLimit('9999999999');
  console.log(`User 9999999999 (Normal User, No NFT): ${limit3} GRAM/day`);

  await pool.end();
}

runTest().catch(console.error);

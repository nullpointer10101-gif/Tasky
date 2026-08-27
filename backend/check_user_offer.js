const { pool } = require('./db');

async function checkUser(telegramId) {
  try {
    const user = await pool.query("SELECT * FROM users WHERE telegram_id = $1", [telegramId]);
    console.log('User Profile:', {
      id: user.rows[0]?.telegram_id,
      name: user.rows[0]?.first_name,
      balance: user.rows[0]?.balance,
      is_banned: user.rows[0]?.is_banned,
      created_at: user.rows[0]?.created_at
    });

    const refs = await pool.query("SELECT * FROM users WHERE referred_by = $1", [telegramId]);
    console.log('\nTotal Referrals (including invalid):', refs.rowCount);

    const validRefs = await pool.query("SELECT * FROM users WHERE referred_by = $1 AND withdrawal_ads_watched >= 3", [telegramId]);
    console.log('Valid Referrals (>= 3 ads watched):', validRefs.rowCount);

    console.log('\nValid Referrals Data:');
    validRefs.rows.forEach(r => {
      console.log(`- ID: ${r.telegram_id}, Name: ${r.first_name}, Ads: ${r.withdrawal_ads_watched}, Banned: ${r.is_banned}, Joined: ${r.created_at}`);
    });

    const offerStatus = await pool.query("SELECT * FROM special_offer_claims WHERE telegram_id = $1", [telegramId]);
    console.log('\nSpecial Offer Claims table status:');
    if (offerStatus.rowCount > 0) {
      console.log(offerStatus.rows[0]);
    } else {
      console.log('No claim record found.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

checkUser('7752106152');

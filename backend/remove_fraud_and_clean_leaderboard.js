const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const FRAUD_ACCOUNTS = [
  // Batch 1 (vanbien2210 tree)
  '5237104574', // @vanbien2210
  '6436738775', // @Chamhip
  '7123740694', // @bien2210
  '7673767415', // @namchien12
  '7893217017', // @anhtam11
  '8087484055', // @danden111
  '5661209883', // @MrBen0111
  '7160668593', // @LONGVIPPRO12
  '1544209326', // @hoang_tuan94
  '7810514939', // @ba_noi1

  // Batch 2 (hoang_tuan94 / Sep 18 sybils)
  '7418975002', // @duy_khanhbon
  '7740584645', // @bangoai1221
  '7537607597', // @bon_bon2019
  '6828691165', // @giabaobobo
  '7223671479', // @cungoaan
  '6821689937', // @thuy_nguyen92

  // Batch 3 (Sep 18 12:14-12:17 sybils)
  '6715405557', // @Hung9950
  '6243287146', // @Vosii99
  '8115247688', // @Qchi2k7

  // Batch 4 (Sep 20 random string bot accounts)
  '8832316154', // @GHEbF6pX2lDpevS
  '8937601849', // @user_8937601849
  '8639681094', // @user_8639681094
  '8947593578', // @user_8947593578
  '8642794422', // @user_8642794422
  '8706795029', // @user_8706795029
  '8977273685'  // @user_8977273685
];

async function removeFraudAndCleanLeaderboard() {
  const client = await pool.connect();
  try {
    console.log('================================================================================');
    console.log('🛡️ PURGING FRAUD / SYBIL BOT ACCOUNTS & CLEANING LEADERBOARD');
    console.log('================================================================================\n');

    // 1. Mark fraud accounts as banned in the database
    const banRes = await client.query(`
      UPDATE users 
      SET is_banned = TRUE 
      WHERE telegram_id::text = ANY($1)
      RETURNING telegram_id, username, first_name
    `, [FRAUD_ACCOUNTS]);

    console.log(`✅ Successfully banned ${banRes.rows.length} sybil / bot farm accounts in DB:\n`);
    console.table(banRes.rows);

    // 2. Fetch active tournament
    const tourneyRes = await client.query(
      "SELECT * FROM campaign_tournaments WHERE status = 'active' ORDER BY id DESC LIMIT 1"
    );
    const tournament = tourneyRes.rows[0];

    // 3. Query the NEW, 100% CLEAN Top 30 Leaderboard
    const cleanLeaderboard = await client.query(`
      SELECT 
        u.telegram_id,
        u.username,
        u.first_name,
        u.created_at,
        u.wallet_address,
        u.gram_wallet_address,
        u.streak_days,
        u.mining_level,
        COUNT(a.id) as ads_watched
      FROM ad_views a
      JOIN users u ON u.telegram_id::text = a.telegram_id::text
      WHERE a.created_at >= $1 AND a.created_at <= $2
        AND u.is_banned = FALSE
      GROUP BY u.telegram_id, u.username, u.first_name, u.created_at, u.wallet_address, u.gram_wallet_address, u.streak_days, u.mining_level
      ORDER BY ads_watched DESC, u.telegram_id ASC
      LIMIT 30
    `, [tournament.start_at, tournament.end_at]);

    console.log('\n================================================================================');
    console.log('🏆 100% CLEAN OFFICIAL TOP 30 TOURNAMENT LEADERBOARD (READY FOR PAYOUT)');
    console.log('================================================================================\n');

    const PRIZE_MAP = (rank) => {
      if (rank === 1) return { gram: '1.00', tasky: '20,000', label: '🥇 1st Place' };
      if (rank === 2) return { gram: '0.50', tasky: '10,000', label: '🥈 2nd Place' };
      if (rank === 3) return { gram: '0.30', tasky: '5,000', label: '🥉 3rd Place' };
      if (rank >= 4 && rank <= 10) return { gram: '0.10', tasky: '2,000', label: '🏅 Top 10' };
      if (rank >= 11 && rank <= 30) return { gram: '0.05', tasky: '1,000', label: '🎖️ Top 30' };
      return { gram: '0.00', tasky: '0', label: 'None' };
    };

    const finalPayouts = cleanLeaderboard.rows.map((r, idx) => {
      const rank = idx + 1;
      const prize = PRIZE_MAP(rank);
      const wallet = r.wallet_address || r.gram_wallet_address || 'NO_WALLET_SET';
      return {
        Rank: rank,
        TG_ID: r.telegram_id,
        Username: r.username ? `@${r.username}` : 'No username',
        Name: r.first_name || 'Miner',
        Ads: parseInt(r.ads_watched, 10),
        GRAM_Prize: `${prize.gram} GRAM`,
        TASKY_Prize: `${prize.tasky} T`,
        Wallet: wallet,
        Account_Age: `${((Date.now() - new Date(r.created_at).getTime()) / (1000 * 86400)).toFixed(0)}d`,
        Streak: r.streak_days || 0
      };
    });

    console.table(finalPayouts);

  } catch (err) {
    console.error('Error cleaning leaderboard:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

removeFraudAndCleanLeaderboard();

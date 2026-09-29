const { pool } = require('./db');

async function setupNewReferralTournament() {
  console.log('--- Setting up 20-Day Referral Championship ---');
  
  // 1. Ensure tournament table has tournament_type column
  await pool.query("ALTER TABLE campaign_tournaments ADD COLUMN IF NOT EXISTS tournament_type VARCHAR(50) DEFAULT 'referral'");
  await pool.query("ALTER TABLE campaign_tournaments ADD COLUMN IF NOT EXISTS winners_count INTEGER DEFAULT 20");

  // 2. Mark any currently active tournament as ended
  await pool.query("UPDATE campaign_tournaments SET status = 'ended_pending_admin_payout' WHERE status = 'active'");

  // 3. Create fresh 20-Day Referral Championship
  const title = `🚀 20-Day Referral Championship #0030`;
  const start_at = new Date(); // Starts NOW
  const end_at = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000); // 20 days from now

  const insertRes = await pool.query(
    `INSERT INTO campaign_tournaments (title, start_at, end_at, status, tournament_type, winners_count) 
     VALUES ($1, $2, $3, 'active', 'referral', 20) 
     RETURNING *`,
    [title, start_at, end_at]
  );

  console.log('✅ NEW 20-DAY REFERRAL TOURNAMENT CREATED:', insertRes.rows[0]);
  await pool.end();
}

setupNewReferralTournament().catch(console.error);

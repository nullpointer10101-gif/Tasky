const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to DB successfully.\n');

  const tgIds = [6471257554, 5802381615];
  for (const tgId of tgIds) {
    console.log('================================================================');
    console.log('🔍 INVESTIGATING USER TG ID:', tgId);
    console.log('================================================================');
    
    const userRes = await client.query('SELECT * FROM users WHERE telegram_id = $1', [tgId]);
    if (userRes.rows.length === 0) {
      console.log('User not found');
      continue;
    }
    const u = userRes.rows[0];
    console.log('👤 Profile Overview:');
    console.log({
      id: u.id,
      telegram_id: u.telegram_id,
      username: u.username || 'none',
      first_name: u.first_name,
      language: u.language,
      referrer_id: u.referrer_id,
      bp: u.bp,
      honey_balance: u.honey_balance,
      streak_count: u.streak_count,
      has_collected: u.has_collected,
      has_completed_mission: u.has_completed_mission,
      status: u.status,
      created_at: u.created_at,
      updated_at: u.updated_at
    });

    // Check transactions
    const txRes = await client.query('SELECT type, amount, status, description, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 15', [u.id]);
    console.log('\n💳 Transactions (' + txRes.rows.length + ' found):');
    console.table(txRes.rows);

    // Check who referred this user
    if (u.referrer_id) {
      const inviterRes = await client.query('SELECT telegram_id, username, first_name, bp, created_at FROM users WHERE id = $1', [u.referrer_id]);
      console.log('Invited by:', inviterRes.rows[0]);
    } else {
      console.log('Invited by: Organic / Direct (No referrer)');
    }

    // Check referrals
    const refRes = await client.query(`
      SELECT r.level, r.status, r.reward_paid, r.created_at, r.activated_at,
             u2.telegram_id, u2.username, u2.first_name, u2.bp, u2.has_collected, u2.has_completed_mission, u2.created_at as user_created_at
      FROM referrals r
      JOIN users u2 ON u2.id = r.referred_id
      WHERE r.referrer_id = $1
      ORDER BY r.created_at ASC
    `, [u.id]);
    
    console.log('\n👥 Referrals Breakdown:');
    console.log('Total Referrals Recorded in DB:', refRes.rows.length);
    const activeCount = refRes.rows.filter(r => r.status === 'active').length;
    const pendingCount = refRes.rows.filter(r => r.status === 'pending').length;
    const collectedCount = refRes.rows.filter(r => r.has_collected).length;
    const missionCount = refRes.rows.filter(r => r.has_completed_mission).length;
    console.log({
      total: refRes.rows.length,
      active: activeCount,
      pending: pendingCount,
      haveHarvested: collectedCount,
      haveCompletedMission: missionCount
    });

    if (refRes.rows.length > 0) {
      const firstJoin = new Date(refRes.rows[0].created_at);
      const lastJoin = new Date(refRes.rows[refRes.rows.length - 1].created_at);
      const durationMin = ((lastJoin - firstJoin) / (1000 * 60)).toFixed(1);
      console.log('\n⏱️ Join Timeline Velocity:');
      console.log({
        firstRefAt: firstJoin.toISOString(),
        lastRefAt: lastJoin.toISOString(),
        durationMinutes: durationMin,
        joinVelocityPerMinute: (refRes.rows.length / Math.max(1, durationMin)).toFixed(2)
      });

      console.log('\n📋 Sample First 10 Referrals:');
      console.table(refRes.rows.slice(0, 10).map(r => ({
        tg_id: r.telegram_id,
        username: r.username || 'none',
        name: r.first_name,
        created_at: new Date(r.created_at).toLocaleTimeString(),
        has_collected: r.has_collected,
        bp: r.bp
      })));

      console.log('\n📋 Sample Last 10 Referrals:');
      console.table(refRes.rows.slice(-10).map(r => ({
        tg_id: r.telegram_id,
        username: r.username || 'none',
        name: r.first_name,
        created_at: new Date(r.created_at).toLocaleTimeString(),
        has_collected: r.has_collected,
        bp: r.bp
      })));
    }

    // Check user_missions
    const missionsRes = await client.query('SELECT * FROM user_missions WHERE user_id = $1', [u.id]);
    console.log('\n🎯 Missions Completed (' + missionsRes.rows.length + '):');
    console.table(missionsRes.rows);

    // Check deposits / withdrawals
    const depRes = await client.query('SELECT * FROM deposits WHERE user_id = $1', [u.id]);
    console.log('\n💰 Deposits (' + depRes.rows.length + '):', depRes.rows);

    const withRes = await client.query('SELECT * FROM withdrawals WHERE user_id = $1', [u.id]);
    console.log('💸 Withdrawals (' + withRes.rows.length + '):', withRes.rows);

    console.log('\n');
  }
  await client.end();
}

run().catch(e => {
  console.error('Error during investigation:', e);
  process.exit(1);
});

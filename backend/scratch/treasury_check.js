require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkTreasury() {
  console.log('\n=== TREASURY HEALTH CHECK ===\n');

  // 1. Recent gram_claims (last 24h)
  const claimsRes = await pool.query(`
    SELECT id, telegram_id, gram_wallet_address, amount, status, requested_at, processed_at, tx_hash, is_flagged, flag_reason
    FROM gram_claims
    ORDER BY requested_at DESC
    LIMIT 20
  `);
  console.log(`--- Recent GRAM Claims (last 20) ---`);
  let pending = 0, approved = 0, rejected = 0, flagged = 0, stuck = 0;
  for (const c of claimsRes.rows) {
    const ageMin = Math.round((Date.now() - new Date(c.requested_at)) / 60000);
    const isStuck = c.status === 'pending' && ageMin > 60;
    if (isStuck) stuck++;
    if (c.status === 'pending') pending++;
    if (c.status === 'approved') approved++;
    if (c.status === 'rejected') rejected++;
    if (c.is_flagged) flagged++;
    const icon = isStuck ? '🔴 STUCK' : c.status === 'approved' ? '✅' : c.status === 'pending' ? '🟡' : '❌';
    console.log(`${icon} | ID:${c.id} | ${c.status.toUpperCase()} | ${c.amount} GRAM | Age: ${ageMin}m | TxHash: ${c.tx_hash ? c.tx_hash.slice(0,16)+'...' : 'NONE'} | Flag: ${c.is_flagged ? c.flag_reason : 'clean'}`);
  }
  console.log(`\nSummary: ${pending} pending, ${approved} approved, ${rejected} rejected, ${flagged} flagged, ${stuck} STUCK >1h`);

  // 2. gram_deposits — did the 1 TON deposit register?
  const depositsRes = await pool.query(`
    SELECT id, telegram_id, tx_hash, amount_ton, credited_amount, status, created_at
    FROM gram_deposits
    ORDER BY created_at DESC
    LIMIT 10
  `);
  console.log(`\n--- Recent GRAM Deposits (TON in) ---`);
  if (depositsRes.rows.length === 0) {
    console.log('⚠️  No deposits in gram_deposits table at all.');
  } else {
    for (const d of depositsRes.rows) {
      const ageMin = Math.round((Date.now() - new Date(d.created_at)) / 60000);
      console.log(`  TxHash: ${d.tx_hash?.slice(0,20)}... | ${d.amount_ton} TON | Credited: ${d.credited_amount} | Status: ${d.status} | Age: ${ageMin}m | User: ${d.telegram_id}`);
    }
  }

  // 3. Check for any pending claims older than 2 hours (auto-payout may be failing)
  const stuckRes = await pool.query(`
    SELECT id, telegram_id, amount, requested_at, is_flagged, flag_reason,
           EXTRACT(EPOCH FROM (NOW() - requested_at))/3600 as hours_old
    FROM gram_claims
    WHERE status = 'pending'
    ORDER BY requested_at ASC
  `);
  console.log(`\n--- Pending Claims Detail ---`);
  if (stuckRes.rows.length === 0) {
    console.log('✅ No pending claims — all processed!');
  } else {
    for (const c of stuckRes.rows) {
      const h = parseFloat(c.hours_old).toFixed(1);
      const risk = h > 2 ? '🔴 OVERDUE' : h > 1 ? '🟡 WAITING' : '🟢 NEW';
      console.log(`  ${risk} | ID:${c.id} | TelegramID:${c.telegram_id} | ${c.amount} GRAM | Age: ${h}h | Flagged: ${c.is_flagged ? c.flag_reason : 'no'}`);
    }
  }

  // 4. Auto-payout stats (last 24h)
  const payoutStats = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'approved' AND processed_at >= NOW() - INTERVAL '24 hours') as paid_24h,
      SUM(amount) FILTER (WHERE status = 'approved' AND processed_at >= NOW() - INTERVAL '24 hours') as total_paid_24h,
      COUNT(*) FILTER (WHERE status = 'pending') as still_pending
    FROM gram_claims
  `);
  const ps = payoutStats.rows[0];
  console.log(`\n--- Auto-Payout Stats (last 24h) ---`);
  console.log(`  ✅ Paid out: ${ps.paid_24h} claims = ${parseFloat(ps.total_paid_24h || 0).toFixed(4)} GRAM`);
  console.log(`  🟡 Still pending: ${ps.still_pending} claims`);

  // 5. Check treasury - how many TON paid out total
  const totalPaidRes = await pool.query(`
    SELECT COUNT(*) as count, SUM(amount) as total FROM gram_claims WHERE status = 'approved'
  `);
  const tp = totalPaidRes.rows[0];
  const totalTon = parseFloat(tp.total || 0);
  console.log(`\n--- Lifetime Treasury Spend ---`);
  console.log(`  Total GRAM claims approved: ${tp.count}`);
  console.log(`  Total GRAM paid (each claim = 0.02 TON equivalent): ${totalTon.toFixed(4)} GRAM`);
  console.log(`  If 1:1 with TON, that's ~${totalTon.toFixed(4)} TON sent to users`);

  await pool.end();
}

checkTreasury().catch(e => { console.error('Error:', e.message); pool.end(); });

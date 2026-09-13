require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  console.log('\n=== TREASURY LIQUIDATION ANALYSIS ===\n');

  // 1. Claims per day for last 7 days — how fast is money going out?
  const dailyRate = await pool.query(`
    SELECT 
      DATE(processed_at) as day,
      COUNT(*) as claims,
      SUM(amount) as ton_paid
    FROM gram_claims
    WHERE status = 'approved'
      AND processed_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(processed_at)
    ORDER BY day DESC
  `);
  console.log('--- Daily Payout Rate (last 7 days) ---');
  let totalWeekClaims = 0;
  for (const r of dailyRate.rows) {
    const ton = parseFloat(r.ton_paid).toFixed(4);
    totalWeekClaims += parseInt(r.claims);
    console.log(`  ${r.day} | ${r.claims} claims | ${ton} TON paid out`);
  }
  console.log(`  TOTAL this week: ${totalWeekClaims} claims`);

  // 2. Claims per hour today — detect acceleration
  const hourly = await pool.query(`
    SELECT 
      DATE_TRUNC('hour', processed_at) as hour,
      COUNT(*) as claims,
      SUM(amount) as ton_paid
    FROM gram_claims
    WHERE status = 'approved'
      AND processed_at >= NOW() - INTERVAL '24 hours'
    GROUP BY DATE_TRUNC('hour', processed_at)
    ORDER BY hour DESC
    LIMIT 24
  `);
  console.log('\n--- Hourly Payouts (last 24h) ---');
  for (const r of hourly.rows) {
    const ton = parseFloat(r.ton_paid).toFixed(4);
    const bar = '█'.repeat(parseInt(r.claims));
    console.log(`  ${new Date(r.hour).toISOString().slice(11,16)} UTC | ${r.claims} claims | ${ton} TON ${bar}`);
  }

  // 3. Any user claiming MORE than once? (should be impossible but check)
  const multiClaim = await pool.query(`
    SELECT telegram_id, COUNT(*) as claim_count, SUM(amount) as total_paid,
           MIN(requested_at) as first, MAX(requested_at) as last
    FROM gram_claims
    WHERE status = 'approved'
      AND requested_at >= NOW() - INTERVAL '24 hours'
    GROUP BY telegram_id
    HAVING COUNT(*) > 1
    ORDER BY claim_count DESC
  `);
  console.log('\n--- Users Who Claimed >1x in 24h (SHOULD BE ZERO) ---');
  if (multiClaim.rows.length === 0) {
    console.log('  ✅ None found — 24h claim lock working correctly');
  } else {
    console.log('  🚨 FRAUD DETECTED:');
    for (const r of multiClaim.rows) {
      console.log(`  TelegramID: ${r.telegram_id} | Claims: ${r.claim_count} | Total: ${r.total_paid} TON | First: ${r.first} | Last: ${r.last}`);
    }
  }

  // 4. Payout amounts — is anything paying MORE than 0.02?
  const amountCheck = await pool.query(`
    SELECT id, telegram_id, amount, tx_hash, processed_at
    FROM gram_claims
    WHERE status = 'approved'
      AND amount != 0.02
    ORDER BY processed_at DESC
    LIMIT 20
  `);
  console.log('\n--- Claims With NON-STANDARD Amount (should all be 0.02) ---');
  if (amountCheck.rows.length === 0) {
    console.log('  ✅ All claims are exactly 0.02 GRAM — no anomalies');
  } else {
    console.log('  🚨 ABNORMAL AMOUNTS FOUND:');
    for (const r of amountCheck.rows) {
      console.log(`  ID:${r.id} | TelegramID: ${r.telegram_id} | Amount: ${r.amount} | TxHash: ${r.tx_hash}`);
    }
  }

  // 5. Treasury burn rate projection
  const last24h = await pool.query(`
    SELECT COUNT(*) as claims, COALESCE(SUM(amount),0) as ton_paid
    FROM gram_claims
    WHERE status = 'approved'
      AND processed_at >= NOW() - INTERVAL '24 hours'
  `);
  const l = last24h.rows[0];
  const tonPerDay = parseFloat(l.ton_paid);
  const currentBalance = 0.285; // from admin panel
  const daysLeft = currentBalance / tonPerDay;
  console.log('\n--- Treasury Burn Rate ---');
  console.log(`  Last 24h: ${l.claims} claims = ${tonPerDay.toFixed(4)} TON paid`);
  console.log(`  Current balance (from admin panel): ~${currentBalance} TON`);
  console.log(`  At this rate: treasury runs out in ~${daysLeft.toFixed(1)} days`);
  console.log(`  Monthly cost at this rate: ~${(tonPerDay * 30).toFixed(2)} TON/month`);

  await pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });

// TASKY BANDWIDTH COST ANALYSIS
// Calculates estimated monthly MB from all known polling intervals

const polls = [
  // ─── ADMIN PANEL (only 1 admin user, but still costs bandwidth) ───
  { name: 'Admin Dashboard /stats',         intervalSec: 5,    estimatedKB: 3,   users: 1 },
  { name: 'Admin TaskReviews /tasks/pending', intervalSec: 5,  estimatedKB: 10,  users: 1 },
  { name: 'Admin LiveActivity /live-logs',  intervalSec: 5,    estimatedKB: 5,   users: 1 },
  { name: 'Admin Withdrawals /pending',     intervalSec: 5,    estimatedKB: 5,   users: 1 },
  { name: 'Admin GramClaims /pending',      intervalSec: 5,    estimatedKB: 10,  users: 1 },
  { name: 'Admin GramWatchers /watchers',   intervalSec: 15,   estimatedKB: 20,  users: 1 },
  { name: 'Admin Layout /badges',           intervalSec: 15,   estimatedKB: 2,   users: 1 },
  { name: 'Admin TreasurySystem /status',   intervalSec: 20,   estimatedKB: 3,   users: 1 },
  { name: 'Admin Broadcast /statuses',      intervalSec: 4,    estimatedKB: 2,   users: 1 },

  // ─── MINIAPP (multiplied by number of concurrent users) ───
  // BottomNav polls Gram status every 5 min per user — fine
  { name: 'Miniapp BottomNav /gram/status', intervalSec: 300,  estimatedKB: 2,   users: 100 },
  // ChannelVerification polls every 15s — only when modal is open
  { name: 'Miniapp ChannelVerification /verify', intervalSec: 15, estimatedKB: 1, users: 20 },
];

console.log('\n=== TASKY POLLING BANDWIDTH ANALYSIS ===\n');
console.log('Assuming admin panel is open 8h/day, miniapp users 24/7\n');

let totalMonthlyMB = 0;

for (const p of polls) {
  const hoursActive = p.users === 1 ? 8 : 24;
  const requestsPerHour = 3600 / p.intervalSec;
  const requestsPerMonth = requestsPerHour * hoursActive * 30;
  const monthlyMB = (requestsPerMonth * p.estimatedKB * p.users) / 1024;
  totalMonthlyMB += monthlyMB;
  const severity = monthlyMB > 100 ? '🔴' : monthlyMB > 20 ? '🟡' : '🟢';
  console.log(`${severity} ${p.name}`);
  console.log(`   Interval: ${p.intervalSec}s | ~${p.estimatedKB}KB/req | ${p.users} user(s) | Active: ${hoursActive}h/day`);
  console.log(`   → ~${monthlyMB.toFixed(1)} MB/month\n`);
}

console.log('─'.repeat(50));
console.log(`TOTAL from polling alone: ~${totalMonthlyMB.toFixed(0)} MB/month`);
console.log(`= ~${(totalMonthlyMB/1024).toFixed(2)} GB/month from admin/miniapp polling`);
console.log('\nNote: This does NOT include actual user-triggered API calls (checkins, tasks, etc.)');
console.log('The bot polling we just fixed was ~4500 MB/month alone.\n');

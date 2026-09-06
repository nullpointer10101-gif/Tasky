async function testEndpoints() {
  const BASE = 'https://tasky3.onrender.com';
  const tests = [
    { name: 'Root Mini App HTML', url: `${BASE}/` },
    { name: 'Admin Panel Login HTML', url: `${BASE}/admin/login` },
    { name: 'Tasks API', url: `${BASE}/api/tasks` },
    { name: 'Withdrawal Settings API', url: `${BASE}/api/withdrawal/settings` },
    { name: 'Swap Rates API', url: `${BASE}/api/swap/rates` },
    { name: 'Mining Levels API', url: `${BASE}/api/mining/levels` },
    { name: 'NFT Marketplace API', url: `${BASE}/api/nft/marketplace` },
    { name: 'Gram Status API', url: `${BASE}/api/gram/status/123456` },
    { name: 'Channel Status API', url: `${BASE}/api/users/channel-status?telegram_id=123456` },
  ];

  console.log('--- AUDITING LIVE SYSTEM ENDPOINTS ---');
  let passed = 0;
  for (const t of tests) {
    try {
      const res = await fetch(t.url);
      const isOk = res.ok;
      console.log(`[${isOk ? 'PASS' : 'FAIL'}] ${t.name} -> HTTP ${res.status}`);
      if (isOk) passed++;
    } catch (e) {
      console.log(`[FAIL] ${t.name} -> Error: ${e.message}`);
    }
  }

  console.log(`\nResults: ${passed}/${tests.length} tests passed successfully!`);
}
testEndpoints();

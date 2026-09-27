const fs = require('fs');
const vm = require('vm');

const adminHtmlPaths = [
  'D:\\antigravity\\HashBee\\backend\\public\\admin\\index.html',
  'D:\\antigravity\\HashBee\\backend\\public\\app\\admin\\index.html',
  'D:\\antigravity\\HashBee\\miniapp\\public\\admin\\index.html',
  'D:\\antigravity\\HashBee\\miniapp\\dist\\admin\\index.html'
];

for (const p of adminHtmlPaths) {
  if (!fs.existsSync(p)) continue;
  let html = fs.readFileSync(p, 'utf8');

  // Fix authHeaders extra braces
  html = html.replace(/function authHeaders\(\) \{[\s\S]*?async function handleLogin/, `function authHeaders() {
  const currentToken = token || localStorage.getItem('hb_admin_token') || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + currentToken
  };
}

async function handleLogin`);

  // Fix switchTab event issue
  html = html.replace(/function switchTab\(tabId\) \{[\s\S]*?if \(tabId === 'settings'\) loadSettings\(\);\n\}/, `function switchTab(tabId, el) {
  document.querySelectorAll('.nav-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
  ['campaigns', 'broadcast', 'users', 'withdrawals', 'settings'].forEach(t => {
    const tabEl = document.getElementById('tab-' + t);
    if (tabEl) tabEl.style.display = (t === tabId) ? 'block' : 'none';
  });
  if (el) {
    el.classList.add('active');
  } else if (typeof event !== 'undefined' && event && event.target) {
    event.target.classList.add('active');
  }

  if (tabId === 'campaigns') loadCampaigns();
  if (tabId === 'users') loadUsers();
  if (tabId === 'withdrawals') loadWithdrawals();
  if (tabId === 'settings') loadSettings();
}`);

  // Also make sure tab buttons pass 'this' to switchTab
  html = html.replace(/onclick="switchTab\('([^']+)'\)"/g, `onclick="switchTab('$1', this)"`);

  // Save
  fs.writeFileSync(p, html, 'utf8');

  // Validate script syntax
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (scriptMatch) {
    try {
      new vm.Script(scriptMatch[1]);
      console.log('✅', p, '-> VALID JAVASCRIPT!');
    } catch (e) {
      console.error('❌', p, '-> SYNTAX ERROR:', e.message);
    }
  }
}

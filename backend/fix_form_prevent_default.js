const fs = require('fs');

const adminHtmlPaths = [
  'D:\\antigravity\\HashBee\\backend\\public\\admin\\index.html',
  'D:\\antigravity\\HashBee\\backend\\public\\app\\admin\\index.html',
  'D:\\antigravity\\HashBee\\miniapp\\public\\admin\\index.html',
  'D:\\antigravity\\HashBee\\miniapp\\dist\\admin\\index.html'
];

for (const p of adminHtmlPaths) {
  if (!fs.existsSync(p)) continue;
  let html = fs.readFileSync(p, 'utf8');

  // Fix Login Form & Button
  html = html.replace(/<form onsubmit="handleLogin\(event\)">/g, '<form onsubmit="handleLogin(event); return false;">');
  html = html.replace(/<button type="submit" id="loginBtn"[^>]*>[\s\S]*?<\/button>/g, '<button type="button" id="loginBtn" onclick="handleLogin(event)" class="btn btn-gold" style="width:100%; justify-content:center; padding:14px; font-size:14px; margin-top:8px;">Login to Dashboard</button>');

  // Fix Campaign Modal Form & Button
  html = html.replace(/<form onsubmit="handleCreateCampaign\(event\)">/g, '<form onsubmit="handleCreateCampaign(event); return false;">');
  html = html.replace(/<button type="submit" id="createCampSubmitBtn"[^>]*>[\s\S]*?<\/button>/g, '<button type="button" id="createCampSubmitBtn" onclick="handleCreateCampaign(event)" class="btn btn-gold">Publish Live Now</button>');

  // Support Enter key on inputs
  html = html.replace(/<input type="text" id="loginId"[^>]*>/g, '<input type="text" id="loginId" class="form-input" required placeholder="Enter username or email" autocomplete="off" onkeydown="if(event.key===\'Enter\')handleLogin(event)">');
  html = html.replace(/<input type="password" id="loginPw"[^>]*>/g, '<input type="password" id="loginPw" class="form-input" required placeholder="Enter password" autocomplete="new-password" onkeydown="if(event.key===\'Enter\')handleLogin(event)">');

  // Robust handleLogin with preventDefault & stopPropagation
  const robustHandleLogin = `async function handleLogin(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  const loginId = (document.getElementById('loginId')?.value || '').trim();
  const password = (document.getElementById('loginPw')?.value || '').trim();
  let apiBaseInput = (document.getElementById('apiBase')?.value || '').trim();
  API_URL = apiBaseInput ? apiBaseInput.replace(/\\/$/, '') : 'https://hashbee.onrender.com';
  localStorage.setItem('hb_api_url', API_URL);

  if (!loginId || !password) {
    showToast('Please enter both username/email and password', true);
    return false;
  }

  const btn = document.getElementById('loginBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Signing in...';
  }

  try {
    const activeUrl = API_URL || 'https://hashbee.onrender.com';
    console.log('Attempting login to:', activeUrl + '/api/admin/login');
    const res = await fetch(activeUrl + '/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: loginId, username: loginId, email: loginId, password: password })
    });
    const data = await res.json().catch(() => ({}));
    const authToken = data.token || data.data?.token;
    if (!res.ok || !authToken) {
      throw new Error(data.error || 'Invalid credentials');
    }
    token = authToken;
    localStorage.setItem('hb_admin_token', token);
    showToast('🎉 Login successful!');
    initDashboard(data.admin || data.data?.admin || { email: loginId });
  } catch (err) {
    console.error('Login error:', err);
    showToast('Login Failed: ' + (err.message || 'Invalid credentials'), true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Login to Dashboard';
    }
  }
  return false;
}`;

  html = html.replace(/async function handleLogin\(e\) \{[\s\S]*?\n\}/, robustHandleLogin);

  fs.writeFileSync(p, html, 'utf8');
  console.log('Fixed form submission in:', p);
}

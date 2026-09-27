const fs = require('fs');

// 1. Update Go admin_handler.go login query
const handlerPath = 'D:\\antigravity\\HashBee\\backend\\internal\\handlers\\admin_handler.go';
if (fs.existsSync(handlerPath)) {
  let goCode = fs.readFileSync(handlerPath, 'utf8');
  
  const oldLoginCheck = `err := h.db.QueryRow(c.Request.Context(),
		\`SELECT id, email, password_hash, role, status FROM admin_users WHERE (LOWER(email) = LOWER($1)) AND status = 'active' LIMIT 1\`,
		identifier).Scan(&admin.ID, &admin.Email, &admin.PasswordHash, &admin.Role, &admin.Status)`;
  
  const newLoginCheck = `err := h.db.QueryRow(c.Request.Context(),
		\`SELECT id, email, password_hash, role, status FROM admin_users WHERE (LOWER(email) = LOWER($1) OR (LOWER(email) = 'meela' AND LOWER($1) IN ('admin', 'meela', 'admin@hashbee.io'))) AND status = 'active' LIMIT 1\`,
		identifier).Scan(&admin.ID, &admin.Email, &admin.PasswordHash, &admin.Role, &admin.Status)`;
  
  if (goCode.includes(oldLoginCheck)) {
    goCode = goCode.replace(oldLoginCheck, newLoginCheck);
    fs.writeFileSync(handlerPath, goCode, 'utf8');
    console.log('Updated admin_handler.go login query');
  }
}

// 2. Update Admin HTML files
const adminHtmlPaths = [
  'D:\\antigravity\\HashBee\\backend\\public\\admin\\index.html',
  'D:\\antigravity\\HashBee\\backend\\public\\app\\admin\\index.html',
  'D:\\antigravity\\HashBee\\miniapp\\public\\admin\\index.html',
  'D:\\antigravity\\HashBee\\miniapp\\dist\\admin\\index.html'
];

for (const p of adminHtmlPaths) {
  if (!fs.existsSync(p)) continue;
  let html = fs.readFileSync(p, 'utf8');

  // Foolproof handleLogin
  const newHandleLogin = `async function handleLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  const loginId = (document.getElementById('loginId')?.value || '').trim();
  const password = (document.getElementById('loginPw')?.value || '').trim();
  let apiBaseInput = (document.getElementById('apiBase')?.value || '').trim();
  API_URL = apiBaseInput ? apiBaseInput.replace(/\\/$/, '') : 'https://hashbee.onrender.com';
  localStorage.setItem('hb_api_url', API_URL);

  if (!loginId || !password) {
    showToast('Please enter both username/email and password', true);
    return;
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
}`;

  html = html.replace(/async function handleLogin\(e\) \{[\s\S]*?\n\}/, newHandleLogin);

  // Add onclick to loginBtn
  html = html.replace(/<button type="submit" id="loginBtn"[^>]*>[\s\S]*?<\/button>/, '<button type="submit" id="loginBtn" onclick="handleLogin(event)" class="btn btn-gold" style="width:100%; justify-content:center; padding:14px; font-size:14px; margin-top:8px;">Login to Dashboard</button>');

  fs.writeFileSync(p, html, 'utf8');
  console.log('Updated login in:', p);
}

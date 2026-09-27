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

  // 1. Dynamic authHeaders & safe API_URL
  html = html.replace(/let API_URL = [^;]*;/, `let API_URL = localStorage.getItem('hb_api_url') || 'https://hashbee.onrender.com';\nif (API_URL.includes('tasky')) { API_URL = 'https://hashbee.onrender.com'; localStorage.setItem('hb_api_url', API_URL); }`);
  
  html = html.replace(/function authHeaders\(\) \{[\s\S]*?\}/, `function authHeaders() {
  const currentToken = token || localStorage.getItem('hb_admin_token') || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + currentToken
  };
}`);

  // 2. Enhanced handleCreateCampaign with clear feedback & fail-safes
  const newHandleCreate = `async function handleCreateCampaign(e) {
  if (e && e.preventDefault) e.preventDefault();
  const title = (document.getElementById('newCampTitle')?.value || '').trim();
  const target = (document.getElementById('newCampTarget')?.value || '').trim();
  const type = document.getElementById('newCampType')?.value || 'channel';
  const total_completions = parseInt(document.getElementById('newCampCompletions')?.value) || 100;
  const reward_bp = parseFloat(document.getElementById('newCampReward')?.value) || 0.1;

  if (!title || !target) {
    showToast('Please enter both Title and Target URL', true);
    return;
  }

  const btn = document.getElementById('createCampSubmitBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Publishing...';
  }

  try {
    const activeUrl = API_URL || 'https://hashbee.onrender.com';
    console.log('Publishing campaign to:', activeUrl + '/api/admin/campaigns');
    const res = await fetch(activeUrl + '/api/admin/campaigns', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title, target, type, total_completions, reward_bp })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) {
        showToast('Session expired. Please log in again.', true);
        logout();
        return;
      }
      throw new Error(data.error || 'Server error ' + res.status);
    }
    showToast('🎉 Campaign created and published live!');
    closeModal('createCampModal');
    // Reset form
    document.getElementById('newCampTitle').value = '';
    document.getElementById('newCampTarget').value = '';
    loadCampaigns();
  } catch (err) {
    console.error('Create campaign error:', err);
    showToast('Error: ' + (err.message || 'Network error'), true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Publish Live Now';
    }
  }
}`;

  html = html.replace(/async function handleCreateCampaign\(e\) \{[\s\S]*?\n\}/, newHandleCreate);

  // 3. Ensure button has explicit onclick as fallback
  html = html.replace(/<button type="submit" id="createCampSubmitBtn"[^>]*>Publish Live Now<\/button>/, '<button type="submit" id="createCampSubmitBtn" onclick="handleCreateCampaign(event)" class="btn btn-gold">Publish Live Now</button>');

  // 4. Toast z-index higher than modal
  html = html.replace(/#toast \{[^}]*\}/, '#toast { position: fixed; top: 24px; right: 24px; padding: 14px 22px; border-radius: 12px; font-size: 14px; font-weight: 800; display: none; z-index: 99999; box-shadow: 0 10px 30px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.2); }');

  fs.writeFileSync(p, html, 'utf8');
  console.log('Enhanced admin portal:', p);
}

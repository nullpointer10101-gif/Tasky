const fs = require('fs');
const path = require('path');

const hashbeeDir = 'd:/antigravity/HashBee';

// 1. Update backend/internal/handlers/admin_handler.go
const handlerPath = path.join(hashbeeDir, 'backend/internal/handlers/admin_handler.go');
let handlerCode = fs.readFileSync(handlerPath, 'utf8');

if (!handlerCode.includes('OnlineUsers')) {
  handlerCode = handlerCode.replace(
    'TotalUsers       int     `json:"total_users"`',
    'TotalUsers       int     `json:"total_users"`\n\t\tOnlineUsers      int     `json:"online_users"`'
  );
  handlerCode = handlerCode.replace(
    'h.db.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&stats.TotalUsers)',
    'h.db.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&stats.TotalUsers)\n\th.db.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE updated_at >= NOW() - INTERVAL \'15 minutes\'`).Scan(&stats.OnlineUsers)'
  );
  fs.writeFileSync(handlerPath, handlerCode, 'utf8');
  console.log('✅ Updated admin_handler.go with OnlineUsers');
} else {
  console.log('ℹ️ admin_handler.go already contains OnlineUsers');
}

// 2. HTML Files to update
const htmlFiles = [
  path.join(hashbeeDir, 'backend/public/admin/index.html'),
  path.join(hashbeeDir, 'miniapp/public/admin/index.html'),
  path.join(hashbeeDir, 'backend/public/app/admin/index.html')
];

const onlineCardHtml = `      <div class="stat-card">
        <div class="stat-title" style="display:flex; align-items:center; gap:6px;">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981;"></span>
          Online Users
        </div>
        <div class="stat-val font-mono" id="statOnlineUsers" style="color:#10b981;">-</div>
        <div class="stat-accent" style="background:#10b981;"></div>
      </div>`;

htmlFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log('File not found:', file);
    return;
  }
  let html = fs.readFileSync(file, 'utf8');

  // Add card if not present
  if (!html.includes('id="statOnlineUsers"')) {
    const target = `<div class="stat-card">\n        <div class="stat-title">Total Users</div>\n        <div class="stat-val" id="statUsers">-</div>\n        <div class="stat-accent" style="background:#f59e0b;"></div>\n      </div>`;
    if (html.includes(target)) {
      html = html.replace(target, target + '\n' + onlineCardHtml);
    } else {
      // Fallback replace after statUsers card
      html = html.replace(/(<div class="stat-val" id="statUsers">[\s\S]*?<\/div>\s*<\/div>)/, '$1\n' + onlineCardHtml);
    }
  }

  // Update loadStats function
  if (!html.includes("document.getElementById('statOnlineUsers')")) {
    html = html.replace(
      "document.getElementById('statUsers').innerText = data.total_users || 0;",
      "document.getElementById('statUsers').innerText = data.total_users || 0;\n    if (document.getElementById('statOnlineUsers')) {\n      document.getElementById('statOnlineUsers').innerText = data.online_users !== undefined ? data.online_users : (data.dau || 0);\n    }"
    );
  }

  // Add auto-refresh polling if not present
  if (!html.includes('setInterval(loadStats')) {
    html = html.replace(
      'loadStats();',
      'loadStats();\n  setInterval(() => { if (token) loadStats(); }, 15000);'
    );
  }

  fs.writeFileSync(file, html, 'utf8');
  console.log(`✅ Updated ${file}`);
});

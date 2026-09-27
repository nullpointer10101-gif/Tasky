const fs = require('fs');
const files = [
  'd:/antigravity/HashBee/miniapp/public/admin/index.html',
  'd:/antigravity/HashBee/backend/public/admin/index.html',
  'd:/antigravity/HashBee/backend/public/app/admin/index.html',
];
files.forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/<tbody id="withdrawalsBody">\s*<tr><td colspan="8"/g, '<tbody id="withdrawalsBody">\n            <tr><td colspan="7"');
    c = c.replace(`tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:30px;">Loading...</td></tr>';`, `tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">Loading...</td></tr>';`);
    c = c.replace(`tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#ef4444;">Error: ' + err.message + '</td></tr>';`, `tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#ef4444;">Error: ' + err.message + '</td></tr>';`);
    fs.writeFileSync(f, c, 'utf8');
    console.log('Fixed withdrawals colspan in', f);
  }
});

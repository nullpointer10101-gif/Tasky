const fs = require('fs');
const path = require('path');

// 1. Update HashBee admin Login.tsx
const loginTsxPath = 'D:\\antigravity\\HashBee\\admin\\src\\pages\\Login.tsx';
if (fs.existsSync(loginTsxPath)) {
  let content = fs.readFileSync(loginTsxPath, 'utf8');
  content = content.replace("const [username, setUsername] = useState('admin')", "const [username, setUsername] = useState('')");
  content = content.replace(/\/\/ Dev mode fallback[\s\S]*?toast\.error\(err\?\.response\?\.data\?\.error \|\| 'Invalid admin credentials'\)/, "toast.error(err?.response?.data?.error || 'Invalid admin credentials')");
  fs.writeFileSync(loginTsxPath, content, 'utf8');
  console.log('Updated HashBee admin Login.tsx successfully');
}

// 2. Ensure all HTML admin files have no values, empty placeholders, autocomplete=off/new-password
const adminHtmlPaths = [
  'D:\\antigravity\\HashBee\\backend\\public\\admin\\index.html',
  'D:\\antigravity\\HashBee\\backend\\public\\app\\admin\\index.html',
  'D:\\antigravity\\HashBee\\miniapp\\public\\admin\\index.html',
  'D:\\antigravity\\HashBee\\miniapp\\dist\\admin\\index.html'
];

for (const p of adminHtmlPaths) {
  if (fs.existsSync(p)) {
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace(/<input type="text" id="loginId"[^>]*>/g, '<input type="text" id="loginId" class="form-input" required placeholder="Enter username or email" autocomplete="off">');
    html = html.replace(/<input type="password" id="loginPw"[^>]*>/g, '<input type="password" id="loginPw" class="form-input" required placeholder="Enter password" autocomplete="new-password">');
    fs.writeFileSync(p, html, 'utf8');
    console.log('Sanitized:', p);
  }
}

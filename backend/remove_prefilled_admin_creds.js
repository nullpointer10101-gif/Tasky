const fs = require('fs');

console.log('=== Remove all prefilled admin credentials from HTML files ===');
const htmlPaths = [
  'd:/antigravity/HashBee/backend/public/admin/index.html',
  'd:/antigravity/HashBee/miniapp/public/admin/index.html',
  'd:/antigravity/HashBee/backend/public/app/admin/index.html'
];

htmlPaths.forEach(hPath => {
  if (!fs.existsSync(hPath)) return;
  let html = fs.readFileSync(hPath, 'utf8');

  // Replace username input
  html = html.replace(
    /<input type="text" id="loginId" class="form-input"[^>]*>/g,
    '<input type="text" id="loginId" class="form-input" required placeholder="Enter username or email" autocomplete="off">'
  );

  // Replace password input
  html = html.replace(
    /<input type="password" id="loginPw" class="form-input"[^>]*>/g,
    '<input type="password" id="loginPw" class="form-input" required placeholder="Enter password" autocomplete="new-password">'
  );

  fs.writeFileSync(hPath, html, 'utf8');
  console.log('✅ Cleaned input fields in:', hPath);
});

console.log('Done!');

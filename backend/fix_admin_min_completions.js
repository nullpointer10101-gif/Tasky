const fs = require('fs');

const adminHtmlPaths = [
  'D:\\antigravity\\HashBee\\backend\\public\\admin\\index.html',
  'D:\\antigravity\\HashBee\\backend\\public\\app\\admin\\index.html',
  'D:\\antigravity\\HashBee\\miniapp\\public\\admin\\index.html',
  'D:\\antigravity\\HashBee\\miniapp\\dist\\admin\\index.html'
];

for (const p of adminHtmlPaths) {
  if (fs.existsSync(p)) {
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace(/<input type="number" id="newCampCompletions"[^>]*>/g, '<input type="number" id="newCampCompletions" class="form-input" value="100" min="1" required>');
    fs.writeFileSync(p, html, 'utf8');
    console.log('Updated min to 1 in:', p);
  }
}

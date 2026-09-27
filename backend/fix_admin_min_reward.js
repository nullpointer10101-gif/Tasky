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
    html = html.replace(/<input type="number" id="newCampReward"[^>]*>/g, '<input type="number" id="newCampReward" class="form-input" value="0.1" step="0.01" min="0.01" required>');
    fs.writeFileSync(p, html, 'utf8');
    console.log('Updated reward min to 0.01 in:', p);
  }
}

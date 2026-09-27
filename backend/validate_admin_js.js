const fs = require('fs');
const vm = require('vm');

const htmlPath = 'D:\\antigravity\\HashBee\\backend\\public\\admin\\index.html';
const html = fs.readFileSync(htmlPath, 'utf8');

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('No script tag found!');
  process.exit(1);
}

const jsCode = scriptMatch[1];
try {
  new vm.Script(jsCode);
  console.log('✅ JavaScript syntax is 100% valid!');
} catch (err) {
  console.error('❌ JavaScript syntax error:', err.message);
}

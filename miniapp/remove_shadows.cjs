const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let changed = false;
      const regex1 = /shadow-\[.*?\]/g;
      const regex2 = /drop-shadow-\[.*?\]/g;
      const regex3 = /drop-shadow-[a-z]+/g;
      
      if (regex1.test(content) || regex2.test(content) || regex3.test(content)) {
        content = content.replace(regex1, '');
        content = content.replace(regex2, '');
        content = content.replace(regex3, '');
        changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed heavy shadows in:', fullPath);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
console.log('Done.');

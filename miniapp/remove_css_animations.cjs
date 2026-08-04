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
      const regex = /animate-[a-zA-Z0-9_\[\]\-]+/g;
      if (regex.test(content)) {
        content = content.replace(regex, '');
        changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed CSS animations in:', fullPath);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
console.log('Done.');

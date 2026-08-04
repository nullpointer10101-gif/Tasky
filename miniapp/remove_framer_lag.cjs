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
      if (content.includes('containerVariants')) {
        content = content.replace(/variants=\{containerVariants\}/g, '');
        changed = true;
      }
      if (content.includes('itemVariants')) {
        content = content.replace(/variants=\{itemVariants\}/g, '');
        changed = true;
      }
      if (content.includes('initial="initial"')) {
        content = content.replace(/initial="initial"/g, '');
        changed = true;
      }
      if (content.includes('animate="animate"')) {
        content = content.replace(/animate="animate"/g, '');
        changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed framer motion in:', fullPath);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
console.log('Done.');

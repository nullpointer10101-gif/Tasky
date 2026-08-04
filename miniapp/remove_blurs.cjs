const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let lines = fs.readFileSync(fullPath, 'utf8').split('\n');
      let changed = false;
      let newLines = [];
      for (let line of lines) {
        // If the line is just a decorative glowing background div, skip it
        if (line.includes('<div') && line.includes('absolute') && line.includes('bg-') && line.includes('rounded-full') && line.match(/blur-[a-z0-9]+/)) {
          changed = true;
          continue;
        }
        
        // Remove backdrop-blur and other blurs from inline classes
        if (line.match(/backdrop-blur-[a-z0-9]+/)) {
          line = line.replace(/backdrop-blur-[a-z0-9]+/g, '');
          changed = true;
        }
        if (line.match(/mix-blend-[a-z0-9]+/)) {
          line = line.replace(/mix-blend-[a-z0-9]+/g, '');
          changed = true;
        }
        
        newLines.push(line);
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, newLines.join('\n'));
        console.log('Fixed blurs in:', fullPath);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
console.log('Done.');

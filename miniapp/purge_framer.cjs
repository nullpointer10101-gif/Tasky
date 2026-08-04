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
      
      // Remove imports
      if (content.includes('framer-motion')) {
        content = content.replace(/import\s+{.*?}\s+from\s+['"]framer-motion['"];?\n?/g, '');
        changed = true;
      }
      
      // Remove AnimatePresence wrapper
      if (content.includes('<AnimatePresence>')) {
        content = content.replace(/<AnimatePresence>/g, '');
        content = content.replace(/<\/AnimatePresence>/g, '');
        changed = true;
      }
      if (content.includes('<AnimatePresence mode="wait">')) {
        content = content.replace(/<AnimatePresence mode="wait">/g, '');
        content = content.replace(/<\/AnimatePresence>/g, '');
        changed = true;
      }
      
      // Replace motion.div and motion.button
      if (content.includes('<motion.')) {
        content = content.replace(/<motion\.([a-zA-Z]+)/g, '<$1');
        content = content.replace(/<\/motion\.([a-zA-Z]+)>/g, '</$1>');
        
        // Remove whileTap
        content = content.replace(/whileTap={{.*?}}/g, ''); 
        
        // Remove layoutId, initial, animate, exit, variants
        content = content.replace(/layoutId=['"].*?['"]/g, '');
        content = content.replace(/initial=\{.*?\}/g, '');
        content = content.replace(/animate=\{.*?\}/g, '');
        content = content.replace(/exit=\{.*?\}/g, '');
        content = content.replace(/variants=\{.*?\}/g, '');
        content = content.replace(/transition=\{.*?\}/g, '');
        
        changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Purged framer-motion from:', fullPath);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
console.log('Done.');

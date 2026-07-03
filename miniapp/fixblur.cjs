const fs = require('fs');
const path = require('path');
function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.jsx')) {
      let c = fs.readFileSync(p, 'utf8');
      const orig = c;
      c = c.replace(/<div className=[^>]*blur-(xl|2xl|3xl)[^>]*>\s*<\/div>/g, '');
      c = c.replace(/<div className=[^>]*blur-(xl|2xl|3xl)[^>]*\/>/g, '');
      if (c !== orig) {
        fs.writeFileSync(p, c);
        console.log('Fixed ' + p);
      }
    }
  });
}
walk('src');

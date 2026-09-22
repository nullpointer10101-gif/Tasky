const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function checkDir(dir) {
    fs.readdirSync(dir).forEach(f => {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) {
            if (!p.includes('node_modules') && !p.includes('public')) {
                checkDir(p);
            }
        } else if (p.endsWith('.js')) {
            try {
                execSync(`node -c "${p}"`);
            } catch(e) {
                console.error('❌ SYNTAX ERROR IN:', p);
                process.exit(1);
            }
        }
    });
}

checkDir('backend');
console.log('✅ ALL BACKEND FILES PASSED SYNTAX CHECK!');

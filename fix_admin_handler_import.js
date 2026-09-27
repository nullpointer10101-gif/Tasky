const fs = require('fs');
const path = require('path');

const hashbeeDir = 'd:/antigravity/HashBee';
const handlerPath = path.join(hashbeeDir, 'backend/internal/handlers/admin_handler.go');

let code = fs.readFileSync(handlerPath, 'utf8');

if (!code.includes('"hashbee/internal/bot"')) {
  code = code.replace(
    '"hashbee/internal/config"',
    '"hashbee/internal/bot"\n\t"hashbee/internal/config"'
  );
  fs.writeFileSync(handlerPath, code, 'utf8');
  console.log('✅ Added "hashbee/internal/bot" import to admin_handler.go');
} else {
  console.log('ℹ️ Import already exists');
}

const fs = require('fs');
const path = require('path');

const hashbeeDir = 'd:/antigravity/HashBee';
const misSvcPath = path.join(hashbeeDir, 'backend/internal/services/mission_service.go');

let code = fs.readFileSync(misSvcPath, 'utf8');

const targetStr = `	// Real-time Telegram verification: strictly enforced on official channel (AlphaDropDaily)
	if (m.Type == models.MissionTypeChannel || m.Type == models.MissionTypeGroup) && s.verifier != nil {
		channel := extractTelegramChat(m.Target)`;

const replacementStr = `	// Real-time Telegram verification: strictly enforced on official channel (AlphaDropDaily)
	if (m.Type == models.MissionTypeChannel || m.Type == models.MissionTypeGroup) && s.verifier != nil && m.Target != nil {
		channel := extractTelegramChat(*m.Target)`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync(misSvcPath, code, 'utf8');
  console.log('✅ Fixed m.Target pointer dereference in mission_service.go');
} else {
  console.log('ℹ️ Target string not found in mission_service.go');
}

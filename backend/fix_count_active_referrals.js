const fs = require('fs');
const path = require('path');

const hashbeeDir = 'd:/antigravity/HashBee';
const refSvcPath = path.join(hashbeeDir, 'backend/internal/services/referral_service.go');

let code = fs.readFileSync(refSvcPath, 'utf8');

if (code.includes("SELECT COUNT(*) FROM referrals WHERE referrer_id = $1 AND level = 1`")) {
  code = code.replace(
    "SELECT COUNT(*) FROM referrals WHERE referrer_id = $1 AND level = 1`",
    "SELECT COUNT(*) FROM referrals WHERE referrer_id = $1 AND level = 1 AND status = 'active'`"
  );
  fs.writeFileSync(refSvcPath, code, 'utf8');
  console.log("✅ Fixed CountActiveReferrals to require status = 'active'!");
} else {
  console.log("ℹ️ Already includes active check or pattern not found.");
}

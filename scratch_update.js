const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, 'backend', 'routes', 'users.js');
let usersCode = fs.readFileSync(usersPath, 'utf8');

usersCode = usersCode.replace(
    /'SELECT status, claimed_at, rejection_reason FROM special_offer_claims WHERE telegram_id = \$1'/g,
    "'SELECT status, claimed_at, rejection_reason FROM special_offer_claims WHERE telegram_id = $1 AND offer_id = ''invite_20_get_20k_v2'''"
);

usersCode = usersCode.replace(
    /'SELECT id, status FROM special_offer_claims WHERE telegram_id = \$1'/g,
    "'SELECT id, status FROM special_offer_claims WHERE telegram_id = $1 AND offer_id = ''invite_20_get_20k_v2'''"
);

usersCode = usersCode.replace(
    /VALUES \(\$1, 'invite_20_get_20k', 'pending', \$2, NOW\(\)\)/g,
    "VALUES ($1, 'invite_20_get_20k_v2', 'pending', $2, NOW())"
);

fs.writeFileSync(usersPath, usersCode, 'utf8');
console.log("Updated users.js successfully.");

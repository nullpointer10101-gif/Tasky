const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, 'backend', 'routes', 'users.js');
let usersCode = fs.readFileSync(usersPath, 'utf8');

usersCode = usersCode.replace(
    /offer_id = ''invite_20_get_20k_v2'''/g,
    "offer_id = \\'invite_20_get_20k_v2\\''"
);

fs.writeFileSync(usersPath, usersCode, 'utf8');
console.log("Fixed syntax error in users.js");

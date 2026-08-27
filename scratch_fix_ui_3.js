const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'miniapp', 'src', 'components', 'SpecialOfferPopup.jsx');
let code = fs.readFileSync(filePath, 'utf8');
code = code.replace('                    </div>            </div>', '                    </div>');
fs.writeFileSync(filePath, code, 'utf8');
console.log("Fixed duplicate div.");

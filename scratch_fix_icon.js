const fs = require('fs');
const filePath = 'd:\\antigravity\\Tasky\\miniapp\\src\\components\\SpecialOfferPopup.jsx';
let code = fs.readFileSync(filePath, 'utf8');

const startStr = 'className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"';
const startIdx = code.indexOf(startStr);
if (startIdx !== -1) {
   const endIdx = code.indexOf("</motion.div>", startIdx);
   const newText = `className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"\n                      style={{ background: 'linear-gradient(135deg, #7c3aed, #f59e0b)' }}>🎁`;
   code = code.substring(0, startIdx) + newText + code.substring(endIdx);
   fs.writeFileSync(filePath, code, 'utf8');
   console.log("Fixed icon successfully!");
} else {
   console.log("Could not find the target string.");
}

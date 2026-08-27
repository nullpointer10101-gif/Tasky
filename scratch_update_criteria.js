const fs = require('fs');

// 1. Update Backend
const backendPath = 'd:\\antigravity\\Tasky\\backend\\routes\\users.js';
let backendCode = fs.readFileSync(backendPath, 'utf8');
backendCode = backendCode.replace('if (validReferrals < 20) {', 'if (validReferrals < 10) {');
fs.writeFileSync(backendPath, backendCode, 'utf8');
console.log('Updated backend.');

// 2. Update Frontend
const frontendPath = 'd:\\antigravity\\Tasky\\miniapp\\src\\components\\SpecialOfferPopup.jsx';
let frontendCode = fs.readFileSync(frontendPath, 'utf8');
frontendCode = frontendCode.replace('const REQUIRED_REFERRALS = 20;', 'const REQUIRED_REFERRALS = 10;');
frontendCode = frontendCode.replace('Hit 20 valid friends', 'Hit 10 valid friends');
frontendCode = frontendCode.replace('Reached 20 friends!', 'Reached 10 friends!');
fs.writeFileSync(frontendPath, frontendCode, 'utf8');
console.log('Updated frontend.');

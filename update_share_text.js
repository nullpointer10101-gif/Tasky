const fs = require('fs');

// 1. Update miniapp/src/pages/Referral.jsx
let refCode = fs.readFileSync('miniapp/src/pages/Referral.jsx', 'utf8');

const oldShareText1 = "`Join Tasky and earn crypto rewards! Use my link: ${refData.referral_link}`";
const newShareText1 = "`🚨 Claim your free USDT and crypto rewards on Tasky! Tap here to start earning instantly! 💸 Use my link: ${refData.referral_link}`";

const oldShareText2 = "`https://t.me/share/url?url=${encodeURIComponent(refData.referral_link)}&text=${encodeURIComponent('Join me on Tasky!')}`";
const newShareText2 = "`https://t.me/share/url?url=${encodeURIComponent(refData.referral_link)}&text=${encodeURIComponent('🚨 Claim your free USDT and crypto rewards on Tasky! Tap here to start earning instantly! 💸')}`";

refCode = refCode.replace(oldShareText1, newShareText1);
refCode = refCode.replace(oldShareText2, newShareText2);

fs.writeFileSync('miniapp/src/pages/Referral.jsx', refCode);

// 2. Update backend/bot.js
let botCode = fs.readFileSync('backend/bot.js', 'utf8');

const oldBotShareText = "Join%20Tasky%20and%20earn%20crypto!";
const newBotShareText = encodeURIComponent("🚨 Claim your free USDT and crypto rewards on Tasky! Tap here to start earning instantly! 💸");

botCode = botCode.replace(oldBotShareText, newBotShareText);
botCode = botCode.replace(oldBotShareText, newBotShareText); // just in case it's there twice

fs.writeFileSync('backend/bot.js', botCode);

console.log("Updated share text successfully!");

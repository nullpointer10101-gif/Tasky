const fs = require('fs');

// 1. Update miniapp/src/pages/Referral.jsx
let refCode = fs.readFileSync('miniapp/src/pages/Referral.jsx', 'utf8');

const oldShareText1 = "`🚨 Claim your free USDT and crypto rewards on Tasky! Tap here to start earning instantly! 💸 Use my link: ${refData.referral_link}`";
const newShareText1 = "`🚨 *Claim your free USDT and crypto rewards on Tasky!* 💸\\n\\n⚡️ Tap the link below to start earning instantly and build your passive income! 👇\\n\\n${refData.referral_link}`";

const oldShareText2 = "`https://t.me/share/url?url=${encodeURIComponent(refData.referral_link)}&text=${encodeURIComponent('🚨 Claim your free USDT and crypto rewards on Tasky! Tap here to start earning instantly! 💸')}`";
const newShareText2 = "`https://t.me/share/url?url=${encodeURIComponent(refData.referral_link)}&text=${encodeURIComponent('🚨 *Claim your free USDT and crypto rewards on Tasky!* 💸\\n\\n⚡️ Tap the link below to start earning instantly and build your passive income! 👇\\n\\n')}`";

refCode = refCode.replace(oldShareText1, newShareText1);
refCode = refCode.replace(oldShareText2, newShareText2);

fs.writeFileSync('miniapp/src/pages/Referral.jsx', refCode);

// 2. Update backend/bot.js
let botCode = fs.readFileSync('backend/bot.js', 'utf8');

const oldBotShareText = encodeURIComponent("🚨 Claim your free USDT and crypto rewards on Tasky! Tap here to start earning instantly! 💸");
const newBotShareText = encodeURIComponent("🚨 *Claim your free USDT and crypto rewards on Tasky!* 💸\n\n⚡️ Tap the link below to start earning instantly and build your passive income! 👇\n\n");

botCode = botCode.replace(oldBotShareText, newBotShareText);
botCode = botCode.replace(oldBotShareText, newBotShareText); 

fs.writeFileSync('backend/bot.js', botCode);

console.log("Updated share text with spacing and emojis successfully!");

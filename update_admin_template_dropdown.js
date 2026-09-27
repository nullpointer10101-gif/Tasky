const fs = require('fs');
const path = require('path');

const hashbeeDir = 'd:/antigravity/HashBee';

const htmlFiles = [
  path.join(hashbeeDir, 'backend/public/admin/index.html'),
  path.join(hashbeeDir, 'miniapp/public/admin/index.html'),
  path.join(hashbeeDir, 'backend/public/app/admin/index.html')
];

const newSelectDropdown = `<select id="broadcastTemplate" class="form-input" onchange="applyTemplate(this.value)">
              <option value="custom">✍️ Custom Message</option>
              <option value="personalized_buzz">👤 Personalized VIP (Hey {name})</option>
              <option value="viral_20k">🚀 20,000+ Users Record Celebration</option>
              <option value="mining_boost">⛏️ Double Mining Rate Hype</option>
              <option value="ghs_drop">🎁 Free 10 GHS Power Gift</option>
              <option value="tasks_drop">🔥 High-Reward Missions Alert</option>
              <option value="withdraw_alert">💸 Instant GRAM Withdrawals Live</option>
            </select>`;

const newHypeTemplates = `const HYPE_TEMPLATES = {
  personalized_buzz: {
    msg: \`👋 Hey {name}, your Hive is buzzing! 🐝⚡

⛏️ Your mining rig has accumulated unclaimed Honey! Don't let your honeycomb capacity cap out.

💰 *What you can do right now:*
⚡ Collect your passive Honey earnings
🎁 Claim free GHS bonuses from your referrals
📢 Launch a Boost Campaign to get real members for your Telegram channel/bot at dirt-cheap launch rates!

👇 Tap below to harvest your rewards & boost your power:\`,
    btn: '🐝 Open HashBee & Collect Now 🚀'
  },
  viral_20k: {
    msg: \`🚀 *20,000+ USERS ON DAY 1! THE HIVE IS ON FIRE!* 🔥

We just shattered all records with *20,000+ active miners*! 🐝⚡

💰 *Invite Friends* ➔ Earn Free GH/s Power & Boost 24/7 Mining!
📢 *Promote Your Project* ➔ Get real Telegram members for your Bots & Channels at dirt-cheap launch rates!

👇 *Tap below to mine, invite & promote now!*\`,
    btn: '🐝 Open App & Boost Now 🚀'
  },
  mining_boost: {
    msg: \`🚀 *DOUBLE YOUR MINING POWER TODAY!*

⛏️ We have supercharged bee extraction rates across all hives! 
Don't leave your honeycombs idle.

💰 Tap the button below to start mining & stack GRAM automatically!\`,
    btn: '🐝 Open HashBee & Mine'
  },
  ghs_drop: {
    msg: \`🎁 *FREE BONUS GHS POWER DROP!*

⚡ A special boost has been unlocked for your account.
Collect active Honey and invite friends to multiply your earnings 24/7!

👇 Claim your bonus in the app now:\`,
    btn: '🎁 Claim Free GHS Power'
  },
  tasks_drop: {
    msg: \`🔥 *NEW SPONSORED TASKS ARE LIVE!*

⭐ Complete new high-reward partner channels and bot missions to earn instant +0.1 to +5.0 GHS Power!

👉 Tap below to complete tasks and boost your speed:\`,
    btn: '⭐ Complete Tasks & Earn'
  },
  withdraw_alert: {
    msg: \`💸 *INSTANT TON / GRAM PAYOUTS LIVE!*

💎 Accumulated Honey can be withdrawn directly to your TON Wallet with zero hassle.
Keep mining and growing your Swarm!

🐝 Open HashBee to check your balance:\`,
    btn: '💸 Open HashBee Wallet'
  }
};`;

htmlFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, 'utf8');

  // Replace select dropdown
  html = html.replace(/<select id="broadcastTemplate"[\s\S]*?<\/select>/, newSelectDropdown);

  // Replace HYPE_TEMPLATES object
  html = html.replace(/const HYPE_TEMPLATES = \{[\s\S]*?\n\};/, newHypeTemplates);

  fs.writeFileSync(file, html, 'utf8');
  console.log(`✅ Updated broadcast dropdown and templates in ${file}`);
});

require('dotenv').config();
const axios = require('axios');
const token = process.env.TELEGRAM_BOT_TOKEN;

async function setBestBotProfile() {
  const base = `https://api.telegram.org/bot${token}`;

  try {
    // 1. Set Name
    const rName = await axios.post(`${base}/setMyName`, { name: 'TASKY' });
    console.log('✅ setMyName:', rName.data);

    // 2. Set Short Description (Bio in search results & share cards - max 120 chars)
    const shortDesc = 'Earn real GRAM & Web3 crypto daily. Complete tasks, mine rewards & claim instant on-chain payouts.';
    const rShort = await axios.post(`${base}/setMyShortDescription`, { short_description: shortDesc });
    console.log('✅ setMyShortDescription:', rShort.data);

    // 3. Set Full Description (Intro screen before /start)
    const fullDesc = `💎 Welcome to TASKY — The Real-Yield Web3 Mining Ecosystem!

Earn real cryptocurrency daily backed by genuine sponsor rewards & on-chain yields:

⚡ Complete Verified Tasks & Quests
⛏ Mine Daily GRAM Rewards on TON
🚀 Season 1 Genesis NFT Miners (Closing in 7 Days)
🎁 Instant On-Chain Tonkeeper Payouts
🤝 Earn 30% Lifetime Referral Commissions

Tap "Launch Tasky" below to start earning today! 👇`;

    const rFull = await axios.post(`${base}/setMyDescription`, { description: fullDesc });
    console.log('✅ setMyDescription:', rFull.data);

    // 4. Ensure Global Menu Button is active
    const rMenu = await axios.post(`${base}/setChatMenuButton`, {
      menu_button: {
        type: 'web_app',
        text: 'Launch Tasky',
        web_app: { url: 'https://tasky-v3.vercel.app/' }
      }
    });
    console.log('✅ setChatMenuButton:', rMenu.data);

    console.log('\n🎉 ALL BEST BOT PROFILE SETTINGS APPLIED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Error updating profile:', err.response?.data || err.message);
  } finally {
    process.exit(0);
  }
}

setBestBotProfile();

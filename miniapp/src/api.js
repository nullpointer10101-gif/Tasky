import axios from 'axios'

export const BACKEND_URL = typeof window !== 'undefined' && window.location.origin && window.location.origin.includes('onrender.com') 
  ? '' 
  : 'https://tasky3.onrender.com';

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach Telegram WebApp initData header to all outgoing requests for HMAC authentication
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
    config.headers['x-telegram-init-data'] = window.Telegram.WebApp.initData;
  }
  return config;
});

const getCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

const originalGet = api.get;
api.get = async (url, config) => {
  if (url.includes('_t=') || (config && config.params && config.params._t)) {
    return originalGet(url, config);
  }
  const key = url + JSON.stringify(config || {});
  if (getCache.has(key)) {
    const cached = getCache.get(key);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return Promise.resolve(cached.res);
    }
  }
  const res = await originalGet(url, config);
  getCache.set(key, { res, timestamp: Date.now() });
  return res;
};

// Clear cache on any mutation
['post', 'put', 'patch', 'delete'].forEach(method => {
  const originalMethod = api[method];
  api[method] = async (...args) => {
    getCache.clear();
    return originalMethod.apply(api, args);
  };
});

const wrap = async (fn, maxRetries = 2) => {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const res = await fn();
      return { data: res.data, error: null };
    } catch (err) {
      attempt++;
      const isNetworkOrServerRestart = !err.response || (err.response.status >= 500 && err.response.status <= 504);
      if (isNetworkOrServerRestart && attempt <= maxRetries) {
        console.warn(`[API] Transient connection error on attempt ${attempt}, retrying in ${attempt * 900}ms...`);
        await new Promise(r => setTimeout(r, attempt * 900));
        continue;
      }
      const error = err.response?.data?.error || err.message || 'Something went wrong';
      return { data: null, error };
    }
  }
}


const isMock = typeof window !== 'undefined' && window.location.search.includes('mock=true');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

const mockData = {
  getUser: { telegram_id: '123456', first_name: 'Aleem', username: 'aleem_crypto', balance: '28460', total_earned: '35000', task_earnings: '20000', referral_earnings: '15000', streak_days: 13, created_at: new Date('2025-01-10').toISOString(), tasks_done: 4, genesis_member: true, spins_available: 10, spins_used_today: 0, last_checkin: null },
  getTasks: [
    { id: 1, title: 'Join Tasky Official Channel', subtitle: 'Get official updates, announcements, and news first', reward_tasky: 300, type: 'telegram', verification_type: 'auto_telegram', action_url: 'https://t.me/Tasky_Official', telegram_chat_id: 'Tasky_Official', is_featured: true, icon: 'Telegram' },
    { id: 2, title: 'Join Tasky Community', subtitle: 'Connect with other members, ask questions, share your progress', reward_tasky: 300, type: 'telegram', verification_type: 'auto_telegram', action_url: 'https://t.me/TaskyOfficialCommunity', telegram_chat_id: 'TaskyOfficialCommunity', is_featured: true, icon: 'Telegram' },
    { id: 3, title: 'Watch: How Tasky Works', subtitle: 'Watch our 60-second intro video', reward_tasky: 200, type: 'youtube', verification_type: 'proof_screenshot', action_url: 'https://youtube.com', is_featured: false, icon: 'Youtube' },
    { id: 4, title: 'Invite Your First Friend', subtitle: 'Share your referral link with 1 friend', reward_tasky: 250, type: 'general', verification_type: 'auto_referral', action_url: '', is_featured: false, icon: 'Users' },
    { id: 5, title: 'Follow Tasky on X', subtitle: 'Stay updated with real-time announcements', reward_tasky: 200, type: 'twitter', verification_type: 'proof_username', action_url: 'https://x.com/TaskyAppOffical', is_featured: false, icon: 'Twitter' },
    { id: 6, title: 'Retweet Our Launch Announcement', subtitle: 'Help spread the word, retweet our pinned post', reward_tasky: 200, type: 'twitter', verification_type: 'proof_username', action_url: 'https://x.com/TaskyAppOffical/status/2073448989199155411?s=20', is_featured: false, icon: 'Twitter' },
    { id: 7, title: 'Share Your Balance', subtitle: 'Post a screenshot of your TASKY balance in your story or group chat', reward_tasky: 100, type: 'general', verification_type: 'proof_screenshot', action_url: '', is_featured: false, icon: 'Share' },
    { id: 8, title: 'Introduce Yourself in the Community', subtitle: "Say hi and share where you're joining from in our community group", reward_tasky: 100, type: 'telegram', verification_type: 'proof_screenshot', action_url: 'https://t.me/TaskyOfficialCommunity', is_featured: false, icon: 'MessageCircle' }
  ],
  getMySubmissions: [
    { id: 1, title: 'Watch YouTube Video', reward_tasky: 1000, status: 'approved', submitted_at: new Date().toISOString(), icon: 'Youtube' },
    { id: 2, title: 'Retweet Pinned Post', reward_tasky: 300, status: 'pending', submitted_at: new Date().toISOString(), icon: 'Repeat' }
  ],
  getReferral: {
    referral_link: 'https://t.me/taskybot?start=TASKY123456',
    referral_code: 'TASKY123456',
    total_referrals: 145,
    valid_referrals: 28,
    pending_referrals: 117,
    reward_per_referral: 200,
    tasks_required_for_valid: 3
  },
  getReferralLeaderboard: {
    is_demo_data: true,
    leaderboard: [
      { username: 'CryptoKing',    first_name: 'CryptoKing', valid_referrals: 233, total_referrals: 412 },
      { username: 'Satoshi',       first_name: 'Satoshi',    valid_referrals: 188, total_referrals: 340 },
      { username: 'Vitalik',       first_name: 'Vitalik',    valid_referrals: 122, total_referrals: 215 },
      { username: 'BlockchainBen', first_name: 'Ben',        valid_referrals: 94,  total_referrals: 180 },
      { username: 'TONmaster99',   first_name: 'Reza',       valid_referrals: 86,  total_referrals: 140 },
      { username: 'TaskKing',      first_name: 'Karim',      valid_referrals: 77,  total_referrals: 105 },
      { username: 'Web3Fatima',    first_name: 'Fatima',     valid_referrals: 68,  total_referrals: 90 },
      { username: 'EarnDaily',     first_name: 'Omar',       valid_referrals: 62,  total_referrals: 75 },
      { username: 'GemHunter',     first_name: 'Lena',       valid_referrals: 55,  total_referrals: 60 },
      { username: 'CryptoRookie',  first_name: 'Sam',        valid_referrals: 51,  total_referrals: 55 },
    ]
  },
  getWithdrawalSettings: { 
    min_withdrawal_tasky: 20000, 
    fee_percent: 35, 
    usdt_rate: 0.00005,
    is_locked: true,
    unlock_message: 'Withdrawals unlock when TASKY launches on-chain',
    target_users_milestone: 500000
  },
  getSwapRates: [
    { token_name: 'DOGS', tasky_per_unit: 10, min_tasky: 3000, is_active: true },
    { token_name: 'USDT', tasky_per_unit: 20000, min_tasky: 20000, is_active: false }
  ],
  getSwapHistory: [
    { id: 1, telegram_id: '123456', tasky_amount: 1000, receive_token: 'USDT', receive_amount: 2, status: 'pending', requested_at: new Date().toISOString(), chain: 'TON' }
  ],
  getWithdrawalHistory: [
    { id: 1, tasky_amount: 5000, usdt_amount: '0.1500', fee_amount: 1750, status: 'approved', requested_at: new Date().toISOString() }
  ]
};

const mockCache = new Map();
const withMock = (mockValue, fn) => async (...args) => {
  if (isMock) {
    const key = fn.toString() + JSON.stringify(args);
    if (mockCache.has(key)) {
      if (Date.now() - mockCache.get(key).timestamp < CACHE_TTL) {
        return mockCache.get(key).res;
      }
    }
    await delay(300);
    const resolvedMockValue = typeof mockValue === 'function' ? mockValue(...args) : mockValue;
    const res = { data: resolvedMockValue, error: null };
    mockCache.set(key, { res, timestamp: Date.now() });
    return res;
  }
  return wrap(fn(...args));
};

export const registerUser   = withMock(() => ({ id: 1, balance: '28460', ...mockData.getUser }), (body) => () => api.post('/api/users/register', body))
export const getUser        = withMock(() => ({ ...mockData.getUser }), (id) => () => api.get(`/api/users/${id}`))
export const checkin        = withMock({ bonus_earned: 100, streak_days: 14 }, (telegram_id) => () => api.post('/api/users/checkin', { telegram_id }))
export const playSpin       = withMock(() => {
  mockData.getUser.spins_used_today = (mockData.getUser.spins_used_today || 0) + 1;
  mockData.getUser.spins_available = Math.max(0, mockData.getUser.spins_available - 1);
  mockData.getUser.balance = (Number(mockData.getUser.balance) + 250).toString();
  return { reward_earned: 250, tier: 'medium' };
}, (telegram_id) => () => api.post('/api/spin/play', { telegram_id }))
export const getTasks       = withMock(mockData.getTasks, (telegram_id) => () => api.get('/api/tasks', { params: { telegram_id } }))
export const completeTask   = withMock({ success: true }, (telegram_id, task_id, proof_screenshot_url, proof_url, telegram_user) => () => api.post('/api/tasks/complete', { telegram_id, task_id, proof_screenshot_url, proof_url, telegram_user }))
export const getReferral    = withMock(mockData.getReferral, (id) => () => api.get(`/api/referral/${id}`))
export const getReferralLeaderboard = withMock(() => mockData.getReferralLeaderboard, () => () => api.get('/api/referral/leaderboard'))

// --- SWAP ---
export const getSwapRates = withMock(() => mockData.getSwapRates, () => () => api.get('/api/swap/rates'))
export const requestSwap = withMock({ id: 999, status: 'pending' }, (body) => () => api.post('/api/swap/request', body))
export const getSwapHistory = withMock(() => mockData.getSwapHistory, (telegram_id) => () => api.get(`/api/swap/history/${telegram_id}`))
export const watchWithdrawalAd = withMock({ success: true }, (telegram_id) => () => api.post('/api/withdrawal/watch_ad', { telegram_id }))

// --- NFT & AUTOMATIC DEPOSIT ---
export const getNftMarketplace = withMock(
  { 
    success: true, 
    cards: [
      { id: 4, name: 'Gram Titan God Miner #04', description: 'Ultimate powerhouse digital miner. Earn 25.0 GRAM daily for 3 days.', price_gram: 50.0, daily_yield_gram: 25.0, duration_days: 3, total_yield_gram: 75.0, rarity: 'celestial', icon_key: 'crown' },
      { id: 3, name: 'Gram Mega Miner #03', description: 'Ultra-powered digital miner. Earn 0.70 GRAM daily for 10 days.', price_gram: 5.0, daily_yield_gram: 0.70, duration_days: 10, total_yield_gram: 7.0, rarity: 'mythic', icon_key: 'flame' }
    ], 
    deposit_wallet: 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR' 
  },
  () => () => api.get('/api/nft/marketplace')
)
export const buyNft = withMock({ success: true, message: 'Purchased successfully' }, (telegram_id, nft_id) => () => api.post('/api/nft/buy', { telegram_id, nft_id }))
export const getMyNftCards = withMock({ success: true, cards: [] }, (telegram_id) => () => api.get(`/api/nft/my-cards?telegram_id=${telegram_id}`))
export const claimNftYield = withMock({ success: true, message: 'Claimed successfully' }, (telegram_id, instance_id) => () => api.post('/api/nft/claim-yield', { telegram_id, instance_id }))
export const autoVerifyDeposit = withMock({ success: true, message: 'Deposit verified' }, (telegram_id, tx_hash) => () => api.post('/api/nft/deposit/auto-verify', { telegram_id, tx_hash }))

export const getMySubmissions = withMock(mockData.getMySubmissions, (id) => () => api.get(`/api/tasks/my-submissions/${id}`))
export const getWithdrawalSettings = withMock(mockData.getWithdrawalSettings, () => () => api.get('/api/withdrawal/settings'))
export const requestWithdrawal = withMock({ success: true }, (body) => async () => {
  if (isMock) {
    mockData.getWithdrawalHistory.unshift({
      id: Date.now(),
      tasky_amount: body.amount,
      usdt_amount: (body.amount / 33333).toFixed(4),
      fee_amount: body.amount * 0.35,
      status: 'pending',
      requested_at: new Date().toISOString()
    });
  }
  return api.post('/api/withdrawal/request', { 
    telegram_id: body.telegram_id, 
    tasky_amount: body.amount, 
    wallet_address: body.address 
  });
})
export const getWithdrawalHistory = withMock(mockData.getWithdrawalHistory, (id) => () => api.get(`/api/withdrawal/history/${id}`))
export const notifyUsdtUnlock = withMock(() => ({ success: true }), (id) => () => api.post('/api/swap/notify-usdt-unlock', { telegram_id: id }))

// Vault & Mining API
mockData.getMiningStatus = {
  mining_level: 3,
  level_name: 'Silver Vault',
  base_speed_per_hour: 14,
  efficiency_percent: 125,
  effective_speed: 17.5,
  balance: 28460, // off-chain balance (same as user balance)
  holding_stable_since: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  wallet_address: null,
  days_stable: 10,
  active_session: null
};
mockData.getMiningLevels = {
  levels: [
    { level: 1, name: 'No Vault', min_holding: 0, base_speed_per_hour: 5 },
    { level: 2, name: 'Bronze Vault', min_holding: 500, base_speed_per_hour: 8 },
    { level: 3, name: 'Silver Vault', min_holding: 2000, base_speed_per_hour: 14 },
    { level: 4, name: 'Gold Vault', min_holding: 5000, base_speed_per_hour: 25 },
    { level: 5, name: 'Diamond Vault', min_holding: 15000, base_speed_per_hour: 45 }
  ],
  efficiency_tiers: [
    { min_days: 0, multiplier_percent: 100 },
    { min_days: 4, multiplier_percent: 110 },
    { min_days: 8, multiplier_percent: 125 },
    { min_days: 15, multiplier_percent: 150 },
    { min_days: 30, multiplier_percent: 200 }
  ]
};

mockData.getMachines = {
  machines: [
    { id: 1, name: 'Starter Rig', rarity: 'common', bonus: 5, icon_key: 'starter_rig', min_holding: 500, status: 'owned' },
    { id: 2, name: 'Copper Frame', rarity: 'common', bonus: 5, icon_key: 'copper_frame', min_holding: 1500, status: 'owned' },
    { id: 3, name: 'Ion Core', rarity: 'rare', bonus: 10, icon_key: 'ion_core', min_holding: 4000, status: 'visible' },
    { id: 4, rarity: 'rare', icon_key: 'mystery', status: 'hidden' },
    { id: 5, rarity: 'epic', icon_key: 'mystery', status: 'hidden' }
  ],
  total_bonus_percent: 10,
  unrevealed_new_machines: [ 2 ]
};

export const getMiningStatus = withMock(() => mockData.getMiningStatus, (telegram_id) => () => api.get(`/api/mining/status/${telegram_id}`))
export const getMiningLevels = withMock(mockData.getMiningLevels, () => () => api.get(`/api/mining/levels`))

export const startMiningSession = withMock(() => {
  const session_duration_hours = 4;
  const expected_claim_at = new Date(Date.now() + session_duration_hours * 60 * 60 * 1000).toISOString();
  mockData.getMiningStatus.active_session = {
    id: Date.now(),
    started_at: new Date().toISOString(),
    expected_claim_at,
    is_ready_to_claim: false,
    estimated_current_earned: 0,
    rate_used: mockData.getMiningStatus.effective_speed
  };
  return mockData.getMiningStatus.active_session;
}, (telegram_id, wallet_address) => () => api.post('/api/mining/start', { telegram_id, wallet_address }))

export const claimMiningSession = withMock(() => {
  const earned = mockData.getMiningStatus.active_session.rate_used * 4;
  mockData.getUser.balance = (Number(mockData.getUser.balance) + earned).toString();
  mockData.getMiningStatus.active_session = null;
  return { tasky_earned: earned, new_balance: mockData.getUser.balance };
}, (telegram_id, wallet_address) => () => api.post('/api/mining/claim', { telegram_id, wallet_address }))

export const saveWalletAddress = withMock((telegram_id, wallet_address, force = false) => {
  mockData.getMiningStatus.wallet_address = wallet_address;
  return { success: true, wallet_address };
}, (telegram_id, wallet_address, force = false) => () => api.post('/api/users/wallet/bind', { telegram_id, wallet_address, force }))

export const disconnectWallet = withMock((telegram_id) => {
  return { success: true };
}, (telegram_id) => () => api.post('/api/users/wallet/disconnect', { telegram_id }))

export const getMachines = withMock(() => mockData.getMachines, (telegram_id) => () => api.get(`/api/mining/machines/${telegram_id}`))
export const markMachineSeen = withMock((telegram_id, machine_id) => {
  mockData.getMachines.unrevealed_new_machines = mockData.getMachines.unrevealed_new_machines.filter(id => id !== machine_id);
  return { success: true };
}, (telegram_id, machine_id) => () => api.post('/api/mining/machines/mark-seen', { telegram_id, machine_id }))

// --- SPECIAL OFFER ---
export const getSpecialOfferStatus = withMock(
  () => ({ valid_referrals: 14, claim: null }),
  (telegram_id) => () => api.get(`/api/users/special-offer/status/${telegram_id}`)
)
export const claimSpecialOffer = withMock(
  { success: true, message: 'Claim submitted! Admin will review shortly.' },
  (telegram_id) => () => api.post('/api/users/special-offer/claim', { telegram_id })
)

// --- GRAM CLAIMS (0.02 GRAM REWARD) ---
export const getGramStatus = withMock(
  () => ({ gram_wallet_address: '', ads_watched_today: 45, claimed_in_last_24h: false, can_claim: false, recent_claim: null }),
  (telegram_id) => () => api.get(`/api/gram/status/${telegram_id}`)
)
export const claimGramReward = withMock(
  { success: true, message: 'Claim request sent to admin!' },
  (telegram_id, gram_wallet_address) => () => api.post('/api/gram/claim', { telegram_id, gram_wallet_address })
)
export const saveGramWalletAddress = withMock(
  { success: true, message: 'Gram wallet address saved successfully!' },
  (telegram_id, gram_wallet_address) => () => api.post('/api/gram/save-address', { telegram_id, gram_wallet_address })
)
export const startWatchGramAd = withMock(
  { success: true, session_token: 'mock_token' },
  (telegram_id, provider = 'gigapub') => () => api.post('/api/gram/start-watch', { telegram_id, provider })
)
export const watchGramAd = withMock(
  (telegram_id, provider = 'gigapub', session_token = null) => ({ success: true, ads_watched_today: 46 }),
  (telegram_id, provider = 'gigapub', session_token = null) => () => api.post('/api/gram/watch-ad', { telegram_id, provider, session_token })
)
export const verifyGramSuffix = withMock(
  () => ({ success: true, has_suffix: false, last_name: '' }),
  (telegram_id) => () => api.get(`/api/gram/verify-suffix/${telegram_id}`)
)

// --- GRAM CURRENCY (IN-APP BALANCE) ---
export const getGramCurrencyBalance = withMock(
  () => ({ gram_balance: 12.5, wallet: 'UQtest...', has_pending_withdrawal: false, can_withdraw: true, min_withdrawal: 0.01, max_withdrawal: 0.05, history: [] }),
  (telegram_id) => () => api.get(`/api/gram-currency/balance/${telegram_id}`)
)
export const requestGramWithdrawal = withMock(
  { success: true, message: 'Withdrawal request submitted!' },
  (telegram_id, amount) => () => api.post('/api/gram-currency/withdraw', { telegram_id, amount })
)

// --- CHANNELS VERIFICATION ---
export const getChannelStatus = withMock(
  { tasky_official: false, tasky_payouts: false, alphadrop: false, community: false, all_joined: false },
  (telegram_id) => () => api.get(`/api/users/channel-status?telegram_id=${telegram_id}&_t=${Date.now()}`)
)

export const verifyChannels = withMock(
  { success: true, new_balance: 200 },
  (telegram_id) => () => api.post('/api/users/verify-channels', { telegram_id })
)

// --- REFERRAL COMMISSION CLAIM ---
export const claimReferralCommission = withMock(
  { success: true, message: 'Commission claim request submitted to admin!' },
  (telegram_id, wallet_address) => () => api.post('/api/referral/claim-commission', { telegram_id, wallet_address })
)

// --- CYBER AD REACTOR (USL ADS 5-STAGE OVERDRIVE) ---
export const getReactorStatus = withMock(
  { success: true, total_ads: 0, current_stage: 0, next_target: 20, stages: [], active_claim: null, user_wallet: '' },
  (telegram_id) => () => api.get(`/api/reactor/status/${telegram_id}?_t=${Date.now()}`)
)

export const startReactorAdView = withMock(
  { success: true, session_token: 'mock_reactor_token' },
  (telegram_id) => () => api.post('/api/reactor/start-view', { telegram_id })
)

export const recordReactorAdView = withMock(
  { success: true, total_ads: 1, stage: 0, can_claim: false },
  (telegram_id, session_token = null, provider = 'usl') => () => api.post('/api/reactor/record-view', { telegram_id, session_token, provider })
)

export const claimReactorReward = withMock(
  { success: true, message: 'Claim submitted successfully!', unlock_days: 5 },
  (telegram_id, wallet_address) => () => api.post('/api/reactor/claim', { telegram_id, wallet_address })
)

// --- 7-DAY AD CHAMPIONSHIP LEADERBOARD ---
export const getCampaignTournament = withMock(
  {
    success: true,
    tournament: { id: 1, title: '🔥 7-Day Ad Championship', time_left_ms: 500000000, status: 'active' },
    leaderboard: [
      { rank: 1, first_name: 'Alex', ads_watched: 340, prize_gram: 1.00, prize_tasky: 20000 },
      { rank: 2, first_name: 'CryptoKing', ads_watched: 290, prize_gram: 0.50, prize_tasky: 10000 },
      { rank: 3, first_name: 'Satoshi', ads_watched: 240, prize_gram: 0.30, prize_tasky: 5000 }
    ],
    user_stats: { rank: 14, ads_watched: 85, estimated_gram: 0.05, estimated_tasky: 1000 },
    prize_structure: []
  },
  (telegram_id) => () => api.get(`/api/campaign/tournament?telegram_id=${telegram_id}&_t=${Date.now()}`)
)

export const startWatchCampaignAd = withMock(
  { success: true, session_token: 'mock_campaign_token' },
  (telegram_id, provider = 'adexium') => () => api.post('/api/campaign/start-watch', { telegram_id, provider })
)

export const recordCampaignAd = withMock(
  { success: true, campaign_ads_watched: 86 },
  (telegram_id, provider = 'gigapub', session_token = null) => () => api.post('/api/campaign/watch-ad', { telegram_id, provider, session_token })
)


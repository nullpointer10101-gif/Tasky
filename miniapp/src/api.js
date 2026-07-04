import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL === 'http://localhost:3000' ? '' : import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

const wrap = async (fn) => {
  try {
    const res = await fn()
    return { data: res.data, error: null }
  } catch (err) {
    const error = err.response?.data?.error || err.message || 'Something went wrong'
    return { data: null, error }
  }
}

const isMock = typeof window !== 'undefined' && window.location.search.includes('mock=true');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

const mockData = {
  getUser: { telegram_id: '123456', first_name: 'Aleem', username: 'aleem_crypto', balance: '28460', total_earned: '35000', task_earnings: '20000', referral_earnings: '15000', streak_days: 13, created_at: new Date('2025-01-10').toISOString(), tasks_done: 4, genesis_member: true, spins_available: 10, spins_used_today: 0, last_checkin: null },
  getTasks: [
    { id: 1, title: 'Follow Tasky on X', subtitle: 'Stay updated with our latest news', reward_tasky: 500, type: 'social', verification_type: 'proof_screenshot', action_url: 'https://x.com', icon: 'Twitter' },
    { id: 2, title: 'Retweet Pinned Post', subtitle: 'Spread the word!', reward_tasky: 300, type: 'social', verification_type: 'proof_url', action_url: 'https://x.com', icon: 'Repeat' },
    { id: 3, title: 'Join Telegram Channel', subtitle: 'Join our community for daily updates', reward_tasky: 250, type: 'social', verification_type: 'none', action_url: 'https://t.me', icon: 'Telegram' },
    { id: 4, title: 'YouTube Video Review', subtitle: 'Create a video review! Rules: 100+ subs, 20+ views, must use your referral link in description, and get 20+ valid referrals.', reward_tasky: 5000, type: 'bounty', verification_type: 'proof_url', action_url: 'https://youtube.com', icon: 'Youtube' }
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
  getReferralLeaderboard: [
    { id: 1, first_name: 'CryptoKing', valid_referrals: 450, total_referrals: 1200 },
    { id: 2, first_name: 'Satoshi', valid_referrals: 380, total_referrals: 890 }
  ],
  getSwapRates: [
    { id: 1, token_name: 'TON', tasky_per_unit: 1000, min_tasky: 500 },
    { id: 2, token_name: 'USDT', tasky_per_unit: 500, min_tasky: 500 }
  ],
  getWithdrawalSettings: { 
    min_withdrawal_tasky: 2250, 
    fee_percent: 35, 
    usdt_rate: 0.00003,
    is_locked: true,
    unlock_message: 'Withdrawals unlock when TASKY launches on-chain',
    target_users_milestone: 500000
  },
  getSwapRates: [
    { token_name: 'DOGS', tasky_per_unit: 1000, min_tasky: 1000, is_active: true },
    { token_name: 'USDT', tasky_per_unit: 500, min_tasky: 500, is_active: false }
  ],
  getSwapHistory: [
    { id: 1, telegram_id: '123456', tasky_amount: 1000, receive_token: 'USDT', receive_amount: 2, status: 'pending', requested_at: new Date().toISOString(), chain: 'TON' }
  ],
  getWithdrawalHistory: [
    { id: 1, tasky_amount: 5000, usdt_amount: '0.1500', fee_amount: 1750, status: 'approved', requested_at: new Date().toISOString() }
  ]
};

const withMock = (mockValue, fn) => async (...args) => {
  if (isMock) {
    await delay(300);
    const resolvedMockValue = typeof mockValue === 'function' ? mockValue(...args) : mockValue;
    return { data: resolvedMockValue, error: null };
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
export const completeTask   = withMock({ success: true }, (telegram_id, task_id, proof_screenshot_url, proof_url) => () => api.post('/api/tasks/complete', { telegram_id, task_id, proof_screenshot_url, proof_url }))
export const getReferral    = withMock(mockData.getReferral, (id) => () => api.get(`/api/referral/${id}`))
export const getReferralLeaderboard = withMock(mockData.getReferralLeaderboard, () => () => api.get('/api/referral/leaderboard'))

// --- SWAP ---
export const getSwapRates = withMock(() => mockData.getSwapRates, () => () => api.get('/api/swap/rates'))
export const requestSwap = withMock({ id: 999, status: 'pending' }, (body) => () => api.post('/api/swap/request', body))
export const getSwapHistory = withMock(() => mockData.getSwapHistory, (telegram_id) => () => api.get(`/api/swap/history/${telegram_id}`))

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
}, (telegram_id) => () => api.post('/api/mining/start', { telegram_id }))

export const claimMiningSession = withMock(() => {
  const earned = mockData.getMiningStatus.active_session.rate_used * 4;
  mockData.getUser.balance = (Number(mockData.getUser.balance) + earned).toString();
  mockData.getMiningStatus.active_session = null;
  return { tasky_earned: earned, new_balance: mockData.getUser.balance };
}, (telegram_id) => () => api.post('/api/mining/claim', { telegram_id }))

export const saveWalletAddress = withMock((telegram_id, wallet_address) => {
  mockData.getMiningStatus.wallet_address = wallet_address;
  return { success: true, wallet_address };
}, (telegram_id, wallet_address) => () => api.post('/api/users/wallet', { telegram_id, wallet_address }))

export const getMachines = withMock(() => mockData.getMachines, (telegram_id) => () => api.get(`/api/mining/machines/${telegram_id}`))
export const markMachineSeen = withMock((telegram_id, machine_id) => {
  mockData.getMachines.unrevealed_new_machines = mockData.getMachines.unrevealed_new_machines.filter(id => id !== machine_id);
  return { success: true };
}, (telegram_id, machine_id) => () => api.post('/api/mining/machines/mark-seen', { telegram_id, machine_id }))

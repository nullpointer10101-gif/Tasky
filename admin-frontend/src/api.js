import axios from 'axios';

// --- MOCK DATA ---
const mockData = {
  '/stats': {
    totalUsers: 1420,
    pendingTasks: 15,
    pendingWithdrawals: 4,
    totalCirculatingTasky: 45000,
  },
  '/config': {
    min_withdrawal_amount: 5000,
    withdrawal_fee_percent: 5,
    usdt_conversion_rate: 0.005,
    direct_referral_reward: 100,
    secondary_referral_reward: 20,
  },
  '/system/maintenance': { active: false },
  '/tasks/pending': [
    { user_task_id: 1, telegram_id: '123', username: 'john_doe', title: 'Join Premium Channel', reward: 500, proof_screenshot_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=400&auto=format&fit=crop', submitted_at: new Date().toISOString() },
    { user_task_id: 2, telegram_id: '456', username: 'crypto_king', title: 'Retweet Announcement', reward: 200, proof_screenshot_url: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=400&auto=format&fit=crop', submitted_at: new Date().toISOString() },
  ],
  '/withdrawals/pending': [
    { withdrawal_id: 1, telegram_id: '123', username: 'john_doe', tasky_amount: 10000, usdt_amount: 50, fee_amount: 500, wallet_address: 'UQDA...xyz123', requested_at: new Date().toISOString() },
    { withdrawal_id: 2, telegram_id: '789', username: 'alice_w', tasky_amount: 5000, usdt_amount: 25, fee_amount: 250, wallet_address: 'UQZX...abc987', requested_at: new Date().toISOString() },
  ],
  '/tasks': [
    { id: 1, title: 'Follow Twitter', description: 'Follow our official Twitter account.', reward: 100, is_active: true, type: 'social', link: 'https://twitter.com' },
    { id: 2, title: 'Join Telegram', description: 'Join the community group.', reward: 200, is_active: true, type: 'social', link: 'https://t.me' },
  ],
  '/users': [
    { id: 1, telegram_id: '1111', username: 'crypto_chad', first_name: 'Chad', balance: 15000, total_referrals: 12, streak_days: 5, is_banned: false, created_at: new Date().toISOString() },
    { id: 2, telegram_id: '2222', username: 'diamond_hands', first_name: 'Diamond', balance: 500, total_referrals: 0, streak_days: 1, is_banned: true, created_at: new Date().toISOString() },
    { id: 3, telegram_id: '3333', username: 'wen_moon', first_name: 'Moon', balance: 34000, total_referrals: 45, streak_days: 14, is_banned: false, created_at: new Date().toISOString() },
  ]
};

// --- AXIOS INSTANCE WITH MOCK ADAPTER ---
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/admin',
});

// Request Interceptor to add password header
api.interceptors.request.use((config) => {
  const password = localStorage.getItem('tasky_admin_password');
  if (password) {
    config.headers['x-admin-password'] = password;
  }
  return config;
});

// Error Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('tasky_admin_password');
      // Only redirect if we are not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

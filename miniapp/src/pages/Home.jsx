import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Wallet, Trophy, CheckCircle2, Users, Info } from 'lucide-react';
import Card from '../components/Card';
import DailyCheckin from '../components/DailyCheckin';
import SpinWheel from '../components/SpinWheel';
import { useTranslation } from '../i18n/I18nContext';
import { getReferral, getSwapRates } from '../api';
import { useToast } from '../App';

const containerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

export default function Home({ user, refreshUser }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [swapRates, setSwapRates] = useState([]);
  const [referralData, setReferralData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [refRes, ratesRes] = await Promise.all([
          getReferral(user?.telegram_id || '123456'),
          getSwapRates()
        ]);
        if (!isMounted) return;
        if (refRes.data) setReferralData(refRes.data);
        if (ratesRes.data) setSwapRates(ratesRes.data);
      } catch (err) {
        if (!isMounted) return;
        console.error('Home fetchData error:', err);
        showToast(err.message || 'Error loading home data', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [user]);

  if (!user || loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-surface-soft rounded"></div>
            <div className="h-6 w-32 bg-surface-soft rounded"></div>
          </div>
          <div className="h-10 w-10 bg-surface-soft rounded-full"></div>
        </div>
        <div className="h-32 bg-surface-soft rounded-2xl w-full"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-28 bg-surface-soft rounded-2xl"></div>
          <div className="h-28 bg-surface-soft rounded-2xl"></div>
          <div className="h-28 bg-surface-soft rounded-2xl"></div>
          <div className="h-28 bg-surface-soft rounded-2xl"></div>
        </div>
        <div className="h-40 bg-surface-soft rounded-2xl w-full"></div>
      </div>
    );
  }

  const usdtRate = swapRates.find(r => r.token_name === 'USDT' && r.is_active);
  const taskyPerUsdt = usdtRate ? Number(usdtRate.tasky_per_unit) : 500;
  const usdtValue = (parseFloat(user.balance) / taskyPerUsdt).toFixed(2);

  return (
    <motion.div 
      className="p-4 space-y-4 pb-24"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-2xl font-black">{t('home.hello') || 'Hello,'}</h1>
          <p className="text-xl font-medium text-ink-soft">
            {user.first_name} {user.last_name || ''}
          </p>
        </div>
        <button className="h-10 w-10 bg-surface-soft rounded-full flex items-center justify-center text-ink hover:bg-border transition-colors">
          <Bell size={20} />
        </button>
      </div>

      {/* Hero Balance Card */}
      <Card className="bg-gradient-primary border-0 text-white relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-sm font-medium text-white/80 mb-1">{t('home.totalPortfolio') || 'TOTAL PORTFOLIO'}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight">{Math.floor(Number(user.balance)).toLocaleString()}</span>
            <span className="text-lg font-medium text-white/90">TASKY</span>
          </div>
          <p className="text-sm mt-2 text-white/80">
            ≈ ${usdtValue} USDT
          </p>
        </div>
        {/* Decorative circles */}
        
        
      </Card>

      {/* 2x2 Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col">
          <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
            <Wallet size={16} className="text-blue-400" />
          </div>
          <p className="text-sm text-ink-faint mb-1">{t('home.taskyBalance') || 'TASKY Balance'}</p>
          <p className="text-xl font-bold">{Math.floor(Number(user.balance)).toLocaleString()}</p>
        </Card>
        
        <Card className="flex flex-col">
          <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center mb-3">
            <Trophy size={16} className="text-purple-400" />
          </div>
          <p className="text-sm text-ink-faint mb-1">{t('home.totalEarned') || 'Total Earned'}</p>
          <p className="text-xl font-bold">{Number(user.total_earned || 0).toLocaleString()}</p>
        </Card>

        <Card className="flex flex-col">
          <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
            <CheckCircle2 size={16} className="text-green-400" />
          </div>
          <p className="text-sm text-ink-faint mb-1">{t('home.taskEarnings') || 'Task Earnings'}</p>
          <p className="text-xl font-bold">{Number(user.task_earnings || 0).toLocaleString()}</p>
        </Card>

        <Card className="flex flex-col">
          <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center mb-3">
            <Users size={16} className="text-orange-400" />
          </div>
          <p className="text-sm text-ink-faint mb-1">{t('home.referralEarnings') || 'Referral Earnings'}</p>
          <p className="text-xl font-bold">{Number(user.referral_earnings || 0).toLocaleString()}</p>
        </Card>
      </div>

      <SpinWheel user={user} refreshUser={refreshUser} />

      <DailyCheckin user={user} refreshUser={refreshUser} />

      {/* How to Earn Info Card */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-surface-soft p-1.5 rounded-lg">
            <Info size={18} className="text-ink-soft" />
          </div>
          <h2 className="text-lg font-bold">How to Earn</h2>
        </div>
        <ul className="space-y-3 text-sm text-ink-soft">
          <li className="flex items-start gap-2">
            <span className="text-success mt-0.5">•</span>
            <span>Complete tasks available in the Tasks tab. Provide proof if required to get approved quickly.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success mt-0.5">•</span>
            <span>Claim Daily Check-ins up to <strong className="text-ink">500 TASKY</strong> on milestone days!</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success mt-0.5">•</span>
            <span>Refer friends and earn <strong className="text-ink">{referralData?.reward_per_referral} TASKY + {referralData?.spin_reward_per_referral} Spin</strong> per valid referral.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success mt-0.5">•</span>
            <span>A referral becomes valid once they complete at least <strong className="text-ink">{referralData?.tasks_required_for_valid} tasks</strong>.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success mt-0.5">•</span>
            <span>Minimum swap threshold is <strong className="text-ink">{swapRates.find(r => r.token_name === 'USDT' && r.is_active)?.min_tasky || 1000} TASKY</strong>. Swap straight to your TON USDT wallet!</span>
          </li>
        </ul>
      </Card>

    </motion.div>
  );
}

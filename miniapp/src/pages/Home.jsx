import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Wallet, Trophy, CheckCircle2, Users, Info, Zap, ChevronRight, Star, ShieldCheck } from 'lucide-react';
import DailyCheckin from '../components/DailyCheckin';
import SpinWheel from '../components/SpinWheel';
import DopamineBalanceTicker from '../components/DopamineBalanceTicker';
import StreakFlameBadge from '../components/StreakFlameBadge';
import WelcomeBackModal from '../components/WelcomeBackModal';
import SwapProgressCard from '../components/SwapProgressCard';

import { useTranslation } from '../i18n/I18nContext';
import { getReferral, getSwapRates, getMiningStatus } from '../api';
import { useToast } from '../App';

const containerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function Home({ user, refreshUser, navigate }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [swapRates, setSwapRates] = useState([]);
  const [referralData, setReferralData] = useState(null);
  const [miningSpeed, setMiningSpeed] = useState(5.0);
  const [loading, setLoading] = useState(true);

  const tgId = String(user?.telegram_id || user?.id || window.Telegram?.WebApp?.initDataUnsafe?.user?.id || '');

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [refRes, ratesRes, miningRes] = await Promise.all([
          getReferral(user?.telegram_id || '123456'),
          getSwapRates(),
          getMiningStatus(user?.telegram_id || '123456')
        ]);
        if (!isMounted) return;
        if (refRes.data) setReferralData(refRes.data);
        if (ratesRes.data) setSwapRates(ratesRes.data);
        if (miningRes.data?.current_level?.rate_per_hour) {
          setMiningSpeed(Number(miningRes.data.current_level.rate_per_hour) || 5.0);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Home fetchData error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [user]);

  if (!user) return null;

  const usdtRate = swapRates.find(r => r.token_name === 'USDT' && r.is_active);
  const taskyPerUsdt = usdtRate ? Number(usdtRate.tasky_per_unit) : 20000;
  const usdtValue = (parseFloat(user.balance || 0) / taskyPerUsdt).toFixed(2);

  return (
    <motion.div 
      className="p-4 space-y-5 pb-20 max-w-md mx-auto"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {/* Launch Banner */}
      <motion.div variants={itemVariants} className="relative overflow-hidden bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-fuchsia-900/40 border-[1.5px] border-indigo-500/30 p-4 rounded-3xl text-center shadow-[0_0_30px_rgba(99,102,241,0.15)] mb-2 mt-2">
        <div className="absolute -top-10 -left-10 w-28 h-28 bg-indigo-500/20 rounded-full" style={{ filter: 'blur(20px)' }} />
        <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-fuchsia-500/20 rounded-full" style={{ filter: 'blur(20px)' }} />
        
        <div className="relative z-10 flex flex-col items-center gap-1.5">
          <div className="bg-indigo-500/20 p-2 rounded-full border border-indigo-500/30 mb-1 shadow-inner">
            <Zap size={18} className="text-indigo-300 fill-indigo-300 animate-pulse" />
          </div>
          <h2 className="text-[15px] font-black text-white uppercase tracking-[0.2em] drop-shadow-md">
            Launching TASKY Token
          </h2>
          <p className="text-[11px] font-bold text-indigo-200 mt-0.5 max-w-[250px] leading-tight opacity-90">
            When development dashboard completes
          </p>
        </div>
      </motion.div>

      {/* Header with Streak Flame */}
      <motion.div variants={itemVariants} className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 shadow-md">
            <div className="w-full h-full bg-surface rounded-full flex items-center justify-center border-2 border-surface">
              <span className="font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 uppercase">
                {user.first_name ? user.first_name.charAt(0) : 'U'}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">{t('home.hello') || 'GM,'}</p>
            <h1 className="text-xl font-black text-ink leading-tight truncate max-w-[150px]">
              {user.first_name} {user.last_name || ''}
            </h1>
          </div>
        </div>
        <motion.button 
          whileTap={{ scale: 0.85, rotate: 10 }}
          className="h-11 w-11 bg-surface border-b-[3px] border-x border-t border-border rounded-xl flex items-center justify-center text-ink shadow-sm active:translate-y-[2px] active:border-b-[1px] active:shadow-none transition-all"
        >
          <Bell size={20} className="text-ink-soft" />
        </motion.button>
      </motion.div>

      {/* Dynamic Streak Flame Badge */}
      <motion.div variants={itemVariants}>
        <StreakFlameBadge 
          streakDays={user.streak_days} 
          lastCheckin={user.last_checkin} 
        />
      </motion.div>

      {/* Hero Balance Card */}
      <motion.div variants={itemVariants} className="relative group perspective-1000">
        <motion.div 
          whileTap={{ scale: 0.97, rotateX: 2 }}
          className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 rounded-[2rem] p-6 overflow-hidden shadow-[0_15px_35px_-10px_rgba(139,92,246,0.4)] border-b-[4px] border-indigo-800/60 active:translate-y-[3px] active:border-b-[1px] active:shadow-none transition-all cursor-pointer"
        >
          {/* Animated Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 group-hover:bg-white/10 transition-all duration-700" style={{ filter: 'blur(20px)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-fuchsia-500/10 rounded-full translate-y-1/3 -translate-x-1/4" style={{ filter: 'blur(16px)' }} />
          <div className="absolute inset-0 bg-white/5" />
          
          <DopamineBalanceTicker 
            balance={user.balance} 
            speedPerHour={miningSpeed} 
            usdtRate={taskyPerUsdt} 
          />
        </motion.div>
      </motion.div>

      {/* Swap Dopamine Goal Card */}
      <motion.div variants={itemVariants}>
        <SwapProgressCard 
          balance={user.balance} 
          taskyPerUsdt={taskyPerUsdt} 
          targetUsd={1.00} 
          onNavigate={navigate}
        />
      </motion.div>

      {/* 2x2 Stats Grid - Gamified 3D Buttons */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
        <motion.div whileTap={{ scale: 0.95 }} className="bg-surface rounded-[1.5rem] p-4 border-b-[3px] border-x border-t border-border shadow-sm flex flex-col items-center text-center cursor-pointer active:translate-y-[2px] active:border-b-[1px] active:shadow-none transition-all relative overflow-hidden">
          <div className="absolute -right-2 -top-2 w-16 h-16 bg-blue-500/5 rounded-full" />
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3 border border-blue-500/20 text-blue-500">
            <Wallet size={20} />
          </div>
          <p className="text-xl font-black text-ink leading-none mb-1">{Math.floor(Number(user.balance)).toLocaleString()}</p>
          <p className="text-[11px] font-black text-ink-soft uppercase tracking-wider">{t('home.taskyBalance') || 'Balance'}</p>
        </motion.div>
        
        <motion.div whileTap={{ scale: 0.95 }} className="bg-surface rounded-[1.5rem] p-4 border-b-[3px] border-x border-t border-border shadow-sm flex flex-col items-center text-center cursor-pointer active:translate-y-[2px] active:border-b-[1px] active:shadow-none transition-all relative overflow-hidden">
          <div className="absolute -right-2 -top-2 w-16 h-16 bg-purple-500/5 rounded-full" />
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 border border-purple-500/20 text-purple-500">
            <Trophy size={20} />
          </div>
          <p className="text-xl font-black text-ink leading-none mb-1">{Number(user.total_earned || 0).toLocaleString()}</p>
          <p className="text-[11px] font-black text-ink-soft uppercase tracking-wider">{t('home.totalEarned') || 'Total Earned'}</p>
        </motion.div>

        <motion.div whileTap={{ scale: 0.95 }} className="bg-surface rounded-[1.5rem] p-4 border-b-[3px] border-x border-t border-border shadow-sm flex flex-col items-center text-center cursor-pointer active:translate-y-[2px] active:border-b-[1px] active:shadow-none transition-all relative overflow-hidden">
          <div className="absolute -left-2 -bottom-2 w-16 h-16 bg-emerald-500/5 rounded-full" />
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3 border border-emerald-500/20 text-emerald-500">
            <CheckCircle2 size={20} />
          </div>
          <p className="text-xl font-black text-ink leading-none mb-1">{Number(user.task_earnings || 0).toLocaleString()}</p>
          <p className="text-[11px] font-black text-ink-soft uppercase tracking-wider">{t('home.taskEarnings') || 'Task Income'}</p>
        </motion.div>

        <motion.div whileTap={{ scale: 0.95 }} className="bg-surface rounded-[1.5rem] p-4 border-b-[3px] border-x border-t border-border shadow-sm flex flex-col items-center text-center cursor-pointer active:translate-y-[2px] active:border-b-[1px] active:shadow-none transition-all relative overflow-hidden">
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-orange-500/5 rounded-full" />
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-3 border border-orange-500/20 text-orange-500">
            <Users size={20} />
          </div>
          <p className="text-xl font-black text-ink leading-none mb-1">{Number(user.referral_earnings || 0).toLocaleString()}</p>
          <p className="text-[11px] font-black text-ink-soft uppercase tracking-wider">{t('home.referralEarnings') || 'Ref Income'}</p>
        </motion.div>
      </motion.div>



      {/* Gamified Components */}
      <motion.div variants={itemVariants} className="space-y-4">
        <SpinWheel user={user} refreshUser={refreshUser} />
        <DailyCheckin user={user} refreshUser={refreshUser} />
      </motion.div>

      {/* How to Earn Info Card - Redesigned */}
      <motion.div variants={itemVariants}>
        <div className="bg-surface rounded-[2rem] p-5 border-b-[4px] border-x border-t border-border shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Star size={20} className="text-indigo-500 fill-indigo-500/20" />
            </div>
            <div>
              <h2 className="text-lg font-black text-ink leading-tight">How to Earn</h2>
              <p className="text-xs font-bold text-ink-soft">Master the platform</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-lg bg-surface-soft flex items-center justify-center shrink-0 border border-border font-black text-sm text-ink-soft">1</div>
              <div>
                <h4 className="text-sm font-black text-ink mb-0.5">Complete Tasks</h4>
                <p className="text-[13px] text-ink-soft leading-snug">Check the Missions tab daily. Provide proof to get approved fast.</p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-lg bg-surface-soft flex items-center justify-center shrink-0 border border-border font-black text-sm text-ink-soft">2</div>
              <div>
                <h4 className="text-sm font-black text-ink mb-0.5">Daily Check-in</h4>
                <p className="text-[13px] text-ink-soft leading-snug">Log in every day to claim bonuses up to <strong className="text-indigo-500 dark:text-indigo-400">500 TASKY</strong> on milestones.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-lg bg-surface-soft flex items-center justify-center shrink-0 border border-border font-black text-sm text-ink-soft">3</div>
              <div>
                <h4 className="text-sm font-black text-ink mb-0.5">Invite Friends</h4>
                <p className="text-[13px] text-ink-soft leading-snug">Earn <strong className="text-amber-500">{referralData?.reward_per_referral} TASKY</strong> and <strong className="text-amber-500">{referralData?.spin_reward_per_referral} Spins</strong> per active referral.</p>
              </div>
            </div>
          </div>

          <div className="mt-5 bg-gradient-to-r from-indigo-500/10 to-fuchsia-500/10 border border-indigo-500/20 p-4 rounded-2xl flex gap-3 items-center">
            <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-border">
              <Zap size={20} className="text-indigo-500 fill-indigo-500/20" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-indigo-500 uppercase tracking-wider mb-0.5">Withdraw to TON</p>
              <p className="text-[12px] text-ink-soft leading-tight">Minimum swap threshold is <strong className="text-ink">{swapRates.find(r => r.is_active)?.min_tasky || 3000} TASKY</strong>.</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Welcome Back Overnight Accrual Modal */}
      <WelcomeBackModal 
        user={user} 
        speedPerHour={miningSpeed} 
        onClaim={(claimedAmount) => {
          showToast(`+${claimedAmount} TASKY collected from passive mining! ⚡`, 'success');
          refreshUser();
        }} 
      />

    </motion.div>
  );
}


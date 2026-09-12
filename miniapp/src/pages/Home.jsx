import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Wallet, Trophy, CheckCircle2, Users, Info, Zap, ChevronRight, Star, ShieldCheck, Rocket, Sparkles } from 'lucide-react';
import DopamineBalanceTicker from '../components/DopamineBalanceTicker';
import StreakFlameBadge from '../components/StreakFlameBadge';
import WelcomeBackModal from '../components/WelcomeBackModal';
import SwapProgressCard from '../components/SwapProgressCard';
import TokenListingModal from '../components/TokenListingModal';
import CyberReactorModal from '../components/CyberReactorModal';
import { useIsAdmin } from '../AdminContext';

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
  const isAdmin = useIsAdmin();
  const [swapRates, setSwapRates] = useState([]);
  const [referralData, setReferralData] = useState(null);
  const [miningSpeed, setMiningSpeed] = useState(5.0);
  const [loading, setLoading] = useState(true);
  const [showListingModal, setShowListingModal] = useState(false);
  const [showReactorModal, setShowReactorModal] = useState(false);

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
      
      
      
    >
      {/* Launch Banner - Redesigned */}
      <motion.div 
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowListingModal(true)}
        className="relative overflow-hidden bg-gradient-to-r from-[#181135] via-[#1a1441] to-[#120a2e] border border-indigo-500/40 p-4 rounded-3xl text-left mb-2 mt-2 cursor-pointer shadow-lg group"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full group-hover:bg-indigo-500/20 transition-all"></div>
        <div className="absolute bottom-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
          <Rocket size={64} className="text-indigo-400 rotate-12" />
        </div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-500/20 p-1.5 rounded-lg border border-indigo-500/30">
                <Rocket size={14} className="text-indigo-300" />
              </div>
              <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                Listing Roadmap
              </span>
            </div>
            
            <h2 className="text-lg font-black text-white uppercase tracking-wide leading-tight">
              TASKY TOKEN <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">LAUNCH</span>
            </h2>
            
            <div className="flex items-center gap-2 mt-1">
               <div className="w-24 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                 <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 w-[87%] rounded-full shadow-[0_0_10px_rgba(56,189,248,0.8)]"></div>
               </div>
               <span className="text-[10px] font-bold text-cyan-300">Phase 1 (87%)</span>
            </div>
          </div>
          
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 group-hover:bg-indigo-500/40 transition-all">
            <ChevronRight size={16} className="text-indigo-300" />
          </div>
        </div>
      </motion.div>



      {/* Dynamic Streak Flame Badge */}
      <motion.div >
        <StreakFlameBadge 
          streakDays={user.streak_days} 
          lastCheckin={user.last_checkin} 
        />
      </motion.div>

      {/* Hero Balance Card */}
      <motion.div  className="relative group perspective-1000">
        <motion.div 
          whileTap={{ scale: 0.97, rotateX: 2 }}
          className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 rounded-[2rem] p-6 overflow-hidden  border-b-[4px] border-indigo-800/60 active:translate-y-[3px] active:border-b-[1px] active:shadow-none transition-all cursor-pointer"
        >
          {/* Animated Background Elements */}
          <div className="absolute inset-0 bg-white/5" />
          
          <DopamineBalanceTicker 
            balance={user.balance} 
            gramBalance={user.gram_balance}
            speedPerHour={miningSpeed} 
            usdtRate={taskyPerUsdt} 
          />
        </motion.div>
      </motion.div>

      {/* Swap Dopamine Goal Card */}
      <motion.div >
        <SwapProgressCard 
          balance={user.balance} 
          taskyPerUsdt={taskyPerUsdt} 
          targetUsd={1.00} 
        />
      </motion.div>

      {/* Cyber Ad Reactor Banner Card (Admin Only Preview) */}
      {isAdmin && (
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowReactorModal(true)}
          className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-r from-[#071329] via-[#091b3a] to-[#120e36] border border-cyan-500/50 text-white cursor-pointer shadow-lg shadow-cyan-500/15 hover:border-cyan-400 transition-all flex items-center justify-between group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 shadow-md shrink-0">
              <div className="w-full h-full bg-[#060b1e] rounded-2xl flex items-center justify-center text-cyan-300">
                <Zap size={22} className="animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  ⚡ Admin Preview • 5-Stage Overdrive
                </span>
              </div>
              <h3 className="text-sm font-black text-white flex items-center gap-1">
                Cyber Ad Reactor <span className="text-amber-400 font-bold text-xs">(1 USDT + 5 GRAM)</span>
              </h3>
              <p className="text-[11px] text-cyan-200/80 font-medium leading-tight">
                Inject USL plasma to power up the core and claim cash prizes!
              </p>
            </div>
          </div>
          <div className="shrink-0 pl-2 relative z-10">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 group-hover:bg-cyan-500/40 transition-all">
              <ChevronRight size={18} />
            </div>
          </div>
        </motion.div>
      )}

      {/* NFT Miners Banner Card */}
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate && navigate('nft')}
        className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-r from-[#1E1B4B] via-[#4C1D95] to-[#1E1B4B] border border-purple-500/40 text-white cursor-pointer shadow-lg hover:border-purple-500/60 transition-all flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-amber-500 p-0.5 shadow-md shrink-0">
            <div className="w-full h-full bg-[#0F0D24] rounded-2xl flex items-center justify-center text-amber-300">
              <Sparkles size={22} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                High Yield
              </span>
              <span className="text-xs font-black text-white">NFT Digital Miners</span>
            </div>
            <p className="text-[11px] text-purple-200/80 font-medium leading-tight">
              Earn guaranteed daily GRAM returns for 10 days!
            </p>
          </div>
        </div>
        <div className="shrink-0 pl-2">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-purple-300">
            <ChevronRight size={18} />
          </div>
        </div>
      </motion.div>

      {/* 2x2 Stats Grid - Gamified 3D Buttons */}
      <motion.div  className="grid grid-cols-2 gap-3">
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





      {/* How to Earn Info Card - Redesigned */}
      <motion.div >
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

      <TokenListingModal 
        isOpen={showListingModal} 
        onClose={() => setShowListingModal(false)} 
      />

      <CyberReactorModal
        isOpen={showReactorModal}
        onClose={() => {
          setShowReactorModal(false);
          refreshUser && refreshUser();
        }}
        user={user}
      />
    </motion.div>
  );
}


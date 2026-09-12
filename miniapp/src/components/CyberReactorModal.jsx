import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, CheckCircle2, Clock, X, Award, Flame, Lock, Timer, 
  Sparkles, ChevronRight, Gem, AlertTriangle, Play, ShieldAlert,
  HelpCircle, ArrowRight, Trophy, Radio, Target
} from 'lucide-react';
import triggerConfetti from '../confetti';
import { showTowerAd, showRewardedAd } from '../adUtils';
import { getReactorStatus, recordReactorAdView, claimReactorReward } from '../api';
import { useToast } from '../App';

const DURATION_7_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const LS_START_KEY = 'tasky_reactor_7day_start';

export function getReactorDeadlineMs() {
  try {
    let saved = localStorage.getItem(LS_START_KEY);
    if (!saved) {
      saved = Date.now().toString();
      localStorage.setItem(LS_START_KEY, saved);
    }
    return parseInt(saved, 10) + DURATION_7_DAYS_MS;
  } catch {
    return Date.now() + DURATION_7_DAYS_MS;
  }
}

export function calcReactorTimeLeft() {
  const deadline = getReactorDeadlineMs();
  const diff = Math.max(0, deadline - Date.now());
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return {
    total: diff,
    isExpired: diff <= 0,
    formatted: `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`,
    short: `${d}d ${h}h ${m}m`,
    d, h, m, s
  };
}

export function useReactorTimer() {
  const [timeLeft, setTimeLeft] = useState(calcReactorTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      const tl = calcReactorTimeLeft();
      setTimeLeft(tl);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return timeLeft;
}

const STAGES = [
  { 
    stage: 1, 
    target: 100, 
    reward_tasky: 2000, 
    reward_grams: 0.10, 
    badge: 'STAGE 1',
    title: 'Core Ignition', 
    subtitle: '+2,000 TASKY Milestone',
    color: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-400/40',
    icon: '⚡'
  },
  { 
    stage: 2, 
    target: 250, 
    reward_tasky: 5000, 
    reward_grams: 0.25, 
    badge: 'STAGE 2',
    title: 'Plasma Surge', 
    subtitle: '+5,000 TASKY Milestone',
    color: 'from-blue-500 to-indigo-600',
    border: 'border-blue-400/40',
    icon: '🔋'
  },
  { 
    stage: 3, 
    target: 500, 
    reward_tasky: 10000, 
    reward_grams: 0.50, 
    badge: 'HALFWAY',
    title: 'Fusion Overdrive', 
    subtitle: '+10,000 TASKY Halfway Bonus',
    color: 'from-purple-500 to-pink-600',
    border: 'border-purple-400/50',
    icon: '💥'
  },
  { 
    stage: 4, 
    target: 750, 
    reward_tasky: 15000, 
    reward_grams: 0.75, 
    badge: 'STAGE 4',
    title: 'Quantum Warp', 
    subtitle: '+15,000 TASKY Pre-Jackpot',
    color: 'from-fuchsia-500 to-rose-600',
    border: 'border-fuchsia-400/50',
    icon: '🚀'
  },
  { 
    stage: 5, 
    target: 1000, 
    reward_tasky: 20000, 
    reward_grams: 2.00, 
    badge: 'ULTRA JACKPOT',
    title: 'GRAND CASH VAULT', 
    subtitle: '🔥 2.00 GRAM + 20,000 TASKY',
    color: 'from-amber-400 via-yellow-400 to-amber-500',
    border: 'border-amber-400 shadow-lg shadow-amber-500/30',
    icon: '👑'
  }
];

export default function CyberReactorModal({ isOpen, onClose, user }) {
  const { showToast } = useToast();
  const timeLeft = useReactorTimer();
  const [loading, setLoading] = useState(true);
  const [adWatching, setAdWatching] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [walletInput, setWalletInput] = useState('');

  const [reactorData, setReactorData] = useState({
    total_ads: 0,
    current_stage: 0,
    next_target: 100,
    stages: STAGES,
    active_claim: null,
    user_wallet: '',
    can_claim: false
  });

  const fetchStatus = async () => {
    if (!user?.telegram_id) return;
    try {
      const { data } = await getReactorStatus(user.telegram_id);
      if (data && data.success) {
        setReactorData(data);
        if (data.user_wallet && !walletInput) {
          setWalletInput(data.user_wallet);
        }
      }
    } catch (e) {
      console.error('[CyberReactor] Status fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user?.telegram_id) {
      fetchStatus();
    }
  }, [isOpen, user?.telegram_id]);

  const handleWatchAd = async () => {
    if (adWatching) return;
    if (timeLeft.isExpired) {
      showToast('⚠️ The 7-Day Cyber Reactor event has expired!', 'error');
      return;
    }
    setAdWatching(true);

    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }

      // 1. Play USL / Rewarded Ad
      let res = await showTowerAd();
      if (!res?.success) {
        res = await showRewardedAd('usl');
      }

      if (!res?.success) {
        showToast(res?.error || 'Ad was closed early. Complete full video to charge!', 'error');
        setAdWatching(false);
        return;
      }

      // 2. Record ad view on backend
      const recordRes = await recordReactorAdView(user.telegram_id);
      if (recordRes.data?.success) {
        const newTotal = recordRes.data.total_ads;
        const oldStage = reactorData.current_stage;
        const newStage = recordRes.data.stage;

        if (newStage > oldStage) {
          triggerConfetti({ particleCount: 140, spread: 90 });
          showToast(`🏆 STAGE ${newStage} UNLOCKED! (${newTotal}/1000 Ads Completed)`, 'success');
        } else {
          showToast(`⚡ Plasma Injected! (${newTotal}/1000 Ads Charged)`, 'success');
        }

        fetchStatus();
      } else {
        showToast(recordRes.error || 'Failed to record progress. Please retry.', 'error');
      }
    } catch (err) {
      console.error('[CyberReactor] Ad error:', err);
      showToast('Ad network busy. Try again in a few seconds!', 'error');
    } finally {
      setAdWatching(false);
    }
  };

  const handleClaimSubmit = async () => {
    if (!walletInput || walletInput.trim().length < 8) {
      showToast('Please enter a valid TON or GRAM address', 'error');
      return;
    }

    setClaiming(true);
    try {
      const { data, error } = await claimReactorReward(user.telegram_id, walletInput.trim());
      if (error) {
        showToast(error, 'error');
        return;
      }

      if (data?.success) {
        triggerConfetti({ particleCount: 180, spread: 110 });
        showToast('🎉 GRAND JACKPOT CLAIM SUBMITTED! Admin will disburse your 2.00 GRAM!', 'success');
        setShowClaimModal(false);
        fetchStatus();
      }
    } catch (e) {
      showToast('Network error submitting claim', 'error');
    } finally {
      setClaiming(false);
    }
  };

  if (!isOpen) return null;

  const totalAds = reactorData.total_ads || 0;
  const currentStage = reactorData.current_stage || 0;
  const activeClaim = reactorData.active_claim;
  const maxTarget = 1000;
  const progressPct = Math.min((totalAds / maxTarget) * 100, 100);
  const is1kCompleted = totalAds >= 1000;
  const canClaim = is1kCompleted && (!activeClaim || activeClaim.status === 'approved' || activeClaim.status === 'rejected');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-xl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 25 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          className="relative w-full max-w-md my-auto rounded-[2rem] overflow-hidden border-2 border-cyan-400/50 shadow-[0_0_50px_rgba(6,182,212,0.35)]"
          style={{ background: 'radial-gradient(circle at 50% 0%, #0d1e48 0%, #070c20 40%, #03050d 100%)' }}
        >
          {/* Top Hologram Neon Edge Beam */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400 animate-pulse" />
          
          {/* Ambient Lighting Orbs */}
          <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-cyan-500/20 blur-[60px] pointer-events-none" />
          <div className="absolute top-1/2 -left-28 w-56 h-56 rounded-full bg-purple-600/20 blur-[60px] pointer-events-none" />
          <div className="absolute -bottom-24 right-0 w-60 h-60 rounded-full bg-amber-500/20 blur-[60px] pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/90 transition-all active:scale-90"
          >
            <X size={16} />
          </button>

          <div className="relative p-5 sm:p-6 text-white max-h-[88vh] overflow-y-auto hide-scrollbar">
            
            {/* 1. Live Hyperspace 7-Day Countdown Header */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-purple-500/15 to-cyan-500/20 border border-amber-400/40 mb-4 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 shadow-md shadow-amber-400" />
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block leading-tight">
                    🔥 Event Clock
                  </span>
                  <span className="text-[9px] font-bold text-slate-300">
                    Disappears in:
                  </span>
                </div>
              </div>
              
              {/* Digital Countdown Ticker Boxes */}
              <div className="flex items-center gap-1 font-mono font-black text-xs">
                <div className="bg-black/70 px-2 py-1 rounded-lg border border-amber-400/40 text-amber-300 shadow-inner">
                  {timeLeft.d}d
                </div>
                <span className="text-amber-400">:</span>
                <div className="bg-black/70 px-2 py-1 rounded-lg border border-amber-400/40 text-amber-300 shadow-inner">
                  {String(timeLeft.h).padStart(2, '0')}h
                </div>
                <span className="text-amber-400">:</span>
                <div className="bg-black/70 px-2 py-1 rounded-lg border border-amber-400/40 text-amber-300 shadow-inner">
                  {String(timeLeft.m).padStart(2, '0')}m
                </div>
                <span className="text-amber-400">:</span>
                <div className="bg-black/70 px-2 py-1 rounded-lg border border-amber-400/40 text-amber-300 shadow-inner">
                  {String(timeLeft.s).padStart(2, '0')}s
                </div>
              </div>
            </div>

            {/* 2. Mega Dopamine Title & Jackpot Callout */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border border-cyan-400/50 text-cyan-200 shadow-md mb-2">
                <Sparkles size={12} className="text-amber-300 animate-spin" />
                ⚡ CYBER OVERDRIVE EVENT
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-yellow-200 to-amber-400 drop-shadow-[0_2px_15px_rgba(234,179,8,0.4)]">
                Cyber Ad Reactor ⚡
              </h2>
              
              {/* Grand Jackpot Cashout Pill */}
              <div className="mt-2 p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border-2 border-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2">
                <span className="text-xl animate-bounce">💎</span>
                <div className="text-left">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-300/90 leading-none">
                    Grand 1,000 Ads Jackpot
                  </div>
                  <div className="text-base font-black text-amber-400 tracking-wide font-mono leading-tight">
                    2.00 GRAM + 20,000 TASKY
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Interactive 3D Glowing Plasma Reactor Core Visualizer */}
            <div className="relative rounded-3xl p-5 mb-4 border border-cyan-400/40 bg-gradient-to-b from-[#081534] via-[#040816] to-black overflow-hidden text-center shadow-[inset_0_0_30px_rgba(6,182,212,0.2)]">
              
              {/* Multi-Ring Rotating Plasma Core */}
              <div className="relative w-36 h-36 mx-auto mb-3 flex items-center justify-center">
                {/* Outer Dashed Orbit */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 9, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/60"
                />
                
                {/* Inner Counter-Rotating Orbit */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                  className="absolute inset-2 rounded-full border border-purple-500/50"
                />
                
                {/* Pulsing Energy Aura */}
                <motion.div
                  animate={{ scale: [0.9, 1.2, 0.9], opacity: [0.4, 0.9, 0.4] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                  className="absolute inset-3 rounded-full bg-gradient-to-tr from-cyan-500/30 via-purple-500/30 to-amber-500/30 blur-xl"
                />
                
                {/* Central Solid Core */}
                <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-b from-slate-900 to-black border-2 border-cyan-300 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.8)]">
                  <span className="text-3xl select-none filter drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">💎</span>
                  <span className="text-xs font-black text-amber-400 tracking-wider mt-0.5">
                    2.00 GRAM
                  </span>
                  <span className="text-[10px] font-bold text-cyan-300 font-mono">
                    {totalAds} / {maxTarget}
                  </span>
                </div>
              </div>

              {/* Live Reactor Status Output */}
              <div className="flex items-center justify-between text-xs font-black mb-1.5 px-1">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Radio size={12} className="text-cyan-400 animate-pulse" />
                  Reactor Overdrive
                </span>
                <span className="text-cyan-300 font-mono font-black">{progressPct.toFixed(1)}% CHARGED</span>
              </div>

              {/* Glowing Liquid Progress Track */}
              <div className="relative h-4 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-cyan-500/40 shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-amber-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] relative overflow-hidden"
                >
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
                    className="absolute inset-0 w-1/2 bg-white/40 skew-x-12"
                  />
                </motion.div>
              </div>

              <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1.5 px-1 font-mono">
                <span>0</span>
                <span>250 (S2)</span>
                <span>500 (S3)</span>
                <span>750 (S4)</span>
                <span className="text-amber-400 font-black">1,000 👑</span>
              </div>
            </div>

            {/* 4. Gamified RPG Milestone Stages Track */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Trophy size={14} className="text-amber-400" /> Milestone Reward Track
                </span>
                <span className="text-[10px] font-bold text-cyan-300">
                  {5 - currentStage} Stages Left
                </span>
              </div>

              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {STAGES.map((s) => {
                  const isUnlocked = totalAds >= s.target;
                  const isCurrent = currentStage === s.stage;

                  return (
                    <div
                      key={s.stage}
                      className={`relative overflow-hidden flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                        isUnlocked
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200 shadow-sm'
                          : isCurrent
                          ? 'bg-gradient-to-r from-purple-950/70 to-indigo-950/70 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                          : 'bg-white/5 border-white/10 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shadow-md ${
                            isUnlocked
                              ? 'bg-gradient-to-br from-cyan-400 to-teal-500 text-black'
                              : isCurrent
                              ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white animate-pulse'
                              : 'bg-white/10 text-white/60'
                          }`}
                        >
                          {isUnlocked ? <CheckCircle2 size={16} /> : s.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white leading-tight">
                              {s.title}
                            </span>
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-white/10 text-amber-300">
                              {s.target} Ads
                            </span>
                          </div>
                          <div className="text-[11px] text-amber-300 font-bold mt-0.5">
                            {s.subtitle}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 pl-2 text-right">
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-xl shadow-sm inline-block ${
                            isUnlocked
                              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                              : isCurrent
                              ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50'
                              : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          {isUnlocked ? 'DONE ✅' : `${Math.max(0, s.target - totalAds)} left`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Pending Claim Banner */}
            {activeClaim && activeClaim.status === 'pending' && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-400/50 text-amber-200 text-xs mb-3 flex items-start gap-3 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <Clock size={20} className="shrink-0 mt-0.5 text-amber-400 animate-spin" />
                <div>
                  <div className="font-black text-amber-300 text-sm">2.00 GRAM Claim In Review Queue!</div>
                  <div className="text-[11px] text-amber-100/90 mt-0.5 leading-snug">
                    Your 1,000 Ads verification is confirmed. The Admin will disburse your <b>2.00 GRAM + 20,000 TASKY</b> to your wallet shortly!
                  </div>
                </div>
              </div>
            )}

            {/* 5. Gamified Ad Completion Quest Instructions */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/70 via-slate-900 to-amber-950/50 border-2 border-amber-500/50 text-xs mb-4 shadow-xl">
              <div className="flex items-center gap-2 font-black text-amber-300 mb-2">
                <AlertTriangle size={17} className="shrink-0 text-amber-400 animate-bounce" />
                <span className="uppercase tracking-wider text-[11px]">⚠️ Rules to Make Your Ad Count</span>
              </div>
              <div className="space-y-1.5 text-[11.5px] text-slate-200">
                <div className="flex items-start gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                  <span className="text-cyan-400 font-black">1.</span>
                  <span><strong className="text-white">Watch full video</strong> until timer reaches zero (0s).</span>
                </div>
                <div className="flex items-start gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                  <span className="text-amber-400 font-black">2.</span>
                  <span><strong className="text-amber-300">Tap the sponsor button / action</strong> that appears at the end of the ad.</span>
                </div>
                <div className="flex items-start gap-2 bg-rose-950/60 p-1.5 rounded-xl border border-rose-500/30">
                  <span className="text-rose-400 font-black">3.</span>
                  <span><strong className="text-rose-300">DO NOT click 'X' immediately!</strong> Closing prematurely will cancel verification and will NOT count towards your 2.00 GRAM jackpot.</span>
                </div>
              </div>
            </div>

            {/* 6. Massive 3D Tactile Watch & Claim Action Buttons */}
            <div className="flex flex-col gap-2.5">
              {/* Watch Ad Mega Button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleWatchAd}
                disabled={adWatching || timeLeft.isExpired}
                className="relative overflow-hidden w-full py-4 rounded-2xl font-black text-sm text-black flex flex-col items-center justify-center gap-0.5 bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.45)] hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                {adWatching ? (
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                    />
                    <span className="text-sm font-black uppercase tracking-wider">Injecting Plasma Charge...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-base">
                      <Zap size={18} fill="black" />
                      <span>⚡ INJECT PLASMA (WATCH AD)</span>
                    </div>
                    <span className="text-[10px] font-bold text-black/75 tracking-wider uppercase">
                      Unlimited Binge Watching • No Daily Limits
                    </span>
                  </>
                )}
              </motion.button>

              {/* Claim Reward Button (Only active when 1,000 ads are reached) */}
              {canClaim ? (
                <motion.button
                  animate={{ scale: [1, 1.03, 1], boxShadow: ['0 0 20px rgba(245,158,11,0.5)', '0 0 40px rgba(245,158,11,0.9)', '0 0 20px rgba(245,158,11,0.5)'] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                  onClick={() => setShowClaimModal(true)}
                  className="w-full py-4 rounded-2xl font-black text-sm text-black flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:brightness-110 active:scale-98 transition-all shadow-2xl cursor-pointer border-2 border-yellow-200"
                >
                  <Award size={20} />
                  <span>🎉 CLAIM 2.00 GRAM + 20,000 TASKY!</span>
                </motion.button>
              ) : (
                <div className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-slate-300 flex items-center justify-center gap-2 font-bold">
                  <Lock size={14} className="text-amber-400" />
                  <span>2.00 GRAM Unlocks at 1,000 Ads ({totalAds} / 1,000 Completed)</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Claim Submission Modal */}
        {showClaimModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-sm rounded-3xl p-6 bg-slate-900 border-2 border-amber-500/50 shadow-2xl text-white"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award size={24} className="text-amber-400 animate-bounce" />
                  <h3 className="font-black text-lg">Claim 2.00 GRAM Jackpot</h3>
                </div>
                <button onClick={() => setShowClaimModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 to-yellow-950/40 border border-amber-500/40 text-xs mb-4 text-slate-200 space-y-1">
                <div className="font-bold text-amber-300">🏆 1,000 USL Ads Completed!</div>
                <div className="text-amber-400 font-black text-base">Reward: 2.00 GRAM + 20,000 TASKY</div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Your TON / GRAM Wallet Address:
                </label>
                <input
                  type="text"
                  value={walletInput}
                  onChange={(e) => setWalletInput(e.target.value)}
                  placeholder="e.g. UQ... or EQ..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="text-[11px] text-slate-400 mb-5 flex items-center gap-2 bg-black/30 p-2 rounded-xl">
                <Clock size={14} className="text-amber-400 shrink-0" />
                <span>Admin review queue. Payout will be sent directly to your wallet!</span>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowClaimModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClaimSubmit}
                  disabled={claiming}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-black text-xs flex items-center justify-center gap-1 shadow-lg hover:brightness-110 disabled:opacity-50"
                >
                  {claiming ? 'Submitting...' : 'Confirm Claim'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}

/**
 * Sticky Floating Bubble widget for 1-tap access anywhere
 */
export function CyberReactorFloatingBubble({ user, onOpen }) {
  const timeLeft = useReactorTimer();

  // Hide if timer expired
  if (timeLeft.isExpired) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="fixed z-40 flex flex-col items-end gap-1.5 pointer-events-auto"
      style={{ bottom: '160px', right: '14px' }}
    >
      {/* Live Timer Pill */}
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black text-black whitespace-nowrap shadow-lg shadow-amber-500/50 border border-yellow-200"
        style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}
      >
        <Timer size={10} strokeWidth={3} /> {timeLeft.short}
      </motion.div>

      {/* Futuristic Plasma Core Orb Button */}
      <motion.button
        onClick={onOpen}
        animate={{ rotate: [0, -6, 6, -4, 4, 0], scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut', repeatDelay: 1.2 }}
        whileTap={{ scale: 0.88 }}
        className="relative flex flex-col items-center justify-center overflow-hidden cursor-pointer shadow-[0_0_25px_rgba(6,182,212,0.65)]"
        style={{
          width: '62px',
          height: '62px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 30%, #153e75, #071533 60%, #1e0e47 100%)',
          border: '2.5px solid rgba(6,182,212,0.9)',
        }}
      >
        {/* Rotating Outer Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
          className="absolute inset-0 rounded-full border border-dashed border-cyan-400/60 pointer-events-none"
        />
        
        <span className="text-[20px] leading-none mb-0.5 select-none drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]">💎</span>
        <span className="text-[10px] font-black leading-none text-amber-300 font-mono drop-shadow">2 GRAM</span>
        <span className="text-[8px] font-black text-cyan-300 leading-none mt-0.5 uppercase tracking-tighter">1K ADS</span>
      </motion.button>
    </motion.div>
  );
}

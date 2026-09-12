import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle2, Clock, X, Award, Flame, Lock, Timer, Sparkles, ChevronRight, Gem } from 'lucide-react';
import triggerConfetti from '../confetti';
import { showTowerAd, showRewardedAd } from '../adUtils';
import { getReactorStatus, recordReactorAdView, claimReactorReward } from '../api';
import { useToast } from '../App';
import { useIsAdmin } from '../AdminContext';

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
    short: `${d}d ${h}h ${m}m`
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
  { stage: 1, target: 100, reward_tasky: 10000, reward_grams: 0.10, title: '⚡ Stage 1: Core Ignition (10%)', subtitle: '+10,000 TASKY Milestone' },
  { stage: 2, target: 250, reward_tasky: 25000, reward_grams: 0.25, title: '🔋 Stage 2: Plasma Pulse (25%)', subtitle: '+25,000 TASKY Milestone' },
  { stage: 3, target: 500, reward_tasky: 50000, reward_grams: 0.50, title: '💥 Stage 3: Fusion Overdrive (50%)', subtitle: '+50,000 TASKY Halfway Bonus' },
  { stage: 4, target: 750, reward_tasky: 75000, reward_grams: 0.75, title: '🚀 Stage 4: Quantum Surge (75%)', subtitle: '+75,000 TASKY Pre-Jackpot' },
  { stage: 5, target: 1000, reward_tasky: 200000, reward_grams: 2.00, title: '👑 Stage 5: GRAND JACKPOT (100%)', subtitle: '🔥 2.00 GRAM + 200,000 TASKY CASH OUT!' }
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
        showToast(res?.error || 'Ad was not fully completed. Watch full video to charge!', 'error');
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
          triggerConfetti({ particleCount: 110, spread: 85 });
          showToast(`🏆 STAGE ${newStage} UNLOCKED! (${newTotal}/1000 Ads Completed)`, 'success');
        } else {
          showToast(`⚡ Plasma Core Injected! (${newTotal}/1000 Ads)`, 'success');
        }

        fetchStatus();
      } else {
        showToast(recordRes.error || 'Failed to record progress. Please retry.', 'error');
      }
    } catch (err) {
      console.error('[CyberReactor] Ad error:', err);
      showToast('Ad service temporary busy. Try again in a second!', 'error');
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
        triggerConfetti({ particleCount: 140, spread: 100 });
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          className="relative w-full max-w-md my-auto rounded-3xl overflow-hidden border border-cyan-400/40 shadow-2xl shadow-cyan-500/25"
          style={{ background: 'linear-gradient(165deg, #070919 0%, #0d1538 50%, #040612 100%)' }}
        >
          {/* Animated Neon Edge Glow */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-purple-500 to-amber-400" />
          <div className="absolute -top-20 -right-20 w-52 h-52 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-52 h-52 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white/80 transition-all active:scale-95"
          >
            <X size={16} />
          </button>

          <div className="relative p-5 sm:p-6 text-white">
            {/* 7-Day Live Countdown Bar */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-cyan-500/15 border border-amber-500/30 mb-4 shadow-inner">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                  🔥 Event Ends In:
                </span>
              </div>
              <div className="font-mono font-black text-xs text-amber-400 tracking-wider bg-black/40 px-2.5 py-1 rounded-xl border border-amber-500/20">
                {timeLeft.formatted}
              </div>
            </div>

            {/* Title & Dopamine Subtitle */}
            <div className="text-center mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-sm mb-1.5">
                <Sparkles size={11} className="animate-spin" /> 7-Day Hyper Overdrive
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-amber-200 to-yellow-400">
                Cyber Ad Reactor ⚡
              </h2>
              <p className="text-xs text-slate-300 font-medium mt-1">
                Conquer 1,000 Ads before time expires & claim <b className="text-amber-400 font-black">2.00 GRAM + 200K TASKY</b>!
              </p>
            </div>

            {/* Glowing Core Reactor Visualizer */}
            <div className="relative rounded-2xl p-5 mb-4 border border-cyan-400/30 bg-gradient-to-b from-cyan-950/50 via-slate-950/90 to-black overflow-hidden text-center shadow-xl">
              {/* Spinning Neon Energy Ring */}
              <div className="relative w-32 h-32 mx-auto mb-3 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 7, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/70"
                />
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  className="absolute inset-2 rounded-full bg-cyan-500/25 blur-lg"
                />
                <div className="relative z-10 w-24 h-24 rounded-full bg-slate-950 border-2 border-cyan-400 flex flex-col items-center justify-center shadow-2xl shadow-cyan-500/60">
                  <span className="text-2xl select-none">💎</span>
                  <span className="text-xs font-black text-amber-400 tracking-wider">
                    2.00 GRAM
                  </span>
                  <span className="text-[10px] font-bold text-cyan-300 font-mono">
                    {totalAds} / {maxTarget}
                  </span>
                </div>
              </div>

              {/* Live Output & Percentage */}
              <div className="flex items-center justify-between text-xs font-black mb-1.5 px-1">
                <span className="text-slate-400 uppercase tracking-wider text-[10px]">Plasma Power Level</span>
                <span className="text-cyan-300">{progressPct.toFixed(1)}% CHARGED</span>
              </div>

              {/* Progress Bar with Liquid Glow */}
              <div className="relative h-4 rounded-full bg-slate-900 overflow-hidden p-0.5 border border-cyan-500/30 shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-amber-400 shadow-lg shadow-cyan-400/60 relative overflow-hidden"
                >
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    className="absolute inset-0 w-1/2 bg-white/30 skew-x-12"
                  />
                </motion.div>
              </div>

              <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1 px-1 font-mono">
                <span>0</span>
                <span>250 (S2)</span>
                <span>500 (S3)</span>
                <span>750 (S4)</span>
                <span className="text-amber-400 font-black">1,000 (JACKPOT)</span>
              </div>
            </div>

            {/* Stages Milestone List */}
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-1">
              {STAGES.map((s) => {
                const isUnlocked = totalAds >= s.target;
                const isCurrent = currentStage === s.stage;

                return (
                  <div
                    key={s.stage}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                      isUnlocked
                        ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                        : isCurrent
                        ? 'bg-purple-950/50 border-purple-400/50 text-white shadow-md'
                        : 'bg-white/5 border-white/5 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                          isUnlocked
                            ? 'bg-cyan-400 text-black'
                            : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {isUnlocked ? <CheckCircle2 size={13} /> : `S${s.stage}`}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white leading-tight">
                          {s.title}
                        </div>
                        <div className="text-[10px] text-amber-300 font-semibold">
                          {s.subtitle}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                        isUnlocked
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {isUnlocked ? 'DONE ✅' : `${Math.max(0, s.target - totalAds)} left`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Active Pending Claim Notice */}
            {activeClaim && activeClaim.status === 'pending' && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mb-3 flex items-start gap-2.5">
                <Clock size={18} className="shrink-0 mt-0.5 text-amber-400 animate-spin" />
                <div>
                  <div className="font-bold">2.00 GRAM Claim Under Review</div>
                  <div className="text-[11px] text-amber-200/80 mt-0.5">
                    Your 1,000 ads completion is verified. Admin will disburse the 2.00 GRAM + 200K TASKY to your wallet!
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              {/* Watch Ad Button */}
              <button
                onClick={handleWatchAd}
                disabled={adWatching || timeLeft.isExpired}
                className="w-full py-3.5 rounded-2xl font-black text-sm text-black flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 shadow-lg shadow-cyan-400/30 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                {adWatching ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-black border-t-transparent rounded-full"
                    />
                    Injecting Plasma Charge...
                  </>
                ) : (
                  <>
                    <Zap size={16} fill="black" />
                    ⚡ Inject Plasma (Watch Ad • No Limit)
                  </>
                )}
              </button>

              {/* Claim Reward Button (Only active when 1,000 ads are reached) */}
              {canClaim ? (
                <motion.button
                  animate={{ scale: [1, 1.02, 1], boxShadow: ['0 0 15px rgba(245,158,11,0.4)', '0 0 30px rgba(245,158,11,0.7)', '0 0 15px rgba(245,158,11,0.4)'] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  onClick={() => setShowClaimModal(true)}
                  className="w-full py-3.5 rounded-2xl font-black text-sm text-black flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:brightness-110 active:scale-98 transition-all shadow-xl cursor-pointer"
                >
                  <Award size={18} />
                  🎉 CLAIM 2.00 GRAM + 200,000 TASKY!
                </motion.button>
              ) : (
                <div className="w-full py-2.5 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-slate-300 flex items-center justify-center gap-1.5 font-bold">
                  <Lock size={13} className="text-amber-400" />
                  <span>2.00 GRAM Unlocks at 1,000 Ads ({totalAds} / 1,000 Done)</span>
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
              className="relative w-full max-w-sm rounded-3xl p-6 bg-slate-900 border border-amber-500/40 shadow-2xl text-white"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award size={22} className="text-amber-400" />
                  <h3 className="font-bold text-base">Claim 2.00 GRAM Jackpot</h3>
                </div>
                <button onClick={() => setShowClaimModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs mb-4 text-slate-300 space-y-1">
                <div>🏆 <b>1,000 USL Ads Completed!</b></div>
                <div className="text-amber-400 font-black text-sm">Reward: 2.00 GRAM + 200,000 TASKY</div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Your TON / GRAM Wallet Address:
                </label>
                <input
                  type="text"
                  value={walletInput}
                  onChange={(e) => setWalletInput(e.target.value)}
                  placeholder="e.g. UQ... or EQ..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="text-[11px] text-slate-400 mb-5 flex items-center gap-1.5">
                <Clock size={12} className="text-amber-400 shrink-0" />
                <span>Admin review queue. Payout sent directly to your wallet!</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowClaimModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClaimSubmit}
                  disabled={claiming}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-extrabold text-xs flex items-center justify-center gap-1 disabled:opacity-50"
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
  const isAdmin = useIsAdmin();
  const timeLeft = useReactorTimer();

  // Hide if not admin or if timer expired
  if (!isAdmin || timeLeft.isExpired) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="fixed z-40 flex flex-col items-end gap-1 pointer-events-auto"
      style={{ bottom: '160px', right: '14px' }}
    >
      {/* Live Timer Pill */}
      <motion.div
        animate={{ y: [0, -2, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black text-black whitespace-nowrap shadow-lg shadow-amber-500/50"
        style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}
      >
        <Timer size={9} strokeWidth={3} /> {timeLeft.short}
      </motion.div>

      {/* Circle Icon Button */}
      <motion.button
        onClick={onOpen}
        animate={{ rotate: [0, -5, 5, -3, 3, 0], scale: [1, 1.04, 1] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut', repeatDelay: 1.5 }}
        whileTap={{ scale: 0.9 }}
        className="relative w-15 h-15 rounded-full flex flex-col items-center justify-center overflow-hidden cursor-pointer shadow-2xl"
        style={{
          width: '58px',
          height: '58px',
          background: 'linear-gradient(145deg, #071533, #1e0e47)',
          border: '2px solid rgba(6,182,212,0.85)',
          boxShadow: '0 4px 20px rgba(6,182,212,0.6), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}
      >
        <span className="text-[18px] leading-none mb-0.5 select-none">💎</span>
        <span className="text-[10px] font-black leading-none text-amber-400 font-mono">2 GRAM</span>
        <span className="text-[7px] font-bold text-cyan-300 leading-none mt-0.5">1K ADS</span>
      </motion.button>
    </motion.div>
  );
}

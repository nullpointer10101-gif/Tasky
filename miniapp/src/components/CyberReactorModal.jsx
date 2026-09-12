import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, CheckCircle2, Clock, X, Award, Flame, Lock, Timer, 
  Sparkles, ChevronRight, Gem, AlertTriangle, Play, ShieldAlert,
  ArrowRight, Trophy, Radio, Target, BatteryCharging, Gauge,
  Coins, Star, Check
} from 'lucide-react';
import triggerConfetti from '../confetti';
import { showTowerAd } from '../adUtils';
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
    badge: '10%',
    title: 'Core Spark', 
    subtitle: '+2,000 TASKY',
    icon: '⚡',
    color: 'from-cyan-400 to-blue-500'
  },
  { 
    stage: 2, 
    target: 250, 
    reward_tasky: 5000, 
    reward_grams: 0.25, 
    badge: '25%',
    title: 'Plasma Pulse', 
    subtitle: '+5,000 TASKY',
    icon: '🔋',
    color: 'from-blue-500 to-indigo-500'
  },
  { 
    stage: 3, 
    target: 500, 
    reward_tasky: 10000, 
    reward_grams: 0.50, 
    badge: '50% 💥',
    title: 'Fusion Overdrive', 
    subtitle: '+10,000 TASKY (Halfway Bonus)',
    icon: '💥',
    color: 'from-purple-500 to-fuchsia-500'
  },
  { 
    stage: 4, 
    target: 750, 
    reward_tasky: 15000, 
    reward_grams: 0.75, 
    badge: '75%',
    title: 'Quantum Hyperdrive', 
    subtitle: '+15,000 TASKY',
    icon: '🚀',
    color: 'from-fuchsia-500 to-rose-500'
  },
  { 
    stage: 5, 
    target: 1000, 
    reward_tasky: 20000, 
    reward_grams: 2.00, 
    badge: '100% 👑',
    title: 'THE 2.00 GRAM VAULT', 
    subtitle: '🔥 2.00 GRAM + 20,000 TASKY',
    icon: '💎',
    color: 'from-amber-400 via-yellow-300 to-amber-500'
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
        window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
      }

      // 1. Play USL Ads strictly (TowerAds SDK v4)
      const res = await showTowerAd();

      if (!res?.success) {
        showToast(res?.error || 'USL ad was closed early. Watch the full ad to charge!', 'error');
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
          triggerConfetti({ particleCount: 160, spread: 100 });
          showToast(`🏆 STAGE ${newStage} UNLOCKED! (${newTotal}/1000 Ads Completed)`, 'success');
        } else {
          showToast(`⚡ Core Charged! (${newTotal}/1000 Ads)`, 'success');
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
        triggerConfetti({ particleCount: 200, spread: 120 });
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
      <div 
        className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/85"
        style={{ overscrollBehavior: 'contain' }}
      >
        {/* Backdrop dismiss */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.96 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md max-h-[92vh] flex flex-col rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden border border-cyan-400/50 shadow-2xl bg-[#070e24] z-10"
        >
          {/* Top Neon Border Accent */}
          <div className="h-1.5 w-full bg-gradient-to-r from-cyan-400 via-purple-500 to-amber-400 shrink-0" />

          {/* 1. STICKY TOP HEADER */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0a1435] border-b border-cyan-500/20 shrink-0 text-white">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-90" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-amber-300 font-mono">
                ⚡ 7-Day Cyber Reactor
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-xl border border-amber-400/40 text-amber-300 font-mono font-black text-xs">
                <Timer size={12} className="text-amber-400" />
                <span>{timeLeft.formatted}</span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-90"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* 2. SMOOTH SCROLLABLE CONTENT BODY */}
          <div 
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-white"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              overscrollBehavior: 'contain'
            }}
          >
            {/* GRAND JACKPOT VAULT BANNER */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/90 via-[#261502] to-amber-950/90 border border-amber-400/60 shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                  <span className="text-2xl select-none">💎</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300/80 block">
                    GRAND PRIZE POOL
                  </span>
                  <div className="text-base font-black text-amber-400 font-mono leading-tight">
                    2.00 GRAM <span className="text-white text-xs font-bold">+ 20K TASKY</span>
                  </div>
                </div>
              </div>
              <div className="bg-amber-400/20 text-amber-300 border border-amber-400/50 px-2 py-1 rounded-xl text-[10px] font-black uppercase font-mono">
                1,000 ADS
              </div>
            </div>

            {/* 3D PLASMA CORE DISPLAY */}
            <div className="p-4 rounded-2xl bg-[#040816] border border-cyan-500/30 text-center relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-cyan-300 uppercase tracking-wider text-[10px] flex items-center gap-1 font-mono">
                  <Radio size={12} className="text-cyan-400" />
                  CORE CHARGE
                </span>
                <span className="text-amber-400 font-mono font-black text-xs">
                  {progressPct.toFixed(1)}% OVERDRIVE
                </span>
              </div>

              {/* Glowing Center Orb */}
              <div className="w-24 h-24 mx-auto my-2 rounded-full bg-gradient-to-b from-cyan-950 to-slate-950 border-2 border-cyan-400 flex flex-col items-center justify-center shadow-lg">
                <span className="text-2xl select-none">💎</span>
                <span className="text-[10px] font-black text-amber-400 tracking-wider font-mono">
                  2.00 GRAM
                </span>
                <span className="text-[9px] font-bold text-cyan-300 font-mono">
                  {totalAds} / {maxTarget}
                </span>
              </div>

              {/* Liquid Progress Bar */}
              <div className="relative h-3.5 rounded-full bg-slate-900 overflow-hidden p-0.5 border border-cyan-500/40 mt-3">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-amber-400 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1 px-1 font-mono">
                <span>0</span>
                <span>250 (S2)</span>
                <span>500 (S3)</span>
                <span>750 (S4)</span>
                <span className="text-amber-400 font-black">1,000 (JACKPOT 👑)</span>
              </div>
            </div>

            {/* 5-TIER ROADMAP */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <Trophy size={14} className="text-amber-400" /> Progression Track
                </span>
                <span className="text-[10px] font-mono font-bold text-cyan-300">
                  {Math.max(0, maxTarget - totalAds)} Ads Left
                </span>
              </div>

              <div className="space-y-2">
                {STAGES.map((s) => {
                  const isUnlocked = totalAds >= s.target;
                  const isCurrent = currentStage === s.stage;

                  return (
                    <div
                      key={s.stage}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        isUnlocked
                          ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                          : isCurrent
                          ? 'bg-purple-950/60 border-purple-400 text-white'
                          : 'bg-white/5 border-white/10 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                            isUnlocked
                              ? 'bg-cyan-400 text-black'
                              : isCurrent
                              ? 'bg-purple-500 text-white'
                              : 'bg-white/10 text-white/50'
                          }`}
                        >
                          {isUnlocked ? <Check size={14} strokeWidth={3} /> : s.icon}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white leading-tight">
                              {s.title}
                            </span>
                            <span className="text-[9px] font-bold text-amber-300 font-mono">
                              ({s.target} Ads)
                            </span>
                          </div>
                          <div className="text-[10px] text-amber-300/90 font-semibold">
                            {s.subtitle}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-lg font-mono ${
                          isUnlocked
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isCurrent
                            ? 'bg-purple-500/30 text-purple-200 border border-purple-400/40'
                            : 'bg-white/10 text-slate-400'
                        }`}
                      >
                        {isUnlocked ? 'DONE ✅' : `${Math.max(0, s.target - totalAds)} left`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Pending Claim Notice */}
            {activeClaim && activeClaim.status === 'pending' && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/50 text-amber-200 text-xs flex items-start gap-2.5">
                <Clock size={18} className="shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <div className="font-bold text-amber-300">2.00 GRAM Claim In Review</div>
                  <div className="text-[11px] text-amber-100/90 mt-0.5 leading-snug">
                    Your 1,000 Ads completion is confirmed. Admin will disburse <b>2.00 GRAM + 20,000 TASKY</b> to your wallet!
                  </div>
                </div>
              </div>
            )}

            {/* QUEST RULES HUD */}
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs">
              <div className="flex items-center gap-1.5 font-black text-amber-300 mb-1.5">
                <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                <span className="uppercase tracking-wider text-[10px]">⚠️ Rules to Ensure Progress Counts</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div>1. <strong className="text-white">Watch full video</strong> until timer reaches 0s.</div>
                <div>2. <strong className="text-amber-300">Tap sponsor action</strong> after ad ends.</div>
                <div>3. <strong className="text-rose-400">DO NOT click 'X' immediately</strong> or progress will not count!</div>
              </div>
            </div>
          </div>

          {/* 3. STICKY BOTTOM ACTION FOOTER */}
          <div className="p-4 bg-[#0a1435] border-t border-cyan-500/20 shrink-0 space-y-2">
            <button
              onClick={handleWatchAd}
              disabled={adWatching || timeLeft.isExpired}
              className="w-full py-3.5 rounded-2xl font-black text-sm text-black flex flex-col items-center justify-center gap-0.5 bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 shadow-lg hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
            >
              {adWatching ? (
                <span className="text-sm font-black uppercase">Charging Core...</span>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Zap size={16} fill="black" />
                    <span>⚡ INJECT PLASMA (+1 AD CHARGE)</span>
                  </div>
                  <span className="text-[9px] font-bold text-black/70 tracking-wider uppercase">
                    Unlimited Binge Watching • No Daily Limits
                  </span>
                </>
              )}
            </button>

            {canClaim && (
              <button
                onClick={() => setShowClaimModal(true)}
                className="w-full py-3 rounded-2xl font-black text-sm text-black flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:brightness-110 active:scale-98 transition-all shadow-xl cursor-pointer"
              >
                <Award size={18} />
                <span>🎉 CLAIM 2.00 GRAM + 20,000 TASKY!</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Claim Modal */}
        {showClaimModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90">
            <div className="relative w-full max-w-sm rounded-3xl p-5 bg-[#0b1536] border border-amber-500/50 shadow-2xl text-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award size={20} className="text-amber-400" />
                  <h3 className="font-black text-base">Claim 2.00 GRAM Jackpot</h3>
                </div>
                <button onClick={() => setShowClaimModal(false)} className="text-slate-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 text-xs mb-3 text-slate-200">
                <div className="font-bold text-amber-300">🏆 1,000 USL Ads Completed!</div>
                <div className="text-amber-400 font-black text-sm font-mono mt-0.5">Reward: 2.00 GRAM + 20,000 TASKY</div>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-300 mb-1">
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
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-black text-xs disabled:opacity-50"
                >
                  {claiming ? 'Submitting...' : 'Confirm Claim'}
                </button>
              </div>
            </div>
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
    <div
      className="fixed z-40 flex flex-col items-end gap-1 pointer-events-auto"
      style={{ bottom: '160px', right: '14px' }}
    >
      {/* Live Timer Pill */}
      <div
        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black text-black whitespace-nowrap shadow-md border border-yellow-200"
        style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}
      >
        <Timer size={10} strokeWidth={3} /> {timeLeft.short}
      </div>

      {/* Futuristic Plasma Core Orb Button */}
      <button
        onClick={onOpen}
        className="relative flex flex-col items-center justify-center overflow-hidden cursor-pointer shadow-xl active:scale-90 transition-transform"
        style={{
          width: '58px',
          height: '58px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 30%, #17427c, #071533 60%, #1e0e47 100%)',
          border: '2px solid rgba(6,182,212,0.95)',
        }}
      >
        <span className="text-[20px] leading-none mb-0.5 select-none">💎</span>
        <span className="text-[9px] font-black leading-none text-amber-300 font-mono">2 GRAM</span>
        <span className="text-[7px] font-black text-cyan-300 leading-none mt-0.5 uppercase tracking-tighter font-mono">1K ADS</span>
      </button>
    </div>
  );
}

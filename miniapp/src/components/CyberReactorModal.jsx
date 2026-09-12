import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle2, Clock, X, Award, Flame, Lock } from 'lucide-react';
import triggerConfetti from '../confetti';
import { showTowerAd, showRewardedAd } from '../adUtils';
import { getReactorStatus, recordReactorAdView, claimReactorReward } from '../api';
import { useToast } from '../App';

const STAGES = [
  { stage: 1, target: 100, reward_tasky: 10000, reward_grams: 0.10, title: 'Core Ignition (10%)', color: 'from-cyan-500 to-blue-500' },
  { stage: 2, target: 250, reward_tasky: 25000, reward_grams: 0.25, title: 'Plasma Pulse (25%)', color: 'from-blue-500 to-indigo-500' },
  { stage: 3, target: 500, reward_tasky: 50000, reward_grams: 0.50, title: 'Fusion Overdrive (50%)', color: 'from-purple-500 to-pink-500' },
  { stage: 4, target: 750, reward_tasky: 75000, reward_grams: 0.75, title: 'Quantum Surge (75%)', color: 'from-pink-500 to-amber-500' },
  { stage: 5, target: 1000, reward_tasky: 200000, reward_grams: 2.00, title: 'MAX 2 GRAM JACKPOT (100%)', color: 'from-amber-400 to-emerald-400' }
];

export default function CyberReactorModal({ isOpen, onClose, user }) {
  const { showToast } = useToast();
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
      const { data, error } = await getReactorStatus(user.telegram_id);
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
        showToast(res?.error || 'Ad was not fully watched. Watch full ad to charge reactor!', 'error');
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
          triggerConfetti({ particleCount: 90, spread: 80 });
          showToast(`⚡ Stage ${newStage} Unlocked! (${newTotal}/1000 Ads)`, 'success');
        } else {
          showToast(`⚡ Plasma Injected! (${newTotal}/1000 Ads)`, 'success');
        }

        fetchStatus();
      } else {
        showToast(recordRes.error || 'Failed to record progress. Please retry.', 'error');
      }
    } catch (err) {
      console.error('[CyberReactor] Ad error:', err);
      showToast('Ad service temporary busy. Try again!', 'error');
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
        triggerConfetti({ particleCount: 120, spread: 90 });
        showToast('🚀 2.00 GRAM Jackpot Claim submitted! Under Admin review.', 'success');
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md my-auto rounded-3xl overflow-hidden border border-cyan-500/30 shadow-2xl shadow-cyan-500/20"
          style={{ background: 'linear-gradient(160deg, #090a16 0%, #0d122b 50%, #060814 100%)' }}
        >
          {/* Top Sci-Fi Header Accents */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-400" />
          <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white/70 transition-all active:scale-95"
          >
            <X size={16} />
          </button>

          <div className="relative p-5 sm:p-6 text-white">
            {/* Header Badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm shadow-cyan-500/20">
                <Zap size={11} className="animate-pulse" /> 1,000 Ads Core Challenge
              </span>
              <span className="text-[10px] font-bold text-amber-400/90 ml-auto flex items-center gap-1">
                <Flame size={11} className="text-amber-400" /> No Daily Limit
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-amber-300">
              Cyber Ad Reactor ⚡
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 mb-5">
              Power up the reactor with 1,000 USL ads to claim the <b className="text-amber-400">2.00 GRAM + 200K TASKY Jackpot</b>!
            </p>

            {/* Glowing Core Reactor Visualizer */}
            <div className="relative rounded-2xl p-5 mb-5 border border-cyan-500/20 bg-gradient-to-b from-cyan-950/40 to-slate-950/80 overflow-hidden text-center">
              {/* Spinning Neon Energy Ring */}
              <div className="relative w-28 h-28 mx-auto mb-3 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/60"
                />
                <motion.div
                  animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0.9, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                  className="absolute inset-2 rounded-full bg-cyan-500/20 blur-md"
                />
                <div className="relative z-10 w-20 h-20 rounded-full bg-slate-900 border-2 border-cyan-400 flex flex-col items-center justify-center shadow-lg shadow-cyan-500/50">
                  <span className="text-2xl">⚡</span>
                  <span className="text-[10px] font-black text-cyan-300 tracking-wider">
                    {totalAds} / {maxTarget}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold mb-1.5 px-1">
                <span className="text-slate-400">Core Output Level</span>
                <span className="text-cyan-400 font-black">
                  {is1kCompleted ? 'MAX OVERDRIVE (100%)' : `Stage ${currentStage} / 5 (${progressPct.toFixed(1)}%)`}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="relative h-3.5 rounded-full bg-slate-800/80 overflow-hidden p-0.5 border border-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-amber-400 shadow-lg shadow-cyan-500/50"
                />
              </div>

              <div className="flex justify-between text-[9px] text-slate-400 font-semibold mt-1 px-1">
                <span>0</span>
                <span>100</span>
                <span>250</span>
                <span>500</span>
                <span>750</span>
                <span className="text-amber-400 font-black">1,000 Ads</span>
              </div>
            </div>

            {/* Stages Milestone List */}
            <div className="space-y-2 mb-5 max-h-44 overflow-y-auto pr-1">
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
                        ? 'bg-purple-950/40 border-purple-500/40 text-white'
                        : 'bg-white/5 border-white/5 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                          isUnlocked
                            ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/40'
                            : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {isUnlocked ? <CheckCircle2 size={14} /> : `S${s.stage}`}
                      </div>
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5 text-white">
                          {s.title}
                          <span className="text-[10px] font-normal text-slate-400">({s.target} Ads)</span>
                        </div>
                        <div className="text-[10px] font-semibold text-amber-400">
                          {s.stage === 5 ? '🔥 2.00 GRAM + 200,000 TASKY' : `${s.reward_grams} GRAM + ${s.reward_tasky.toLocaleString()} TASKY Milestone`}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isUnlocked
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {isUnlocked ? 'COMPLETED' : `${Math.max(0, s.target - totalAds)} left`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Active Pending Claim Notice */}
            {activeClaim && activeClaim.status === 'pending' && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mb-4 flex items-start gap-2.5">
                <Clock size={18} className="shrink-0 mt-0.5 text-amber-400 animate-spin" />
                <div>
                  <div className="font-bold">2.00 GRAM Claim Under Review</div>
                  <div className="text-[11px] text-amber-200/80 mt-0.5">
                    Your 1,000 ads completion is being verified by Admin. Payout will be disbursed directly to your wallet!
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              {/* Watch Ad Button */}
              <button
                onClick={handleWatchAd}
                disabled={adWatching}
                className="w-full py-3.5 rounded-2xl font-black text-sm text-black flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 shadow-lg shadow-cyan-500/30 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50"
              >
                {adWatching ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-black border-t-transparent rounded-full"
                    />
                    Injecting Plasma...
                  </>
                ) : (
                  <>
                    <Zap size={16} fill="black" />
                    Inject Plasma (Watch USL Ad • No Limit)
                  </>
                )}
              </button>

              {/* Claim Reward Button (Only active when 1,000 ads are reached) */}
              {canClaim ? (
                <motion.button
                  animate={{ scale: [1, 1.02, 1], boxShadow: ['0 0 15px rgba(245,158,11,0.3)', '0 0 30px rgba(245,158,11,0.6)', '0 0 15px rgba(245,158,11,0.3)'] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  onClick={() => setShowClaimModal(true)}
                  className="w-full py-3.5 rounded-2xl font-black text-sm text-black flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:brightness-110 active:scale-98 transition-all shadow-xl"
                >
                  <Award size={18} />
                  Claim 2.00 GRAM + 200,000 TASKY!
                </motion.button>
              ) : (
                <div className="w-full py-2.5 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5 font-bold">
                  <Lock size={13} className="text-slate-500" />
                  <span>Claim Unlocks at 1,000 Ads ({totalAds} / 1,000 Complete)</span>
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
                <div>🎉 <b>1,000 USL Ads Completed!</b></div>
                <div className="text-amber-400 font-bold text-sm">Reward: 2.00 GRAM + 200,000 TASKY</div>
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

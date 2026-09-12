import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ShieldAlert, CheckCircle2, Clock, X, Sparkles, Award, Wallet, ArrowRight, Play } from 'lucide-react';
import triggerConfetti from '../confetti';
import { showTowerAd, showRewardedAd } from '../adUtils';
import { getReactorStatus, recordReactorAdView, claimReactorReward } from '../api';
import { useToast } from '../App';

const STAGES = [
  { stage: 1, target: 20, reward_tasky: 5000, reward_grams: 0.20, reward_usdt: 0, title: 'Ignition Overdrive', color: 'from-cyan-500 to-blue-500' },
  { stage: 2, target: 50, reward_tasky: 15000, reward_grams: 0.50, reward_usdt: 0, title: 'Plasma Pulse', color: 'from-blue-500 to-indigo-500' },
  { stage: 3, target: 100, reward_tasky: 30000, reward_grams: 1.00, reward_usdt: 0, title: 'Turbine Velocity', color: 'from-purple-500 to-pink-500' },
  { stage: 4, target: 175, reward_tasky: 60000, reward_grams: 2.00, reward_usdt: 0, title: 'Supercharge Burst', color: 'from-pink-500 to-amber-500' },
  { stage: 5, target: 250, reward_tasky: 100000, reward_grams: 5.00, reward_usdt: 1.00, title: 'MAX CYBER JACKPOT', color: 'from-amber-400 to-emerald-400' }
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
    next_target: 20,
    stages: STAGES,
    active_claim: null,
    user_wallet: ''
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
        showToast(res?.error || 'Ad was not fully completed. Watch full ad to charge reactor!', 'error');
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
          triggerConfetti({ particleCount: 80, spread: 70 });
          showToast(`⚡ Stage ${newStage} Unlocked! Awesome progress!`, 'success');
        } else {
          showToast('⚡ Plasma Injected! Reactor Charged (+1 Ad)', 'success');
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
      showToast('Please enter a valid TON or USDT (TRC20/TON) address', 'error');
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
        triggerConfetti({ particleCount: 100, spread: 80 });
        showToast('🚀 Claim sent to Admin review queue! Payout releases in 5 days.', 'success');
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
  const maxTarget = 250;
  const progressPct = Math.min((totalAds / maxTarget) * 100, 100);
  const canClaim = totalAds >= 20 && (!activeClaim || activeClaim.status === 'approved' || activeClaim.status === 'rejected');

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
                <Zap size={11} className="animate-pulse" /> Limited 5-Stage Overdrive
              </span>
              <span className="text-[10px] font-bold text-amber-400/90 ml-auto flex items-center gap-1">
                <Clock size={11} /> 5-Day Payout
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-amber-300">
              Cyber Ad Reactor ⚡
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 mb-5">
              Inject USL plasma to charge the core & unlock up to <b className="text-amber-400">1 USDT + 5 GRAM</b>!
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
                  <span className="text-[11px] font-black text-cyan-300 tracking-wider">
                    {totalAds} / {maxTarget}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold mb-1.5 px-1">
                <span className="text-slate-400">Core Output Level</span>
                <span className="text-cyan-400 font-black">Stage {currentStage} / 5</span>
              </div>

              {/* Progress Bar */}
              <div className="relative h-3 rounded-full bg-slate-800/80 overflow-hidden p-0.5 border border-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-amber-400 shadow-lg shadow-cyan-500/50"
                />
              </div>

              <div className="flex justify-between text-[9px] text-slate-500 font-semibold mt-1 px-1">
                <span>0 Ads</span>
                <span>20 (S1)</span>
                <span>50 (S2)</span>
                <span>100 (S3)</span>
                <span>175 (S4)</span>
                <span className="text-amber-400 font-bold">250 (Max)</span>
              </div>
            </div>

            {/* Stages Milestone List */}
            <div className="space-y-2 mb-5 max-h-48 overflow-y-auto pr-1">
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
                          {s.reward_usdt > 0 ? `${s.reward_usdt} USDT + ` : ''}
                          {s.reward_grams} GRAM + {s.reward_tasky.toLocaleString()} TASKY
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
                      {isUnlocked ? 'UNLOCKED' : `${Math.max(0, s.target - totalAds)} left`}
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
                  <div className="font-bold">Claim Under Review (5-Day Release Lock)</div>
                  <div className="text-[11px] text-amber-200/80 mt-0.5">
                    Your Stage {activeClaim.stage_reached} claim ({activeClaim.reward_usdt > 0 ? activeClaim.reward_usdt + ' USDT + ' : ''}{activeClaim.reward_grams} GRAM) has been submitted. Admin will review and disburse payment!
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
                    Inject Plasma (Watch USL Ad)
                  </>
                )}
              </button>

              {/* Claim Reward Button */}
              {canClaim && (
                <button
                  onClick={() => setShowClaimModal(true)}
                  className="w-full py-3 rounded-2xl font-bold text-xs text-white flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:brightness-110 active:scale-98 transition-all border border-pink-400/30 shadow-md shadow-purple-500/25"
                >
                  <Award size={15} />
                  Claim Stage {currentStage} Reward ({totalAds >= 250 ? '1 USDT + 5 GRAM' : 'GRAM & TASKY'})
                </button>
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
              className="relative w-full max-w-sm rounded-3xl p-6 bg-slate-900 border border-purple-500/40 shadow-2xl text-white"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award size={20} className="text-amber-400" />
                  <h3 className="font-bold text-base">Submit Reactor Claim</h3>
                </div>
                <button onClick={() => setShowClaimModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/20 text-xs mb-4 text-slate-300">
                You are claiming the <b className="text-amber-400">Stage {currentStage} Overdrive</b> reward with <b className="text-cyan-400">{totalAds} verified USL ads</b>.
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  TON or USDT (TRC20/TON) Payout Address:
                </label>
                <input
                  type="text"
                  value={walletInput}
                  onChange={(e) => setWalletInput(e.target.value)}
                  placeholder="e.g. UQ... or T..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="text-[11px] text-slate-400 mb-5 flex items-center gap-1.5">
                <Clock size={12} className="text-amber-400 shrink-0" />
                <span>Admin review & 5-day release lock applies.</span>
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
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-extrabold text-xs flex items-center justify-center gap-1 disabled:opacity-50"
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

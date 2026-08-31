import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Wallet, CheckCircle2, Clock, AlertCircle, Loader2, Sparkles, Play, Lock, ArrowUpRight, Gem, Wifi, Trophy, Copy, RefreshCw, ShieldCheck } from 'lucide-react';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { useToast } from '../App';
import triggerConfetti from '../confetti';
import { getGramStatus, claimGramReward, watchGramAd, getGramCurrencyBalance, requestGramWithdrawal, startWatchGramAd, verifyGramSuffix } from '../api';
import { showRewardedAd } from '../adUtils';
import Card from '../components/Card';

const SUFFIX = '| Tasky 🐾';

function hasSuffix(lastName) {
  if (!lastName) return false;
  const lower = lastName.toLowerCase();
  return lower.includes('| tasky') || lower.includes('|tasky');
}

const TOTAL_ADS = 60;

const MILESTONES = [
  { at: 10, label: '🔥 10 down!', msg: 'You\'re on fire! Keep going!', color: 'text-orange-400', confetti: false },
  { at: 20, label: '⚡ 20 done!', msg: 'Amazing streak! 40 more to go!', color: 'text-yellow-400', confetti: false },
  { at: 30, label: '💎 Halfway!', msg: 'HALFWAY THERE! You\'re unstoppable!', color: 'text-cyan-400', confetti: true },
  { at: 40, label: '🚀 40 done!', msg: 'Almost there! Just 20 left!', color: 'text-violet-400', confetti: false },
  { at: 50, label: '🎯 Only 10 left!', msg: 'SO CLOSE! Final stretch!', color: 'text-pink-400', confetti: true },
  { at: 55, label: '⭐ 5 more!', msg: 'Last 5 ads! YOU GOT THIS!', color: 'text-amber-300', confetti: false },
  { at: 59, label: '🏆 1 MORE AD!', msg: 'ONE MORE! YOUR REWARD AWAITS!', color: 'text-emerald-300', confetti: false },
];

function getMilestone(count) {
  return [...MILESTONES].reverse().find(m => count >= m.at) || null;
}

function getAdsLeft(count) {
  const left = TOTAL_ADS - count;
  if (count >= TOTAL_ADS) return null;
  if (left <= 1) return { text: '🏆 1 AD LEFT!', urgency: 'ultra' };
  if (left <= 5) return { text: `⭐ Only ${left} ads left!`, urgency: 'high' };
  if (left <= 10) return { text: `🎯 ${left} ads left — almost there!`, urgency: 'medium' };
  if (left <= 20) return { text: `🚀 ${left} ads left — keep going!`, urgency: 'normal' };
  return { text: `⚡ ${left} ads remaining`, urgency: 'low' };
}

function getProgressColor(count) {
  const pct = (count / TOTAL_ADS) * 100;
  if (pct >= 100) return 'from-emerald-400 to-teal-400';
  if (pct >= 83) return 'from-pink-400 to-rose-500';
  if (pct >= 66) return 'from-violet-400 to-purple-500';
  if (pct >= 50) return 'from-cyan-400 to-blue-500';
  if (pct >= 33) return 'from-yellow-400 to-amber-500';
  return 'from-indigo-400 to-purple-500';
}

export default function Gram({ user, refreshUser, tgUser }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adLoadingStage, setAdLoadingStage] = useState(0);
  const adStageTimerRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCompletionBurst, setShowCompletionBurst] = useState(false);
  const [claimCountdown, setClaimCountdown] = useState('');
  const [gramInfo, setGramInfo] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [milestoneToast, setMilestoneToast] = useState(null);
  const [lastMilestoneShown, setLastMilestoneShown] = useState(0);
  const [adPulse, setAdPulse] = useState(false);
  const { showToast } = useToast();

  // ── NAME SUFFIX STATE (backend-verified via bot.getChat, NOT cached WebApp data) ──
  const [suffixOk, setSuffixOk] = useState(false);
  const [suffixChecking, setSuffixChecking] = useState(false);
  const [suffixCopied, setSuffixCopied] = useState(false);
  const [suffixError, setSuffixError] = useState('');

  // Async check against backend which calls bot.getChat live
  const checkSuffix = useCallback(async (silent = false) => {
    if (!user?.telegram_id) return false;
    setSuffixChecking(true);
    if (!silent) setSuffixError('');
    try {
      const { data, error } = await verifyGramSuffix(user.telegram_id);
      if (error) {
        setSuffixOk(false);
        if (!silent) setSuffixError(error);
        return false;
      }
      const ok = !!data?.has_suffix;
      setSuffixOk(ok);
      if (!silent) {
        if (ok) {
          showToast('✅ Name suffix confirmed! You can now proceed.', 'success');
        } else {
          setSuffixError("Suffix not found in your Telegram Last Name. Please make sure to add '| Tasky 🐾' to the end of your Last Name.");
        }
      }
      return ok;
    } catch (e) {
      setSuffixOk(false);
      if (!silent) setSuffixError('Could not verify name. Check your connection and try again.');
      return false;
    } finally {
      setSuffixChecking(false);
    }
  }, [user?.telegram_id]);

  // Run silent check on page load
  useEffect(() => { checkSuffix(true); }, [checkSuffix]);

  const recheckName = useCallback(() => checkSuffix(false), [checkSuffix]);

  const copySuffix = () => {
    navigator.clipboard.writeText(SUFFIX).then(() => {
      setSuffixCopied(true);
      setTimeout(() => setSuffixCopied(false), 2500);
    }).catch(() => showToast('Copy failed – paste manually: | Tasky 🐾', 'error'));
  };

  const tonAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const isWalletConnected = !!tonAddress;

  const fetchStatus = async () => {
    try {
      if (status === null) setLoading(true);
      const [statusRes, gramRes] = await Promise.all([
        getGramStatus(user?.telegram_id || '123456'),
        getGramCurrencyBalance(user?.telegram_id || '123456')
      ]);
      if (statusRes.data) setStatus(statusRes.data);
      if (gramRes.data) setGramInfo(gramRes.data);
    } catch (err) {
      console.error('Failed to fetch Gram status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.telegram_id) fetchStatus();
  }, [user]);

  useEffect(() => {
    if (!status) return;
    const count = status.ads_watched_today || 0;
    const milestone = getMilestone(count);
    if (milestone && count > lastMilestoneShown && count > 0) {
      setLastMilestoneShown(count);
      setMilestoneToast(milestone);
      if (milestone.confetti) {
        triggerConfetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      }
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch(e){}
      setTimeout(() => setMilestoneToast(null), 3000);
    }
    setAdPulse(true);
    setTimeout(() => setAdPulse(false), 600);
  }, [status?.ads_watched_today]);

  useEffect(() => {
    if (!status?.claimed_in_last_24h || !status?.recent_claim?.requested_at) {
      setClaimCountdown('');
      return;
    }
    const updateTimer = () => {
      const requestedTime = new Date(status.recent_claim.requested_at).getTime();
      const nextAvailableTime = requestedTime + 24 * 60 * 60 * 1000;
      const diff = nextAvailableTime - Date.now();
      if (diff <= 0) { setClaimCountdown(''); fetchStatus(); }
      else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setClaimCountdown(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const handleWatchAd = async () => {
    if (status?.last_ad_time) {
      const secs = (Date.now() - new Date(status.last_ad_time).getTime()) / 1000;
      if (secs < 10) {
        showToast(`Wait ${Math.ceil(10 - secs)}s before next ad.`, 'error');
        return;
      }
    }
    setIsWatchingAd(true);
    setAdLoadingStage(1);
    adStageTimerRef.current = setTimeout(() => setAdLoadingStage(2), 1500);
    adStageTimerRef.current = setTimeout(() => setAdLoadingStage(3), 4000);

    try {
      try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch(e){}
      
      // Ping backend that user is currently watching an ad (for analytics / active users)
      await startWatchGramAd(user?.telegram_id);

      const adResult = await showRewardedAd('main');
      if (!adResult.success) {
        showToast(adResult.error || 'You must watch the entire ad to get progress.', 'error');
        setIsWatchingAd(false); setAdLoadingStage(0); return;
      }
      const res = await watchGramAd(user?.telegram_id);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        const newCount = (status?.ads_watched_today || 0) + 1;
        setStatus(prev => prev ? { ...prev, ads_watched_today: newCount, last_ad_time: new Date().toISOString() } : prev);
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch(e){}
        if (newCount >= TOTAL_ADS) {
          setShowCompletionBurst(true);
          triggerConfetti({ particleCount: 250, spread: 120, origin: { y: 0.5 } });
        }
        await fetchStatus();
        if (refreshUser) refreshUser();
      }
    } catch (err) {
      showToast('Failed to log ad completion', 'error');
    } finally {
      clearTimeout(adStageTimerRef.current);
      setIsWatchingAd(false); setAdLoadingStage(0);
    }
  };

  const handleClaim = async () => {
    // Verify suffix live via backend before submitting
    setIsSubmitting(true);
    setSuffixError('');
    try {
      const ok = await checkSuffix(true);
      if (!ok) {
        setSuffixError("Suffix not found in your Telegram Last Name. Please make sure to add '| Tasky 🐾' to the end of your Last Name.");
        setShowSuffixErrorModal(true);
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch(e){}
        return;
      }
      const { data, error } = await claimGramReward(user?.telegram_id || '123456');
      if (error) {
        showToast(error, 'error');
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch(e){}
      } else if (data?.success) {
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch(e){}
        triggerConfetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        setShowSuccessModal(true);
        setShowCompletionBurst(false);
        fetchStatus();
      }
    } catch (err) {
      showToast('Connection error. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [showSuffixErrorModal, setShowSuffixErrorModal] = useState(false);

  const handleWithdrawClick = async () => {
    if (!isWalletConnected) { try { tonConnectUI.openModal(); } catch(e){} return; }
    
    // Verify suffix live via backend
    setSuffixError('');
    const ok = await checkSuffix(true);
    if (!ok) {
      setSuffixError("Suffix not found in your Telegram Last Name. Please make sure to add '| Tasky 🐾' to the end of your Last Name.");
      setShowSuffixErrorModal(true);
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch(e){}
      return;
    }
    
    handleWithdrawGram();
  };

  const handleWithdrawGram = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt < 0.01) { showToast('Minimum withdrawal is 0.01 GRAM', 'error'); return; }
    if (amt > (gramInfo?.gram_balance || 0)) { showToast('Insufficient GRAM balance', 'error'); return; }
    setIsWithdrawing(true);
    try {
      const { data, error } = await requestGramWithdrawal(user?.telegram_id, amt);
      if (error) showToast(error, 'error');
      else if (data?.success) {
        showToast('Withdrawal request submitted!', 'success');
        triggerConfetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        setWithdrawAmount(''); fetchStatus();
      }
    } catch { showToast('Connection error', 'error'); }
    finally { setIsWithdrawing(false); }
  };

  const isBtnDisabled = isWithdrawing || (isWalletConnected && (gramInfo?.has_pending_withdrawal || !withdrawAmount || parseFloat(withdrawAmount) < 0.01));
  const count = status?.ads_watched_today || 0;
  const pct = Math.min(100, (count / TOTAL_ADS) * 100);
  const adsLeft = getAdsLeft(count);
  const progressColor = getProgressColor(count);

  if (loading) return <div className="p-4 md:p-10 h-full flex flex-col items-center justify-center min-h-[70vh]"><Loader2 size={36} className="animate-spin text-amber-500" /></div>;

  return (
    <div className="p-4 space-y-5 pb-24 min-h-full relative max-w-md mx-auto">

      {/* ── MILESTONE TOAST ── */}
      <AnimatePresence>
        {milestoneToast && (
          <motion.div
            key="milestone-toast"
            initial={{ opacity: 0, y: -60, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] w-[90vw] max-w-sm"
          >
            <div className="bg-black/90 border border-white/20 rounded-2xl px-5 py-4 text-center shadow-2xl backdrop-blur-md">
              <p className={`text-lg font-black ${milestoneToast.color}`}>{milestoneToast.label}</p>
              <p className="text-sm text-white/80 font-bold mt-0.5">{milestoneToast.msg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink flex items-center gap-2 justify-center md:justify-start">
          <Gem className="text-emerald-400" /> GRAM Currency
        </h1>
        <p className="text-sm text-emerald-400/70 font-bold text-center md:text-left">💎 Earn GRAM through tasks & promo codes. Withdraw to your TON wallet!</p>
      </div>

      {/* GRAM Balance Card */}
      <Card className="p-5 relative overflow-hidden bg-gradient-to-br from-emerald-900/40 to-teal-900/30 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none" />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <Gem size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60">Your GRAM Balance</p>
              <p className="text-2xl font-black text-emerald-300">{parseFloat(gramInfo?.gram_balance || 0).toFixed(4)} <span className="text-sm text-emerald-400/60">GRAM</span></p>
            </div>
          </div>
          {gramInfo?.has_pending_withdrawal && (
            <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-lg border border-amber-500/20">Pending</span>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number" step="0.01" min="0.01" max={gramInfo?.gram_balance || 0}
                value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="Min 0.01 GRAM"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-bold placeholder-white/20 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <button onClick={() => setWithdrawAmount(String(gramInfo?.gram_balance || 0))}
              className="px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black hover:bg-emerald-500/20 transition-colors">MAX</button>
          </div>
          <button onClick={handleWithdrawClick} disabled={isBtnDisabled}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            {!isWalletConnected ? <><Wallet size={16}/>Connect Wallet First</> : isWithdrawing ? <><Loader2 size={16} className="animate-spin"/>Processing...</> : gramInfo?.has_pending_withdrawal ? <><Clock size={16}/>Withdrawal Pending</> : <><ArrowUpRight size={16}/>Withdraw GRAM</>}
          </button>
          {/* ── NAME SUFFIX LIVE CHECKER (Withdrawal section) ── */}
          {suffixOk ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex gap-2 items-start">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-300 font-bold leading-normal">
                ✅ <span className="font-extrabold">Name Suffix Confirmed:</span> Your Telegram name contains <strong className="text-white">| Tasky</strong>. Keep it active until your withdrawal is approved!
              </p>
            </div>
          ) : (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-2 items-start">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5 animate-pulse" />
              <p className="text-[11px] text-white/80 font-bold leading-normal">
                ⚠️ <span className="text-red-400 font-extrabold">Name Suffix Required:</span> You must add <strong className="text-white">| Tasky</strong> at the end of your Telegram profile name (First or Last name) before withdrawing, and keep it active until approved. Requests without the suffix will be rejected!
              </p>
            </div>
          )}
        </div>
        {gramInfo?.history?.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Recent Withdrawals</p>
            {gramInfo.history.slice(0, 3).map(w => (
              <div key={w.id} className={`flex items-center justify-between p-2.5 rounded-lg text-xs border ${w.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20' : w.status === 'rejected' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                <div className="flex items-center gap-2">
                  {w.status === 'approved' ? <CheckCircle2 size={12} className="text-emerald-400" /> : w.status === 'rejected' ? <AlertCircle size={12} className="text-red-400" /> : <Clock size={12} className="text-amber-400" />}
                  <span className={`font-black ${w.status === 'approved' ? 'text-emerald-400' : w.status === 'rejected' ? 'text-red-400' : 'text-amber-400'}`}>{w.amount} GRAM</span>
                </div>
                <span className="text-white/30 capitalize">{w.status}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="border-t border-white/5 pt-1">
        <p className="text-xs text-white/30 font-bold text-center uppercase tracking-widest">⬇ Daily 0.02 GRAM Ad Reward</p>
      </div>

      {/* Daily ads section header */}
      <div>
        <h2 className="text-lg font-bold text-ink flex items-center gap-2 justify-center md:justify-start">
          <Coins className="text-amber-500" /> Daily Ads Daily Rewards
        </h2>
        <p className="text-sm text-indigo-400 font-bold text-center md:text-left">⚡ Complete daily ads and receive instant payment!</p>
      </div>

      {/* Compulsory Proof Banner */}
      <div className="bg-red-500/15 border-2 border-red-500/30 rounded-2xl p-4 text-left flex gap-3 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
        <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
          <AlertCircle size={18} className="animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-black text-red-400 uppercase tracking-wider">Compulsory Rule</h4>
          <p className="text-[11px] font-bold text-white/80 leading-relaxed">
            After receiving payment, you <span className="text-red-400 font-extrabold underline">MUST</span> share proof of payment in our{' '}
            <a href="https://t.me/TaskyOfficialCommunity" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline hover:text-indigo-300 font-black animate-pulse">Community Group</a>{' '}
            (associated with @TaskyAppbot). If proof is not shared, you will be permanently blacklisted from all future payments & rewards!
          </p>
        </div>
      </div>

      {/* Wallet Status */}
      {status?.gram_wallet_address ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-left flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400"><Wallet size={16} /></div>
            <div>
              <p className="text-[10px] text-emerald-500/70 font-black uppercase tracking-wider leading-none mb-1">Linked Wallet</p>
              <p className="text-xs font-mono font-black text-emerald-400 break-all select-all">{status.gram_wallet_address.substring(0,12)}...{status.gram_wallet_address.substring(status.gram_wallet_address.length - 8)}</p>
            </div>
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg">Auto TON Connect</span>
        </div>
      ) : (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-left flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400"><AlertCircle size={16} /></div>
          <div>
            <p className="text-[10px] text-red-400/70 font-black uppercase tracking-wider leading-none mb-1">Wallet Disconnected</p>
            <p className="text-xs font-bold text-red-400">Please connect your TON wallet in the Wallet tab to claim.</p>
          </div>
        </div>
      )}

      {/* ── MAIN PROGRESS CARD ── */}
      {claimCountdown ? (
        /* Already claimed — show countdown */
        <Card className="p-6 relative overflow-hidden bg-gradient-to-b from-[#180f33]/90 to-[#0a051d]/90 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)] text-center space-y-4">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-[40px] rounded-full pointer-events-none" />
          <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <Lock size={28} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Next Reward Unlocks In</h2>
            <p className="text-xs text-amber-300/80 font-bold uppercase mt-0.5">Daily quota completed</p>
          </div>
          <div className="bg-black/40 rounded-2xl p-5 border border-white/5 font-mono text-3xl font-black text-amber-400 tracking-widest shadow-inner">{claimCountdown}</div>
          <p className="text-[11.5px] text-white/60 font-bold leading-normal px-2">🎉 You watched all 60 ads and claimed your 0.02 GRAM daily reward! Come back in 24 hours.</p>
        </Card>
      ) : (
        <>
          {/* ── DOPAMINE PROGRESS CARD ── */}
          <Card className="p-6 relative overflow-hidden bg-gradient-to-b from-[#180f33]/90 to-[#0a051d]/90 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-[40px] rounded-full pointer-events-none" />

            <div className="flex flex-col items-center text-center space-y-4">
              {/* Icon with pulse on ad watched */}
              <motion.div
                animate={adPulse ? { scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] } : {}}
                transition={{ duration: 0.5 }}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] border border-amber-300/30 ${count >= TOTAL_ADS ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-amber-400 to-yellow-600'}`}
              >
                {count >= TOTAL_ADS ? <Trophy size={28} className="text-white" /> : <Coins size={28} className="text-white" />}
              </motion.div>

              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Daily Quest</h2>
                <p className="text-xs text-amber-300 font-bold tracking-wider uppercase mt-0.5">0.02 GRAM Reward Pool</p>
              </div>

              {/* Progress block */}
              <div className="w-full bg-black/40 rounded-2xl p-4 border border-white/5 space-y-3">
                {/* Count display */}
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white/50 text-xs">Your Progress</span>
                  <motion.span
                    key={count}
                    initial={{ scale: 1.4, color: '#facc15' }}
                    animate={{ scale: 1, color: '#f59e0b' }}
                    transition={{ duration: 0.4 }}
                    className="font-black text-amber-400 text-lg leading-none"
                  >
                    {count}<span className="text-xs text-white/40 font-bold"> / {TOTAL_ADS}</span>
                  </motion.span>
                </div>

                {/* Animated progress bar */}
                <div className="w-full bg-white/5 h-4 rounded-full overflow-hidden p-0.5 border border-white/5 relative">
                  <motion.div
                    className={`bg-gradient-to-r ${progressColor} h-full rounded-full shadow-sm`}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>

                {/* Dopamine "X ads left" message */}
                <AnimatePresence mode="wait">
                  {count < TOTAL_ADS && adsLeft ? (
                    <motion.p
                      key={adsLeft.text}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className={`text-sm font-black text-center leading-tight ${
                        adsLeft.urgency === 'ultra' ? 'text-emerald-300 animate-pulse' :
                        adsLeft.urgency === 'high' ? 'text-pink-400' :
                        adsLeft.urgency === 'medium' ? 'text-violet-400' :
                        'text-amber-300'
                      }`}
                    >
                      {adsLeft.text}
                    </motion.p>
                  ) : count >= TOTAL_ADS ? (
                    <motion.p
                      key="complete"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-sm font-black text-emerald-400 flex items-center justify-center gap-1.5 animate-pulse"
                    >
                      🎉 QUEST COMPLETE! Claim your reward below!
                    </motion.p>
                  ) : null}
                </AnimatePresence>

                {/* Milestone mini indicators */}
                <div className="flex justify-between items-center px-1">
                  {[10, 20, 30, 40, 50, 60].map(m => (
                    <div key={m} className="flex flex-col items-center gap-0.5">
                      <div className={`w-2 h-2 rounded-full transition-all duration-500 ${count >= m ? 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]' : 'bg-white/10'}`} />
                      <span className={`text-[8px] font-black ${count >= m ? 'text-amber-400' : 'text-white/20'}`}>{m}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Watch Ad button or loading */}
              {count < TOTAL_ADS && (
                <>
                  <AnimatePresence>
                    {isWatchingAd && (
                      <motion.div
                        key="ad-loading"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full bg-black/60 border border-indigo-500/30 rounded-2xl p-5 flex flex-col items-center gap-3 backdrop-blur-sm"
                      >
                        <div className="relative">
                          <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                            <Play size={22} className="text-indigo-400" fill="currentColor" />
                          </div>
                          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/40 animate-ping" />
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-sm font-black text-white">
                            {adLoadingStage === 1 && '⚡ Preparing your ad...'}
                            {adLoadingStage === 2 && '📡 Connecting to ad network...'}
                            {adLoadingStage >= 3 && '🎬 Starting video ad...'}
                          </p>
                          <p className="text-[11px] text-white/40 font-bold">Keep the app open and watch the full ad</p>
                        </div>
                        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                            initial={{ width: '0%' }}
                            animate={{ width: adLoadingStage === 1 ? '25%' : adLoadingStage === 2 ? '60%' : '85%' }}
                            transition={{ duration: 1.2, ease: 'easeInOut' }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-bold">
                          <Wifi size={10} /><span>Do not close or switch apps</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!isWatchingAd && (
                    <motion.button
                      onClick={handleWatchAd}
                      whileTap={{ scale: 0.95 }}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] border border-indigo-400/20 relative overflow-hidden"
                    >
                      <Play size={16} fill="currentColor" />
                      Watch Ad — {TOTAL_ADS - count} Left!
                    </motion.button>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* ── COMPLETION BURST ── */}
          <AnimatePresence>
            {showCompletionBurst && count >= TOTAL_ADS && (
              <motion.div
                key="completion-burst"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative overflow-hidden rounded-3xl border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-900/60 via-teal-900/40 to-emerald-900/60 p-6 text-center shadow-[0_0_60px_rgba(16,185,129,0.25)] space-y-3"
              >
                <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15),transparent_70%)] pointer-events-none" />
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                >
                  <Trophy size={36} className="text-white" />
                </motion.div>
                <div>
                  <p className="text-2xl font-black text-white uppercase tracking-tight">🎉 Quest Complete!</p>
                  <p className="text-sm text-emerald-300 font-bold mt-1">You watched all 60 ads! Your 0.02 GRAM is ready.</p>
                </div>
                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="flex items-center justify-center gap-2 text-xs font-black text-emerald-400 uppercase tracking-widest"
                >
                  <Sparkles size={14} /> Claim below to receive your reward! <Sparkles size={14} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Claim Button Card */}
          <Card className="p-6 bg-gradient-to-b from-[#180f33]/90 to-[#0a051d]/90 border border-amber-500/20">
            <div className="space-y-4">
              {count >= TOTAL_ADS ? (
                <div className="space-y-3">
                  {/* ── NAME SUFFIX GATE ── */}
                  {!status?.claimed_in_last_24h && !suffixOk && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <p className="text-xs font-black text-amber-400 uppercase tracking-wider">Step Required Before Claiming</p>
                          <p className="text-[11px] text-white/80 font-bold leading-relaxed mt-1">
                            Add <strong className="text-white">| Tasky 🐾</strong> to the end of your Telegram <strong>Last Name</strong>. Copy it below, paste it in Telegram Settings → Edit Name, then tap <em>Recheck</em>.
                          </p>
                        </div>
                      </div>

                      {/* Copy Row */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 flex items-center justify-between">
                          <span className="font-mono font-black text-white text-sm tracking-wide">| Tasky 🐾</span>
                          <button
                            onClick={copySuffix}
                            className={`ml-2 flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-lg transition-all ${
                              suffixCopied
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 active:scale-95'
                            }`}
                          >
                            {suffixCopied ? <><CheckCircle2 size={12}/>Copied!</> : <><Copy size={12}/>Copy</>}
                          </button>
                        </div>
                        <button
                          onClick={recheckName}
                          disabled={suffixChecking}
                          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs font-black hover:bg-white/10 active:scale-95 transition-all whitespace-nowrap disabled:opacity-60"
                        >
                          {suffixChecking ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12} />} Recheck
                        </button>
                      </div>

                      <p className="text-[10px] text-amber-400/60 font-bold text-center">
                        ⚠️ Add <code>| Tasky 🐾</code> to your <strong>Last Name</strong> in Telegram Settings, then tap Recheck.
                      </p>
                    </motion.div>
                  )}

                  {/* Confirmed suffix badge */}
                  {!status?.claimed_in_last_24h && suffixOk && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5 flex items-center gap-2"
                    >
                      <ShieldCheck size={16} className="text-emerald-400" />
                      <p className="text-xs font-black text-emerald-400">Name suffix confirmed ✓ — You're ready to claim!</p>
                    </motion.div>
                  )}

                  <motion.button
                    onClick={handleClaim}
                    disabled={status?.claimed_in_last_24h || !status?.gram_wallet_address || isSubmitting || (!suffixOk && !status?.claimed_in_last_24h)}
                    whileTap={{ scale: 0.96 }}
                    animate={!status?.claimed_in_last_24h && status?.gram_wallet_address && suffixOk ? { boxShadow: ['0 0 25px rgba(16,185,129,0.3)', '0 0 45px rgba(16,185,129,0.6)', '0 0 25px rgba(16,185,129,0.3)'] } : {}}
                    transition={{ repeat: Infinity, duration: 1.8 }}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:active:scale-100 border border-emerald-400/20"
                  >
                    {isSubmitting ? <><Loader2 size={18} className="animate-spin"/>Processing Rewards...</> :
                     status?.claimed_in_last_24h ? <>Already Claimed Today</> :
                     !status?.gram_wallet_address ? <>Connect Wallet to Receive</> :
                     !suffixOk ? <>Add | Tasky to Name First ↑</> :
                     <><Sparkles size={18} className="animate-pulse"/>Receive 0.02 GRAM Instantly!</>}
                  </motion.button>
                </div>
              ) : (
                <button disabled className="w-full py-4 rounded-2xl bg-surface text-ink-faint font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 border border-border opacity-50">
                  <Sparkles size={18} />
                  Receive 0.02 GRAM ({TOTAL_ADS - count} ads left)
                </button>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Claim History Status */}
      {status?.recent_claim && (
        <Card className={`p-4 border ${status.recent_claim.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : status.recent_claim.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          <div className="flex items-center gap-2 justify-center text-sm font-bold">
            {status.recent_claim.status === 'pending' ? <><Clock size={16}/><span>Claim request is pending admin approval</span></> :
             status.recent_claim.status === 'approved' ? <><CheckCircle2 size={16}/><span>Approved! 0.02 GRAM sent to wallet.</span></> :
             <><AlertCircle size={16}/><span>Rejected: {status.recent_claim.rejection_reason || 'Check details.'}</span></>}
          </div>
        </Card>
      )}

      {/* Rules */}
      <Card className="p-5 bg-white/5 border border-white/5 space-y-2.5">
        <h4 className="text-xs font-black text-white/60 uppercase tracking-widest">Campaign Rules</h4>
        <ul className="text-xs text-white/40 space-y-1.5 leading-relaxed text-left list-disc list-inside">
          <li>Complete your daily quota of 60 ads in a 24-hour window.</li>
          <li>Each claim is automatically processed and sent directly to your wallet.</li>
          <li>Do not use automation or scripts; this will trigger account suspension.</li>
        </ul>
      </Card>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#12082b] border-2 border-red-500/40 rounded-3xl p-6 w-full max-w-sm text-center space-y-5 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 size={36} className="animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Claim Requested!</h3>
              <p className="text-xs text-white/60">Your 0.02 GRAM daily reward is processed automatically.</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-left space-y-1.5">
              <h4 className="text-xs font-black text-red-400 uppercase tracking-wider flex items-center gap-1.5"><AlertCircle size={14}/>Critical Requirement</h4>
              <p className="text-[11px] text-white/80 font-bold leading-normal">
                Once payment is received, you <span className="text-red-400 font-extrabold underline">MUST</span> share a screenshot in our{' '}
                <a href="https://t.me/TaskyOfficialCommunity" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline font-black">Community Group</a>.
              </p>
              <p className="text-[10px] text-red-400/80 font-black">🚨 Failure to share proof = immediate permanent ban!</p>
            </div>
            <button onClick={() => setShowSuccessModal(false)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-sm uppercase tracking-wide active:scale-95 transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              I Understand & Agree
            </button>
          </div>
        </div>
      )}

      {/* Suffix Error Modal */}
      {showSuffixErrorModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
          <div className="bg-[#12082b] border-2 border-amber-500/40 rounded-3xl p-6 w-full max-w-sm text-center space-y-5 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30 animate-pulse">
              <AlertCircle size={36} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Name Suffix Required!</h3>
              <p className="text-xs text-white/60">You must add the suffix to your Telegram profile Last Name before making a withdrawal.</p>
            </div>

            {suffixError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-xs font-bold leading-normal text-left">
                ⚠️ {suffixError}
              </div>
            )}
            
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-left space-y-3">
              <div>
                <p className="text-xs font-black text-amber-400 uppercase tracking-wider">How to fix this:</p>
                <p className="text-[11px] text-white/80 font-bold leading-normal mt-1">
                  1. Copy the suffix block below.<br/>
                  2. Open Telegram Settings &rarr; Edit Name.<br/>
                  3. Paste it at the end of your <strong>Last name</strong> (e.g. <code>YourName | Tasky 🐾</code>).<br/>
                  4. Save and return here to click <strong>Recheck Name</strong>.
                </p>
              </div>

              {/* Copy Box */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between">
                  <span className="font-mono font-black text-white text-sm">| Tasky 🐾</span>
                  <button
                    onClick={copySuffix}
                    className={`flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-lg transition-all ${
                      suffixCopied
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 active:scale-95'
                    }`}
                  >
                    {suffixCopied ? <><CheckCircle2 size={12}/>Copied!</> : <><Copy size={12}/>Copy</>}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowSuffixErrorModal(false); setSuffixError(''); }}
                className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-sm transition-all border border-white/10">
                Cancel
              </button>
              <button
                disabled={suffixChecking}
                onClick={async () => {
                  const ok = await checkSuffix(false);
                  if (ok) {
                    setShowSuffixErrorModal(false);
                    handleWithdrawGram();
                  }
                }}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-black text-sm uppercase tracking-wide active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:opacity-60 flex items-center justify-center gap-2">
                {suffixChecking ? <><Loader2 size={14} className="animate-spin"/>Checking...</> : <>Recheck Name</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

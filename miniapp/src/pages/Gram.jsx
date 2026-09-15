import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coins, Wallet, CheckCircle2, Clock, AlertCircle, Loader2, Sparkles, 
  Play, Lock, ArrowUpRight, Gem, Wifi, Trophy, Copy, RefreshCw, 
  ShieldCheck, Flame, ExternalLink, X, ChevronRight, Check, Users
} from 'lucide-react';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { useToast } from '../App';
import triggerConfetti from '../confetti';
import { getGramStatus, claimGramReward, watchGramAd, startWatchGramAd, verifyGramSuffix } from '../api';
import { showRewardedAd, showAdexiumAd, showMonetagAd, prefetchGramAd } from '../adUtils';
import Card from '../components/Card';

const SUFFIX = '| Tasky 🐾';
const TOTAL_ADS = 60;

const MILESTONES = [
  { at: 10, label: '🔥 10 down!', msg: 'You\'re on fire! Keep going!', color: 'text-orange-400' },
  { at: 20, label: '⚡ 20 done!', msg: 'Amazing streak! 40 more to go!', color: 'text-yellow-400' },
  { at: 30, label: '💎 Halfway!', msg: 'HALFWAY THERE! 30 more to claim!', color: 'text-cyan-400' },
  { at: 40, label: '🚀 40 done!', msg: 'Almost there! Just 20 left!', color: 'text-violet-400' },
  { at: 50, label: '🎯 Only 10 left!', msg: 'SO CLOSE! Final stretch!', color: 'text-pink-400' },
  { at: 55, label: '⭐ 5 more!', msg: 'Last 5 ads! YOU GOT THIS!', color: 'text-amber-300' },
  { at: 59, label: '🏆 1 MORE AD!', msg: 'ONE MORE! YOUR 0.02 GRAM AWAITS!', color: 'text-emerald-300' },
];

function getAdsLeft(count, total = 60) {
  const left = total - count;
  if (count >= total) return null;
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

export default function Gram({ user, refreshUser }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [watchingProvider, setWatchingProvider] = useState(null); // 'gigapub' | 'monetag' | null
  const [adLoadingStage, setAdLoadingStage] = useState(0);
  const adStageTimerRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCompletionBurst, setShowCompletionBurst] = useState(false);
  const [claimCountdown, setClaimCountdown] = useState('');
  const [milestoneToast, setMilestoneToast] = useState(null);
  const [adPulse, setAdPulse] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [rewardCelebration, setRewardCelebration] = useState(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const { showToast } = useToast();

  const refCode = status?.referral_code || user?.referral_code || user?.telegram_id || '';
  const refLink = `https://t.me/TaskyAppbot?start=${refCode}`;

  const handleShareReferral = () => {
    const text = encodeURIComponent("🚀 Join Tasky & claim free 0.02 GRAM daily directly to your TON wallet! Tap below to start now 💎");
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${text}`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(refLink).then(() => {
      setCopiedRef(true);
      showToast('Referral link copied!', 'success');
      setTimeout(() => setCopiedRef(false), 2500);
    }).catch(() => showToast('Failed to copy link', 'error'));
  };

  // ── NAME SUFFIX STATE ──
  const [suffixOk, setSuffixOk] = useState(false);
  const [suffixChecking, setSuffixChecking] = useState(false);
  const [suffixCopied, setSuffixCopied] = useState(false);
  const [suffixError, setSuffixError] = useState('');
  const [showSuffixErrorModal, setShowSuffixErrorModal] = useState(false);

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
          showToast('✅ Name suffix confirmed! Ready to claim.', 'success');
        } else {
          setSuffixError("Suffix not found in your Telegram name. Please add '| Tasky 🐾' to the end of your name in Telegram Settings.");
        }
      }
      return ok;
    } catch (e) {
      setSuffixOk(false);
      if (!silent) setSuffixError('Could not verify name. Please try again.');
      return false;
    } finally {
      setSuffixChecking(false);
    }
  }, [user?.telegram_id]);

  useEffect(() => { checkSuffix(true); }, [checkSuffix]);
  useEffect(() => { prefetchGramAd(); }, []);

  // Safety auto-unfreeze timer if ad network hangs indefinitely
  useEffect(() => {
    if (!isWatchingAd) return;
    const t = setTimeout(() => {
      setIsWatchingAd(false);
      setWatchingProvider(null);
      showToast('Ad session ended. Tap to try again.', 'info');
    }, 80000);
    return () => clearTimeout(t);
  }, [isWatchingAd]);

  const recheckName = useCallback(() => checkSuffix(false), [checkSuffix]);

  const copySuffix = () => {
    navigator.clipboard.writeText(SUFFIX).then(() => {
      setSuffixCopied(true);
      setTimeout(() => setSuffixCopied(false), 2500);
    }).catch(() => showToast('Copy failed – paste manually: | Tasky 🐾', 'error'));
  };

  const tonAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const isWalletConnected = !!tonAddress || !!status?.gram_wallet_address;

  const fetchStatus = async () => {
    try {
      if (status === null) setLoading(true);
      const res = await getGramStatus(user?.telegram_id || '123456');
      if (res.data) setStatus(res.data);
    } catch (err) {
      console.error('Failed to fetch Gram status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.telegram_id) fetchStatus();
  }, [user]);

  const isFirstAttempt = status?.is_first_attempt ?? (status?.total_previous_claims === 0);
  const reqGiga = status?.required_gigapub ?? (isFirstAttempt ? 30 : 40);
  const reqAdexium = status?.required_adexium ?? (isFirstAttempt ? 30 : 40);
  const totalAdsNeeded = status?.total_required_ads ?? (reqGiga + reqAdexium);

  const currentGiga = Math.min(reqGiga, status?.gigapub_ads_watched_today ?? (status?.ads_watched_today ? Math.min(reqGiga, status.ads_watched_today) : 0));
  const currentAdexium = Math.min(reqAdexium, status?.adexium_ads_watched_today ?? status?.monetag_ads_watched_today ?? 0);
  const totalCount = currentGiga + currentAdexium;
  const isReadyToClaim = currentGiga >= reqGiga && currentAdexium >= reqAdexium;

  // Countdown timer for 24h reset
  useEffect(() => {
    if (!status?.claimed_in_last_24h || !status?.recent_claim?.requested_at) {
      setClaimCountdown('');
      return;
    }
    const updateTimer = () => {
      const claimTime = new Date(status.recent_claim.requested_at).getTime();
      const unlockTime = claimTime + 24 * 60 * 60 * 1000;
      const diff = unlockTime - Date.now();
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

  const handleWatchAd = async (provider = 'gigapub') => {
    if (status?.last_ad_time) {
      const secs = (Date.now() - new Date(status.last_ad_time).getTime()) / 1000;
      if (secs < 1) {
        showToast(`Wait a second before next ad.`, 'info');
        return;
      }
    }

    const isAdexium = provider === 'adexium' || provider === 'monetag';
    if (isAdexium && currentAdexium >= reqAdexium) {
      showToast(`You have already completed ${reqAdexium} Adexium ads today!`, 'info');
      return;
    }
    if (!isAdexium && currentGiga >= reqGiga) {
      showToast(`You have already completed ${reqGiga} GigaPub ads today!`, 'info');
      return;
    }

    setIsWatchingAd(true);
    setWatchingProvider(isAdexium ? 'adexium' : 'gigapub');
    setAdLoadingStage(1);

    try {
      try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch(e){}
      
      // Start server session token in background (zero UI latency)
      const targetProvider = isAdexium ? 'adexium' : 'gigapub';
      const startPromise = startWatchGramAd(user?.telegram_id, targetProvider).catch(() => null);

      let adResult;
      if (isAdexium) {
        adResult = await showAdexiumAd();
      } else {
        adResult = await showRewardedAd('gram');
      }

      if (!adResult.success) {
        showToast(adResult.error || 'You must watch the entire ad to get progress.', 'error');
        return;
      }

      const startRes = await startPromise;
      const sessionToken = startRes?.data?.session_token || null;

      const networkName = isAdexium ? 'Adexium' : (adResult.network === 'usl' ? 'USL Ads' : 'GigaPub');
      showToast(`✅ ${networkName} ad verified by sponsor!`, 'success');

      const res = await watchGramAd(user?.telegram_id, targetProvider, sessionToken);

      if (res.error) {
        showToast(res.error, 'error');
      } else {
        const newCount = (status?.ads_watched_today || 0) + 1;
        const newStreak = streakCount + 1;
        setStreakCount(newStreak);

        setStatus(prev => {
          if (!prev) return prev;
          const updatedAdexium = res.adexium_ads_watched_today !== undefined 
            ? res.adexium_ads_watched_today 
            : (res.monetag_ads_watched_today !== undefined ? res.monetag_ads_watched_today : (isAdexium ? (prev.adexium_ads_watched_today || prev.monetag_ads_watched_today || 0) + 1 : (prev.adexium_ads_watched_today || prev.monetag_ads_watched_today || 0)));
          return {
            ...prev,
            ads_watched_today: res.ads_watched_today || newCount,
            gigapub_ads_watched_today: res.gigapub_ads_watched_today !== undefined ? res.gigapub_ads_watched_today : (!isAdexium ? (prev.gigapub_ads_watched_today || 0) + 1 : prev.gigapub_ads_watched_today),
            adexium_ads_watched_today: updatedAdexium,
            monetag_ads_watched_today: updatedAdexium,
            last_ad_time: new Date().toISOString()
          };
        });
        
        try { 
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); 
          window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy');
        } catch(e){}

        const updatedGiga = res.gigapub_ads_watched_today !== undefined ? res.gigapub_ads_watched_today : (!isAdexium ? currentGiga + 1 : currentGiga);
        const updatedAdexium = res.adexium_ads_watched_today !== undefined ? res.adexium_ads_watched_today : (res.monetag_ads_watched_today !== undefined ? res.monetag_ads_watched_today : (isAdexium ? currentAdexium + 1 : currentAdexium));
        const isComplete = updatedGiga >= 30 && updatedAdexium >= 30;

        if (isComplete) {
          setShowCompletionBurst(true);
          triggerConfetti({ particleCount: 250, spread: 120, origin: { y: 0.5 } });
        } else {
          triggerConfetti({ particleCount: 70, spread: 65, origin: { y: 0.65 } });
        }

        const getEncouragement = (cnt, strk) => {
          if (isComplete) return `🏆 60/60 MAX REACHED! 0.02 GRAM is ready to claim!`;
          if (cnt >= 50) return `⚡ ALMOST THERE! Only ${TOTAL_ADS - cnt} ads left!`;
          if (cnt >= 40) return `🔥 Final Stretch! ${TOTAL_ADS - cnt} remaining!`;
          if (cnt >= 30) return `💎 HALFWAY MILESTONE! Big rewards getting closer!`;
          if (cnt >= 20) return `🚀 Unstoppable! ${cnt} ads validated! Keep rolling!`;
          if (cnt >= 10) return `⚡ Great rhythm! ${strk} in a row streak active!`;
          return `🌱 +1 Ad Validated via ${networkName}! Keep rolling towards 0.02 GRAM!`;
        };

        setRewardCelebration({
          count: newCount,
          left: Math.max(0, TOTAL_ADS - (updatedGiga + updatedAdexium)),
          pct: Math.min(100, Math.round(((updatedGiga + updatedAdexium) / TOTAL_ADS) * 100)),
          streak: newStreak,
          network: networkName,
          message: getEncouragement(updatedGiga + updatedAdexium, newStreak)
        });

        await fetchStatus();
        if (refreshUser) refreshUser();
      }
    } catch (err) {
      showToast('Failed to log ad completion', 'error');
    } finally {
      if (Array.isArray(adStageTimerRef.current)) {
        adStageTimerRef.current.forEach(clearTimeout);
      } else if (adStageTimerRef.current) {
        clearTimeout(adStageTimerRef.current);
      }
      setIsWatchingAd(false);
      setWatchingProvider(null);
      setAdLoadingStage(0);
    }
  };

  const handleClaim = async () => {
    setIsSubmitting(true);
    setSuffixError('');
    try {
      if (status?.requires_referrals && !status?.referral_requirement_met) {
        showToast(`Invite at least 2 friends to unlock your 0.02 GRAM reward! (${status?.total_referrals || 0}/2 invited)`, 'error');
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch(e){}
        setIsSubmitting(false);
        return;
      }

      const ok = await checkSuffix(true);
      if (!ok) {
        setSuffixError("Suffix not found in your Telegram Last Name. Please make sure to add '| Tasky 🐾' to the end of your name.");
        setShowSuffixErrorModal(true);
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch(e){}
        return;
      }
      const targetWallet = tonAddress || status?.gram_wallet_address || user?.wallet_address || '';
      const { data, error } = await claimGramReward(user?.telegram_id || '123456', targetWallet);
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

  const gigaCount = Math.min(reqGiga, status?.gigapub_ads_watched_today ?? (status?.ads_watched_today ? Math.min(reqGiga, status.ads_watched_today) : 0));
  const adexiumCount = Math.min(reqAdexium, status?.adexium_ads_watched_today ?? status?.monetag_ads_watched_today ?? 0);
  const count = gigaCount + adexiumCount;
  const isQuestFinished = gigaCount >= reqGiga && adexiumCount >= reqAdexium;
  const pct = Math.min(100, (count / totalAdsNeeded) * 100);
  const adsLeft = getAdsLeft(count, totalAdsNeeded);
  const progressColor = getProgressColor(count);

  const claimsHistory = status?.claims_history || (status?.recent_claim ? [status.recent_claim] : []);

  if (loading) {
    return (
      <div className="p-4 md:p-10 h-full flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 size={36} className="animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 pb-24 min-h-full relative max-w-md mx-auto">
      {/* ── HEADER ── */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-wider mb-1">
          <Gem size={14} className="text-emerald-400" /> Daily Sponsor Quest
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          <Coins className="text-amber-400" /> Gram Daily Ads
        </h1>
        <p className="text-xs text-indigo-300 font-bold max-w-xs mx-auto leading-relaxed">
          Watch {totalAdsNeeded} sponsor ads daily ({reqAdexium} Adexium + {reqGiga} GigaPub) and receive <span className="text-emerald-400 font-black">0.02 GRAM</span> directly to your wallet!
        </p>
      </div>

      {/* ── LINKED WALLET STATUS ── */}
      {status?.gram_wallet_address ? (
        <div className="bg-gradient-to-r from-[#130d29] to-[#1a1236] border border-emerald-500/30 rounded-2xl p-3.5 flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.06)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
              <Wallet size={16} />
            </div>
            <div>
              <p className="text-[10px] text-emerald-400 font-black uppercase tracking-wider leading-none mb-1">Destination Wallet</p>
              <p className="text-xs font-mono font-black text-white/90 break-all select-all">
                {status.gram_wallet_address.substring(0, 8)}...{status.gram_wallet_address.substring(status.gram_wallet_address.length - 6)}
              </p>
            </div>
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1">
            <Check size={10} /> Auto Payout
          </span>
        </div>
      ) : (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
              <AlertCircle size={16} />
            </div>
            <div>
              <p className="text-[10px] text-red-400 font-black uppercase tracking-wider leading-none mb-1">Wallet Disconnected</p>
              <p className="text-xs font-bold text-red-300">Connect your TON wallet to receive GRAM payouts.</p>
            </div>
          </div>
          <button 
            onClick={() => { try { tonConnectUI.openModal(); } catch(e){} }}
            className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-black uppercase hover:bg-red-500/30 transition-colors"
          >
            Connect
          </button>
        </div>
      )}

      {/* ── MAIN QUEST & PROGRESS CARD ── */}
      {claimCountdown ? (
        /* Already claimed — show countdown */
        <Card className="p-6 relative overflow-hidden bg-gradient-to-b from-[#180f33]/95 to-[#0a051d]/95 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.08)] text-center space-y-4">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-[40px] rounded-full pointer-events-none" />
          <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <Lock size={28} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Next Reward Unlocks In</h2>
            <p className="text-xs text-amber-300/80 font-bold uppercase mt-0.5">Daily quota completed</p>
          </div>
          <div className="bg-black/50 rounded-2xl p-4 border border-white/10 font-mono text-3xl font-black text-amber-400 tracking-widest shadow-inner">
            {claimCountdown}
          </div>
          <p className="text-[11.5px] text-white/60 font-bold leading-normal px-2">
            🎉 You completed all {totalAdsNeeded} ads ({reqAdexium} Adexium + {reqGiga} GigaPub) and claimed your 0.02 GRAM daily reward! Next quest opens in 24 hours.
          </p>
        </Card>
      ) : (
        <Card className="p-5 relative overflow-hidden bg-gradient-to-b from-[#180f33]/95 to-[#0a051d]/95 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.06)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[50px] rounded-full pointer-events-none" />

          <div className="flex flex-col items-center text-center space-y-4">
            {/* Quest Icon */}
            <motion.div
              animate={adPulse ? { scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] } : {}}
              transition={{ duration: 0.5 }}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] border border-amber-300/30 ${isQuestFinished ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-amber-400 to-yellow-600'}`}
            >
              {isQuestFinished ? <Trophy size={28} className="text-white" /> : <Coins size={28} className="text-white" />}
            </motion.div>

            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Daily Quest</h2>
              <p className="text-xs text-amber-300 font-bold tracking-wider uppercase mt-0.5">0.02 GRAM Reward Pool</p>
            </div>

            {/* Combined Progress Block */}
            <div className="w-full bg-black/40 rounded-2xl p-4 border border-white/5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white/50 text-xs">Total Quest Progress</span>
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

              {/* Progress bar */}
              <div className="w-full bg-white/5 h-3.5 rounded-full overflow-hidden p-0.5 border border-white/5 relative">
                <motion.div
                  className={`bg-gradient-to-r ${progressColor} h-full rounded-full shadow-sm`}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>

              {/* Status text */}
              <AnimatePresence mode="wait">
                {!isQuestFinished && adsLeft ? (
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
                ) : isQuestFinished ? (
                  <motion.p
                    key="complete"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-sm font-black text-emerald-400 flex items-center justify-center gap-1.5 animate-pulse"
                  >
                    🎉 QUEST COMPLETE! Claim your 0.02 GRAM below!
                  </motion.p>
                ) : null}
              </AnimatePresence>

              {/* Milestone dots */}
              <div className="flex justify-between items-center px-1 pt-1">
                {(isFirstAttempt ? [10, 20, 30, 40, 50, 60] : [15, 30, 45, 60, 75, 80]).map(m => (
                  <div key={m} className="flex flex-col items-center gap-0.5">
                    <div className={`w-2 h-2 rounded-full transition-all duration-500 ${count >= m ? 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]' : 'bg-white/10'}`} />
                    <span className={`text-[8px] font-black ${count >= m ? 'text-amber-400' : 'text-white/20'}`}>{m}</span>
                  </div>
                ))}
              </div>

              {/* Dual Provider guideline */}
              <div className="w-full bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-left flex items-start gap-2.5">
                <Sparkles size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-[11px] font-black text-cyan-300 uppercase tracking-wide">
                    Dual Sponsor Requirement
                  </p>
                  <p className="text-[10.5px] text-white/80 font-semibold leading-relaxed">
                    Complete <strong className="text-cyan-300">{reqAdexium} Adexium Ads</strong> + <strong className="text-indigo-300">{reqGiga} GigaPub Ads</strong> to unlock your daily 0.02 GRAM claim.
                  </p>
                </div>
              </div>
            </div>

            {/* ── DUAL PROVIDER ACTION CARDS ── */}
            {!isQuestFinished && (
              <div className="w-full space-y-3 pt-1 text-left">
                {/* Option 1: Adexium */}
                <div className={`p-4 rounded-2xl border transition-all ${adexiumCount >= reqAdexium ? 'bg-cyan-950/25 border-emerald-500/40' : 'bg-gradient-to-r from-cyan-950/30 to-[#0b1f33]/60 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 font-black text-xs flex items-center justify-center border border-cyan-500/30">1</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-white uppercase tracking-wider">Option 1: Adexium</p>
                          <span className="text-[8.5px] bg-cyan-500/20 text-cyan-300 font-black px-1.5 py-0.5 rounded border border-cyan-500/30 uppercase">{reqAdexium} Ads</span>
                        </div>
                        <p className="text-[9.5px] text-white/40 font-bold">Adexium Sponsor Network</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-black ${adexiumCount >= reqAdexium ? 'text-emerald-400' : 'text-cyan-300'}`}>
                        {adexiumCount} <span className="text-[10px] text-white/40 font-normal">/ {reqAdexium}</span>
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-3 border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (adexiumCount / reqAdexium) * 100)}%` }}
                    />
                  </div>

                  {adexiumCount >= reqAdexium ? (
                    <div className="w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={14} /> Adexium Quota Completed ({reqAdexium}/{reqAdexium}) ✓
                    </div>
                  ) : (
                    <motion.button
                      onClick={() => handleWatchAd('adexium')}
                      disabled={isWatchingAd}
                      whileTap={{ scale: 0.96 }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] border border-cyan-400/20 disabled:opacity-60 cursor-pointer"
                    >
                      {isWatchingAd && (watchingProvider === 'adexium' || watchingProvider === 'monetag') ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-white" />
                          <span>Opening Adexium Ad...</span>
                        </>
                      ) : (
                        <>
                          <Play size={13} fill="currentColor" />
                          <span>Watch Adexium Ad — {reqAdexium - adexiumCount} Left</span>
                        </>
                      )}
                    </motion.button>
                  )}
                </div>

                {/* Option 2: GigaPub */}
                <div className={`p-4 rounded-2xl border transition-all ${gigaCount >= reqGiga ? 'bg-indigo-950/25 border-emerald-500/40' : 'bg-gradient-to-r from-indigo-950/40 to-[#1b103c]/60 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-black text-xs flex items-center justify-center border border-indigo-500/30">2</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-white uppercase tracking-wider">Option 2: GigaPub</p>
                          <span className="text-[8.5px] bg-indigo-500/20 text-indigo-300 font-black px-1.5 py-0.5 rounded border border-indigo-500/30 uppercase">{reqGiga} Ads</span>
                        </div>
                        <p className="text-[9.5px] text-white/40 font-bold">Primary Sponsor Network</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-black ${gigaCount >= reqGiga ? 'text-emerald-400' : 'text-indigo-300'}`}>
                        {gigaCount} <span className="text-[10px] text-white/40 font-normal">/ {reqGiga}</span>
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-3 border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (gigaCount / reqGiga) * 100)}%` }}
                    />
                  </div>

                  {gigaCount >= reqGiga ? (
                    <div className="w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={14} /> GigaPub Quota Completed ({reqGiga}/{reqGiga}) ✓
                    </div>
                  ) : (
                    <motion.button
                      onClick={() => handleWatchAd('gigapub')}
                      disabled={isWatchingAd}
                      whileTap={{ scale: 0.96 }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(99,102,241,0.25)] border border-indigo-400/20 disabled:opacity-60 cursor-pointer"
                    >
                      {isWatchingAd && watchingProvider === 'gigapub' ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-white" />
                          <span>Opening GigaPub Ad...</span>
                        </>
                      ) : (
                        <>
                          <Play size={13} fill="currentColor" />
                          <span>Watch GigaPub Ad — {reqGiga - gigaCount} Left</span>
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── CLAIM SECTION ── */}
      {!claimCountdown && (
        <Card className="p-5 bg-gradient-to-b from-[#180f33]/95 to-[#0a051d]/95 border border-amber-500/20">
          <div className="space-y-4">
            {isQuestFinished ? (
              <div className="space-y-3">
                {/* Name Suffix Gate */}
                {!suffixOk && (
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
                          Add <strong className="text-white">| Tasky 🐾</strong> to your Telegram <strong>Name</strong>. Copy below, paste in Telegram Settings &rarr; Edit Name, then tap <em>Recheck</em>.
                        </p>
                      </div>
                    </div>

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
                  </motion.div>
                )}

                {/* 1-Time Account Verification Gate (Anti-Bot & Instant Payout Guarantee) */}
                {status?.requires_referrals && (
                  !status?.referral_requirement_met ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-lg"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                          <ShieldCheck size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-black text-amber-400 uppercase tracking-wider">
                              1-Time Account Verification
                            </p>
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 font-black px-2 py-0.5 rounded border border-amber-500/30 uppercase">
                              {status?.total_referrals || 0}/2 Friends Invited
                            </span>
                          </div>
                          <p className="text-[11.5px] text-white/90 font-bold leading-relaxed mt-1">
                            To consider your account <strong>valid & verified</strong> and ensure you receive your TON payouts <strong>instantly without any delays or holds</strong>, complete this one-time step by inviting at least <strong className="text-amber-300">2 friends</strong>.
                          </p>
                          <p className="text-[10px] text-emerald-400 font-black mt-1.5 flex items-center gap-1">
                            ⚡ Guarantees instant & automatic TON reward payouts!
                          </p>
                        </div>
                      </div>

                      {/* Invite & Copy Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={handleShareReferral}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                        >
                          <Users size={13} />
                          <span>Invite Friends ({2 - Math.min(2, status?.total_referrals || 0)} Remaining)</span>
                        </button>

                        <button
                          onClick={handleCopyReferral}
                          className="px-3 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-bold flex items-center gap-1 hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
                          title="Copy Link"
                        >
                          {copiedRef ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5 flex items-center gap-2"
                    >
                      <ShieldCheck size={16} className="text-emerald-400" />
                      <p className="text-xs font-black text-emerald-400">Account Verified (1-Time Step) ✓ — Instant Payouts Active! ({status?.total_referrals || 0} friends invited)</p>
                    </motion.div>
                  )
                )}

                {suffixOk && (
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
                  disabled={!isWalletConnected || isSubmitting || !suffixOk || (status?.requires_referrals && !status?.referral_requirement_met)}
                  whileTap={{ scale: 0.96 }}
                  animate={isWalletConnected && suffixOk && (!status?.requires_referrals || status?.referral_requirement_met) ? { boxShadow: ['0 0 25px rgba(16,185,129,0.3)', '0 0 45px rgba(16,185,129,0.6)', '0 0 25px rgba(16,185,129,0.3)'] } : {}}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:active:scale-100 border border-emerald-400/20 cursor-pointer"
                >
                  {isSubmitting ? <><Loader2 size={18} className="animate-spin"/>Processing Claim...</> :
                   !isWalletConnected ? <>Connect TON Wallet First</> :
                   !suffixOk ? <>Add | Tasky 🐾 to Name First ↑</> :
                   (status?.requires_referrals && !status?.referral_requirement_met) ? <>Verify Account (Invite 2 Friends) ↑</> :
                   <><Sparkles size={18} className="animate-pulse"/>Receive 0.02 GRAM Instantly!</>}
                </motion.button>
              </div>
            ) : (
              <div className="space-y-2">
                <button disabled className="w-full py-4 rounded-2xl bg-surface text-ink-faint font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 border border-border opacity-50">
                  <Sparkles size={18} />
                  Receive 0.02 GRAM ({TOTAL_ADS - count} ads left)
                </button>
                <div className="flex justify-between items-center text-[10px] text-white/40 font-bold px-1">
                  <span>Adexium: {adexiumCount}/30</span>
                  <span>GigaPub: {gigaCount}/30</span>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── RECENT CLAIMS & TRANSACTION DETAILS ── */}
      <Card className="p-5 bg-gradient-to-b from-[#130d29]/90 to-[#0c081c]/90 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins size={16} className="text-amber-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Claim Transactions History</h3>
          </div>
          <span className="text-[10px] text-white/40 font-bold">Daily 0.02 GRAM Payouts</span>
        </div>

        {claimsHistory.length > 0 ? (
          <div className="space-y-2 pt-1">
            {claimsHistory.map(claim => {
              const isApproved = claim.status === 'approved';
              const isPending = claim.status === 'pending';
              const isRejected = claim.status === 'rejected';

              const formattedDate = claim.requested_at 
                ? new Date(claim.requested_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Recent';

              return (
                <div
                  key={claim.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isApproved ? 'bg-emerald-500/10 border-emerald-500/25' :
                    isPending ? 'bg-amber-500/10 border-amber-500/25' :
                    'bg-red-500/10 border-red-500/25'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                        isApproved ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
                        isPending ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' :
                        'bg-red-500/20 border-red-500/30 text-red-400'
                      }`}>
                        {isApproved ? <CheckCircle2 size={16} /> :
                         isPending ? <Clock size={16} /> :
                         <AlertCircle size={16} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white">{claim.amount || '0.02'} GRAM</span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            isApproved ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            isPending ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                            'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}>
                            {claim.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/40 font-semibold">{formattedDate}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      {isApproved ? (
                        claim.tx_hash ? (
                          <a
                            href={`https://tonviewer.com/transaction/${claim.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-black underline"
                          >
                            <span>Explorer</span>
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-bold">Paid to Wallet ✓</span>
                        )
                      ) : isPending ? (
                        <span className="text-[10px] text-amber-300 font-bold animate-pulse">Processing...</span>
                      ) : (
                        <span className="text-[10px] text-red-400 font-bold truncate max-w-[120px] block">
                          {claim.rejection_reason || 'Rejected'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center bg-black/30 rounded-2xl border border-white/5 space-y-1">
            <Coins size={24} className="text-white/20 mx-auto" />
            <p className="text-xs font-bold text-white/50">No claim history yet</p>
            <p className="text-[10px] text-white/30">Complete your 60 ads to submit your first claim!</p>
          </div>
        )}
      </Card>

      {/* ── COMPULSORY PROOF RULE ── */}
      <div className="bg-red-500/15 border-2 border-red-500/30 rounded-2xl p-4 text-left flex gap-3 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
        <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
          <AlertCircle size={18} className="animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-black text-red-400 uppercase tracking-wider">Compulsory Payment Proof Rule</h4>
          <p className="text-[11px] font-bold text-white/80 leading-relaxed">
            After receiving payment, you <span className="text-red-400 font-extrabold underline">MUST</span> share proof of payment in our{' '}
            <a href="https://t.me/TaskyOfficialCommunity" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline hover:text-indigo-300 font-black animate-pulse">Community Group</a>{' '}
            (associated with @TaskyAppbot). If proof is not shared, you will be permanently blacklisted from all future payouts!
          </p>
        </div>
      </div>

      {/* ── CAMPAIGN RULES ── */}
      <Card className="p-4 bg-white/5 border border-white/5 space-y-2">
        <h4 className="text-[11px] font-black text-white/60 uppercase tracking-widest">Quest Guidelines</h4>
        <ul className="text-xs text-white/40 space-y-1.5 leading-relaxed text-left list-disc list-inside">
          <li>Complete your daily quota of 60 ads (30 GigaPub + 30 Monetag) in 24 hours.</li>
          <li>Each claim is automatically processed and sent directly to your connected TON wallet.</li>
          <li>Automated bots, fake clickers, or skipped sessions will lead to permanent account suspension.</li>
        </ul>
      </Card>

      {/* ── SUCCESS MODAL ── */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#12082b] border-2 border-emerald-500/40 rounded-3xl p-6 w-full max-w-sm text-center space-y-5 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 size={36} className="animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Claim Requested!</h3>
              <p className="text-xs text-white/60">Your 0.02 GRAM daily reward is being processed to your wallet.</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-left space-y-1.5">
              <h4 className="text-xs font-black text-red-400 uppercase tracking-wider flex items-center gap-1.5"><AlertCircle size={14}/>Compulsory Step</h4>
              <p className="text-[11px] text-white/80 font-bold leading-normal">
                Once payment is received, you <span className="text-red-400 font-extrabold underline">MUST</span> share a screenshot in our{' '}
                <a href="https://t.me/TaskyOfficialCommunity" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline font-black">Community Group</a>.
              </p>
              <p className="text-[10px] text-red-400/80 font-black">🚨 Failure to share proof = immediate permanent blacklist!</p>
            </div>
            <button onClick={() => setShowSuccessModal(false)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-black text-sm uppercase tracking-wide active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              I Understand & Agree
            </button>
          </div>
        </div>
      )}

      {/* ── SUFFIX ERROR MODAL ── */}
      {showSuffixErrorModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
          <div className="bg-[#12082b] border-2 border-amber-500/40 rounded-3xl p-6 w-full max-w-sm text-center space-y-5 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30 animate-pulse">
              <AlertCircle size={36} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Name Suffix Required!</h3>
              <p className="text-xs text-white/60">
                You must add the suffix to your Telegram profile name before claiming your 0.02 GRAM reward.
              </p>
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
                  3. Paste <strong>| Tasky 🐾</strong> at the end of your <strong>Name</strong>.<br/>
                  4. Save and return here to click <strong>Recheck Name</strong>.
                </p>
              </div>

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
                    handleClaim();
                  }
                }}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-black text-sm uppercase tracking-wide active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:opacity-60 flex items-center justify-center gap-2">
                {suffixChecking ? <><Loader2 size={14} className="animate-spin"/>Checking...</> : <>Recheck Name</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ENGAGING POST-AD CELEBRATION MODAL ── */}
      <AnimatePresence>
        {rewardCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-gradient-to-b from-[#1c1236] via-[#100924] to-[#080414] border-2 border-indigo-500/40 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-[0_0_50px_rgba(99,102,241,0.35)] relative overflow-hidden"
            >
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-indigo-500/20 rounded-full blur-[40px] pointer-events-none" />

              <button
                onClick={() => setRewardCelebration(null)}
                className="absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>

              <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-amber-400/40"
                />
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-500 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.6)]"
                >
                  <Sparkles size={32} className="text-slate-950 animate-pulse" />
                </motion.div>
              </div>

              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-black uppercase tracking-wider">
                  <CheckCircle2 size={12} /> Ad Validated +1
                </span>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight mt-1">
                  Progress Recorded!
                </h3>
                <p className="text-xs text-amber-300 font-bold leading-relaxed px-2">
                  {rewardCelebration.message}
                </p>
              </div>

              <div className="bg-black/50 border border-white/10 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/60 font-bold flex items-center gap-1">
                    <Flame size={14} className="text-orange-400 fill-orange-400" /> {rewardCelebration.streak}x Streak
                  </span>
                  <span className="text-amber-400 font-black text-sm">
                    {rewardCelebration.count} / {TOTAL_ADS} Ads
                  </span>
                </div>

                <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden p-0.5">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: `${rewardCelebration.pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full"
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-white/40 font-semibold">
                  <span>{rewardCelebration.pct}% Finished</span>
                  <span className="text-amber-300 font-bold">{rewardCelebration.left} Ads remaining</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {rewardCelebration.left > 0 ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    onClick={() => {
                      const nextProvider = currentGiga < 30 ? 'gigapub' : 'monetag';
                      setRewardCelebration(null);
                      setTimeout(() => {
                        handleWatchAd(nextProvider);
                      }, 200);
                    }}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.4)] active:scale-95 transition-all"
                  >
                    <Play size={16} fill="currentColor" />
                    Watch Next Ad ({rewardCelebration.left} Left) 🚀
                  </motion.button>
                ) : (
                  <button
                    onClick={() => {
                      setRewardCelebration(null);
                      handleClaim();
                    }}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-95 transition-all"
                  >
                    <Trophy size={18} />
                    Receive 0.02 GRAM Now! 🎉
                  </button>
                )}

                <button
                  onClick={() => setRewardCelebration(null)}
                  className="w-full py-2.5 text-xs text-white/50 hover:text-white font-bold transition-colors"
                >
                  Take a quick break
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

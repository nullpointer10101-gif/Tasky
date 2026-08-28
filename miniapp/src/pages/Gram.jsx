import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Wallet, CheckCircle2, Clock, AlertCircle, Loader2, Sparkles, Play, Lock, ArrowUpRight, Gem, Zap, Wifi } from 'lucide-react';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { useToast } from '../App';
import triggerConfetti from '../confetti';
import { getGramStatus, claimGramReward, saveGramWalletAddress, watchGramAd, getGramCurrencyBalance, requestGramWithdrawal } from '../api';
import { showRewardedAd } from '../adUtils';
import Button from '../components/Button';
import Card, { cardVariants } from '../components/Card';

export default function Gram({ user, refreshUser }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adLoadingStage, setAdLoadingStage] = useState(0); // 0=idle 1=preparing 2=loading 3=starting
  const adStageTimerRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [claimCountdown, setClaimCountdown] = useState('');
  const [gramInfo, setGramInfo] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { showToast } = useToast();

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
    if (user?.telegram_id) {
      fetchStatus();
    }
  }, [user]);

  useEffect(() => {
    if (!status?.claimed_in_last_24h || !status?.recent_claim?.requested_at) {
      setClaimCountdown('');
      return;
    }

    const updateTimer = () => {
      const requestedTime = new Date(status.recent_claim.requested_at).getTime();
      const nextAvailableTime = requestedTime + 24 * 60 * 60 * 1000;
      const diff = nextAvailableTime - Date.now();

      if (diff <= 0) {
        setClaimCountdown('');
        fetchStatus();
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setClaimCountdown(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const handleWatchAd = async () => {
    // Check 20-second cooldown from last ad time returned by status endpoint
    if (status?.last_ad_time) {
      const secondsSinceLastAd = (Date.now() - new Date(status.last_ad_time).getTime()) / 1000;
      if (secondsSinceLastAd < 20) {
        const timeLeft = Math.ceil(20 - secondsSinceLastAd);
        showToast(`Please wait ${timeLeft} seconds before watching another ad.`, 'error');
        return;
      }
    }

    setIsWatchingAd(true);
    setAdLoadingStage(1);

    // Progress through loading stages for UX feedback
    adStageTimerRef.current = setTimeout(() => setAdLoadingStage(2), 1500);
    adStageTimerRef.current = setTimeout(() => setAdLoadingStage(3), 4000);

    try {
      try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch(e){}
      const adResult = await showRewardedAd('main');

      if (!adResult.success) {
        showToast(adResult.error || 'You must watch the entire ad to get progress.', 'error');
        setIsWatchingAd(false);
        setAdLoadingStage(0);
        return;
      }

      // Record watch via dedicated endpoint (no task dependency)
      const res = await watchGramAd(user?.telegram_id);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        // Optimistically increment counter immediately
        setStatus(prev => prev ? {
          ...prev,
          ads_watched_today: (prev.ads_watched_today || 0) + 1,
          last_ad_time: new Date().toISOString()
        } : prev);
        showToast('Ad watched successfully! Progress updated.', 'success');
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch(e){}
        // Confirm real count from server
        await fetchStatus();
        if (refreshUser) refreshUser();
      }
    } catch (err) {
      console.error('Ad watch error:', err);
      showToast('Failed to log ad completion', 'error');
    } finally {
      clearTimeout(adStageTimerRef.current);
      setIsWatchingAd(false);
      setAdLoadingStage(0);
    }
  };

  const handleClaim = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await claimGramReward(user?.telegram_id || '123456');
      if (error) {
        showToast(error, 'error');
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch(e){}
      } else if (data && data.success) {
        showToast(data.message || 'Claim submitted successfully!', 'success');
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch(e){}
        triggerConfetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        setShowSuccessModal(true);
        fetchStatus(); // Refresh status after claim
      }
    } catch (err) {
      console.error('Gram claim error:', err);
      showToast('Connection error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawGram = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt < 0.01) {
      showToast('Minimum withdrawal is 0.01 GRAM', 'error');
      return;
    }
    if (amt > (gramInfo?.gram_balance || 0)) {
      showToast('Insufficient GRAM balance', 'error');
      return;
    }
    setIsWithdrawing(true);
    try {
      const { data, error } = await requestGramWithdrawal(user?.telegram_id, amt);
      if (error) {
        showToast(error, 'error');
      } else if (data?.success) {
        showToast('Withdrawal request submitted! Admin will process it shortly.', 'success');
        triggerConfetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        setWithdrawAmount('');
        fetchStatus();
      }
    } catch (err) {
      showToast('Connection error', 'error');
    } finally {
      setIsWithdrawing(false);
    }
  };
  const handleWithdrawClick = () => {
    if (!isWalletConnected) {
      try {
        tonConnectUI.openModal();
      } catch (e) {
        console.error('Failed to open TON Connect modal:', e);
      }
      return;
    }
    handleWithdrawGram();
  };

  const isBtnDisabled = isWithdrawing || 
    (isWalletConnected && (gramInfo?.has_pending_withdrawal || !withdrawAmount || parseFloat(withdrawAmount) < 0.01));

  if (loading) {
    return (
      <div className="p-4 md:p-10 h-full flex flex-col items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-4 animate-pulse text-amber-500">
          <Loader2 size={36} className="animate-spin text-amber-500" />
          <p className="font-bold text-ink tracking-widest uppercase text-sm">Loading Gram Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 pb-24 min-h-full relative max-w-md mx-auto">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold text-ink flex items-center gap-2 justify-center md:justify-start">
          <Gem className="text-emerald-400" /> GRAM Currency
        </h1>
        <p className="text-sm text-emerald-400/70 font-bold text-center md:text-left">💎 Earn GRAM through tasks & promo codes. Withdraw to your TON wallet!</p>
      </div>

      {/* ── GRAM IN-APP BALANCE CARD ── */}
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
            <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-lg border border-amber-500/20">
              Pending
            </span>
          )}
        </div>

        {/* Withdrawal Form */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={gramInfo?.gram_balance || 0}
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                placeholder={`Min 0.01 GRAM`}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-bold placeholder-white/20 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <button
              onClick={() => setWithdrawAmount(String(gramInfo?.gram_balance || 0))}
              className="px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black hover:bg-emerald-500/20 transition-colors"
            >
              MAX
            </button>
          </div>
          <button
            onClick={handleWithdrawClick}
            disabled={isBtnDisabled}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          >
            {!isWalletConnected ? (
              <><Wallet size={16} />Connect Wallet First</>
            ) : isWithdrawing ? (
              <><Loader2 size={16} className="animate-spin" />Processing...</>
            ) : gramInfo?.has_pending_withdrawal ? (
              <><Clock size={16} />Withdrawal Pending</>  
            ) : (
              <><ArrowUpRight size={16} />Withdraw GRAM</>
            )}
          </button>
        </div>

        {/* Withdrawal History */}
        {gramInfo?.history?.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Recent Withdrawals</p>
            {gramInfo.history.slice(0, 3).map(w => (
              <div key={w.id} className={`flex items-center justify-between p-2.5 rounded-lg text-xs border ${
                w.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20' :
                w.status === 'rejected' ? 'bg-red-500/10 border-red-500/20' :
                'bg-amber-500/10 border-amber-500/20'
              }`}>
                <div className="flex items-center gap-2">
                  {w.status === 'approved' ? <CheckCircle2 size={12} className="text-emerald-400" /> :
                   w.status === 'rejected' ? <AlertCircle size={12} className="text-red-400" /> :
                   <Clock size={12} className="text-amber-400" />}
                  <span className={`font-black ${
                    w.status === 'approved' ? 'text-emerald-400' : w.status === 'rejected' ? 'text-red-400' : 'text-amber-400'
                  }`}>{w.amount} GRAM</span>
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

      {/* Header for ad section */}
      <div>
        <h2 className="text-lg font-bold text-ink flex items-center gap-2 justify-center md:justify-start">
          <Coins className="text-amber-500" /> Daily Ads Daily Rewards
        </h2>
        <p className="text-sm text-indigo-400 font-bold text-center md:text-left">⚡ Complete daily ads and receive instant payment!</p>
      </div>

      {/* Compulsory Proof Sharing Banner */}
      <div className="bg-red-500/15 border-2 border-red-500/30 rounded-2xl p-4 text-left flex gap-3 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
        <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
          <AlertCircle size={18} className="animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-black text-red-400 uppercase tracking-wider">Compulsory Rule</h4>
          <p className="text-[11px] font-bold text-white/80 leading-relaxed">
            After receiving payment, you <span className="text-red-400 font-extrabold underline">MUST</span> share proof of payment in our{' '}
            <a 
              href="https://t.me/TaskyOfficialCommunity" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-indigo-400 underline hover:text-indigo-300 font-black animate-pulse"
            >
              Community Group
            </a>{' '}
            (associated with @TaskyAppbot). If proof is not shared, you will be permanently blacklisted from all future payments & rewards!
          </p>
        </div>
      </div>

      {/* Wallet Connection Status */}
      {status?.gram_wallet_address ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-left flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Wallet size={16} />
            </div>
            <div>
              <p className="text-[10px] text-emerald-500/70 font-black uppercase tracking-wider leading-none mb-1">Linked Wallet</p>
              <p className="text-xs font-mono font-black text-emerald-400 break-all select-all">
                {status.gram_wallet_address.substring(0, 12)}...{status.gram_wallet_address.substring(status.gram_wallet_address.length - 8)}
              </p>
            </div>
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg">
            Auto TON Connect
          </span>
        </div>
      ) : (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-left flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
            <AlertCircle size={16} />
          </div>
          <div>
            <p className="text-[10px] text-red-400/70 font-black uppercase tracking-wider leading-none mb-1">Wallet Disconnected</p>
            <p className="text-xs font-bold text-red-400">
              Please connect your TON wallet in the Wallet tab to claim.
            </p>
          </div>
        </div>
      )}

      {/* Main progress card or Locked countdown card */}
      {claimCountdown ? (
        <Card className="p-6 relative overflow-hidden bg-gradient-to-b from-[#180f33]/90 to-[#0a051d]/90 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)] text-center space-y-4">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-[40px] rounded-full pointer-events-none" />
          
          <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <Lock size={28} className="animate-pulse" />
          </div>

          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Next Reward Unlocks In</h2>
            <p className="text-xs text-amber-300/80 font-bold uppercase mt-0.5">Daily quota completed</p>
          </div>

          <div className="bg-black/40 rounded-2xl p-5 border border-white/5 font-mono text-3xl font-black text-amber-400 tracking-widest shadow-inner">
            {claimCountdown}
          </div>

          <p className="text-[11.5px] text-white/60 font-bold leading-normal px-2">
            🎉 You have successfully watched all 60 ads and claimed your 0.02 GRAM daily reward! The quest will unlock again in 24 hours.
          </p>
        </Card>
      ) : (
        <>
          <Card className="p-6 relative overflow-hidden bg-gradient-to-b from-[#180f33]/90 to-[#0a051d]/90 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-[40px] rounded-full pointer-events-none" />
            
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] border border-amber-300/30">
                <Coins size={28} className="text-white" />
              </div>

              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Daily Quest</h2>
                <p className="text-xs text-amber-300 font-bold tracking-wider uppercase mt-0.5">0.02 GRAM Reward Pool</p>
              </div>

              <div className="w-full bg-black/40 rounded-2xl p-4 border border-white/5 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white/50">Your Daily Progress</span>
                  <span className="font-black text-amber-400">{status?.ads_watched_today || 0} / 60 Ads</span>
                </div>
                
                <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((status?.ads_watched_today || 0) / 60) * 100)}%` }}
                  />
                </div>

                {status?.ads_watched_today < 60 ? (
                  <p className="text-[11px] text-amber-300 font-bold">
                    🚀 Watch {60 - (status?.ads_watched_today || 0)} more ads to receive your 0.02 GRAM Bounty!
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-400 font-bold flex items-center justify-center gap-1.5 animate-pulse">
                    🎉 QUEST COMPLETED! Unlock your instant rewards below!
                  </p>
                )}
              </div>

              {/* Action button for watching ad */}
              {status?.ads_watched_today < 60 && (
                <>
                  <AnimatePresence>
                    {isWatchingAd && (
                      <motion.div
                        key="ad-loading-overlay"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full bg-black/60 border border-indigo-500/30 rounded-2xl p-5 flex flex-col items-center gap-3 backdrop-blur-sm"
                      >
                        {/* Animated pulse ring */}
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
                          <p className="text-[11px] text-white/40 font-bold">
                            Please keep the app open and watch the full ad
                          </p>
                        </div>

                        {/* Animated loading bar */}
                        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                            initial={{ width: '0%' }}
                            animate={{ width: adLoadingStage === 1 ? '25%' : adLoadingStage === 2 ? '60%' : '85%' }}
                            transition={{ duration: 1.2, ease: 'easeInOut' }}
                          />
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-bold">
                          <Wifi size={10} />
                          <span>Do not close or switch apps</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!isWatchingAd && (
                    <button
                      onClick={handleWatchAd}
                      disabled={isWatchingAd}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shadow-[0_0_20px_rgba(99,102,241,0.2)] border border-indigo-400/20"
                    >
                      <Play size={16} fill="currentColor" />
                      Watch Ad (+1 Progress)
                    </button>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* Claim Form Section */}
          <Card className="p-6 bg-gradient-to-b from-[#180f33]/90 to-[#0a051d]/90 border border-amber-500/20">
            <div className="space-y-4">
              {status?.ads_watched_today >= 60 ? (
                <button
                  onClick={handleClaim}
                  disabled={status?.claimed_in_last_24h || !status?.gram_wallet_address || isSubmitting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shadow-[0_0_25px_rgba(16,185,129,0.3)] border border-emerald-400/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processing Rewards...
                    </>
                  ) : status?.claimed_in_last_24h ? (
                    <>
                      Already Claimed Today
                    </>
                  ) : !status?.gram_wallet_address ? (
                    <>
                      Connect Wallet to Receive
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} className="animate-pulse" />
                      Receive 0.02 GRAM Instantly!
                    </>
                  )}
                </button>
              ) : (
                <button
                  disabled={true}
                  className="w-full py-4 rounded-2xl bg-surface text-ink-faint font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 border border-border opacity-50"
                >
                  <Sparkles size={18} />
                  Receive 0.02 GRAM Bounty (Locked)
                </button>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Claim History Status Banner */}
      {status?.recent_claim && (
        <Card className={`p-4 border ${
          status.recent_claim.status === 'pending'
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            : status.recent_claim.status === 'approved'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <div className="flex items-center gap-2 justify-center text-sm font-bold">
            {status.recent_claim.status === 'pending' ? (
              <>
                <Clock size={16} />
                <span>Claim request is pending admin approval</span>
              </>
            ) : status.recent_claim.status === 'approved' ? (
              <>
                <CheckCircle2 size={16} />
                <span>Approved! 0.02 GRAM sent to wallet.</span>
              </>
            ) : (
              <>
                <AlertCircle size={16} />
                <span>Rejected: {status.recent_claim.rejection_reason || 'Check details.'}</span>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Rules / Information */}
      <Card className="p-5 bg-white/5 border border-white/5 space-y-2.5">
        <h4 className="text-xs font-black text-white/60 uppercase tracking-widest">Campaign Rules</h4>
        <ul className="text-xs text-white/40 space-y-1.5 leading-relaxed text-left list-disc list-inside">
          <li>Complete your daily quota of 60 ads in a 24-hour window.</li>
          <li>Each claim is automatically processed and sent directly to your wallet.</li>
          <li>Do not use automation or scripts; this will trigger account suspension.</li>
        </ul>
      </Card>
      {/* Success Confirmation Modal */}
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
              <h4 className="text-xs font-black text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle size={14} /> Critical Requirement
              </h4>
              <p className="text-[11px] text-white/80 font-bold leading-normal">
                Once payment is received in your wallet, you <span className="text-red-400 font-extrabold underline">MUST</span> share a screenshot of the payment proof in our{' '}
                <a 
                  href="https://t.me/TaskyOfficialCommunity" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-400 underline font-black"
                >
                  Community Group
                </a>.
              </p>
              <p className="text-[10px] text-red-400/80 font-black">
                🚨 Failure to share proof will result in an immediate permanent ban on future rewards!
              </p>
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-sm uppercase tracking-wide active:scale-95 transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)]"
            >
              I Understand & Agree
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

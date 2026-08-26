import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Coins, Wallet, CheckCircle2, Clock, AlertCircle, Loader2, Sparkles, Play } from 'lucide-react';
import { useToast } from '../App';
import triggerConfetti from '../confetti';
import { getGramStatus, claimGramReward, getTasks, completeTask, saveGramWalletAddress } from '../api';
import { showRewardedAd } from '../adUtils';
import Button from '../components/Button';
import Card, { cardVariants } from '../components/Card';

export default function Gram({ user, refreshUser }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adTask, setAdTask] = useState(null);
  const { showToast } = useToast();

  const fetchStatus = async () => {
    try {
      if (status === null) setLoading(true);
      const [statusRes, tasksRes] = await Promise.all([
        getGramStatus(user?.telegram_id || '123456'),
        getTasks(user?.telegram_id || '123456')
      ]);

      if (statusRes.data) {
        setStatus(statusRes.data);
      }

      if (tasksRes.data) {
        const adT = tasksRes.data.find(t => t.verification_type === 'auto_ad');
        setAdTask(adT);
      }
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

  const handleWatchAd = async () => {
    if (!adTask) {
      showToast('Ad task not available. Please try again later.', 'error');
      return;
    }
    
    setIsWatchingAd(true);
    try {
      try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch(e){}
      const adResult = await showRewardedAd('main');
      
      if (!adResult.success) {
        showToast(adResult.error || 'You must watch the entire ad to get progress.', 'error');
        setIsWatchingAd(false);
        return;
      }

      const res = await completeTask(user?.telegram_id, adTask.id);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast('Ad watched successfully! Progress updated.', 'success');
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch(e){}
        await fetchStatus();
        if (refreshUser) refreshUser();
      }
    } catch (err) {
      console.error('Ad watch error:', err);
      showToast('Failed to log ad completion', 'error');
    } finally {
      setIsWatchingAd(false);
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
        fetchStatus(); // Refresh status after claim
      }
    } catch (err) {
      console.error('Gram claim error:', err);
      showToast('Connection error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <Coins className="text-amber-500" /> Daily Ads Daily Rewards
        </h1>
        <p className="text-sm text-indigo-400 font-bold text-center md:text-left">⚡ Complete daily ads and receive instant payment!</p>
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

      {/* Main progress card */}
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
            <button
              onClick={handleWatchAd}
              disabled={isWatchingAd}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shadow-[0_0_20px_rgba(99,102,241,0.2)] border border-indigo-400/20"
            >
              {isWatchingAd ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Loading Ad Video...
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" />
                  Watch Ad (+1 Progress)
                </>
              )}
            </button>
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
          <li>Each claim is manually verified by the administrator.</li>
          <li>Do not use automation or scripts; this will trigger account suspension.</li>
        </ul>
      </Card>
    </div>
  );
}

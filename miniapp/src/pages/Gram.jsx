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
  const [gramAddress, setGramAddress] = useState('');
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
        if (statusRes.data.gram_wallet_address) {
          setGramAddress(statusRes.data.gram_wallet_address);
        }
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
    const cleanAddress = gramAddress.trim();
    if (!cleanAddress) {
      showToast('Please enter a Gram wallet address', 'error');
      return;
    }
    if (cleanAddress.length < 10) {
      showToast('Please enter a valid Gram wallet address', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await claimGramReward(user?.telegram_id || '123456', cleanAddress);
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

  const handleSaveAddress = async () => {
    const cleanAddress = gramAddress.trim();
    if (!cleanAddress) {
      showToast('Please enter a Gram wallet address', 'error');
      return;
    }
    if (cleanAddress.length < 10) {
      showToast('Please enter a valid Gram wallet address', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await saveGramWalletAddress(user?.telegram_id || '123456', cleanAddress);
      if (error) {
        showToast(error, 'error');
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch(e){}
      } else if (data && data.success) {
        showToast(data.message || 'Gram wallet address saved!', 'success');
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch(e){}
        fetchStatus();
      }
    } catch (err) {
      console.error('Save address error:', err);
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
          <Coins className="text-amber-500" /> Gram Daily Reward
        </h1>
        <p className="text-sm text-ink-soft text-center md:text-left">Watch 60 ads daily and claim 0.02 GRAM token reward.</p>
      </div>

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
              <p className="text-[11px] text-white/40 font-medium">
                Complete {60 - (status?.ads_watched_today || 0)} more ads today to unlock the claim form.
              </p>
            ) : (
              <p className="text-[11px] text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 size={13} /> Quest completed! Ready to claim.
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

      {/* Wallet Address & Claim Form section (always visible) */}
      <Card className="p-6 bg-gradient-to-b from-[#180f33]/90 to-[#0a051d]/90 border border-amber-500/20">
        <div className="space-y-4">
          <div className="space-y-2 text-left">
            <label className="text-xs font-black text-white/60 uppercase tracking-wider flex items-center gap-1.5 ml-1">
              <Wallet size={13} className="text-amber-500" /> Gram Wallet Address
            </label>
            <input
              type="text"
              value={gramAddress}
              onChange={(e) => setGramAddress(e.target.value)}
              placeholder="ENTER YOUR GRAM WALLET ADDRESS"
              className="w-full bg-black/40 border-2 border-amber-500/20 rounded-2xl py-4 px-4 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/60 focus:bg-black/60 transition-all"
              disabled={isSubmitting || status?.claimed_in_last_24h}
            />
          </div>

          {status?.ads_watched_today >= 60 ? (
            <button
              onClick={handleClaim}
              disabled={status?.claimed_in_last_24h || isSubmitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-yellow-600 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shadow-[0_0_20px_rgba(245,158,11,0.2)] border border-amber-400/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Submitting Claim...
                </>
              ) : status?.claimed_in_last_24h ? (
                <>
                  Already Claimed Today
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Claim 0.02 GRAM
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleSaveAddress}
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shadow-[0_0_20px_rgba(99,102,241,0.15)] border border-indigo-400/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving Address...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Save Wallet Address
                </>
              )}
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
          <li>Enter a valid TON/Gram wallet address.</li>
          <li>Each claim is manually verified by the administrator.</li>
          <li>Do not use automation or scripts; this will trigger account suspension.</li>
        </ul>
      </Card>
    </div>
  );
}

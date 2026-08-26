import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, Sparkles, Loader2, Coins, Wallet, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '../App';
import triggerConfetti from '../confetti';
import { getGramStatus, claimGramReward } from '../api';

export default function GramClaimModal({ isOpen, onClose, user, onClaimSuccess }) {
  const [gramAddress, setGramAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await getGramStatus(user?.telegram_id || '123456');
      if (error) {
        showToast(error, 'error');
      } else if (data) {
        setStatus(data);
        if (data.gram_wallet_address) {
          setGramAddress(data.gram_wallet_address);
        }
      }
    } catch (err) {
      console.error('Failed to fetch Gram claim status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user?.telegram_id) {
      fetchStatus();
    }
  }, [isOpen, user]);

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
        if (onClaimSuccess) onClaimSuccess();
        fetchStatus(); // Refresh status after claim
      }
    } catch (err) {
      console.error('Gram claim error:', err);
      showToast('Connection error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#180f33] to-[#0a051d] border-2 border-amber-500/30 overflow-hidden relative shadow-[0_0_40px_rgba(245,158,11,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glowing orb effect behind */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none" />
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-50 p-2"
            >
              <X size={24} />
            </button>

            <div className="p-6 pt-10 text-center relative z-10">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(245,158,11,0.4)] border border-amber-300/30">
                <Coins size={36} className="text-white" />
              </div>

              <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1">
                Gram Daily Reward
              </h2>
              <p className="text-xs text-amber-200/70 mb-5 font-bold uppercase tracking-wider">
                Claim 0.02 GRAM Daily
              </p>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-2">
                  <Loader2 size={24} className="animate-spin text-amber-500" />
                  <span className="text-xs text-white/50">Fetching claim status...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Progress Indicator */}
                  <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-white/60">Today's Ad Progress</span>
                      <span className="text-xs font-black text-amber-400">{status?.ads_watched_today || 0} / 60 watched</span>
                    </div>
                    <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/5">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((status?.ads_watched_today || 0) / 60) * 100)}%` }}
                      />
                    </div>
                    
                    {status?.ads_watched_today < 60 ? (
                      <p className="text-[11px] text-white/40 mt-2 font-medium">
                        Complete all 60 daily ads to unlock the 0.02 GRAM claim button.
                      </p>
                    ) : (
                      <p className="text-[11px] text-emerald-400 mt-2 font-bold flex items-center justify-center gap-1">
                        <CheckCircle2 size={12} /> Daily ad quest completed!
                      </p>
                    )}
                  </div>

                  {/* Status Banner */}
                  {status?.recent_claim && (
                    <div className={`p-3.5 rounded-2xl text-xs font-bold border ${
                      status.recent_claim.status === 'pending'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        : status.recent_claim.status === 'approved'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      <div className="flex items-center gap-2 justify-center">
                        {status.recent_claim.status === 'pending' ? (
                          <>
                            <Clock size={14} />
                            <span>Claim Request Pending Admin Review</span>
                          </>
                        ) : status.recent_claim.status === 'approved' ? (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Approved! 0.02 GRAM sent to your wallet.</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={14} />
                            <span>Rejected: {status.recent_claim.rejection_reason || 'Rejection reason not specified.'}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Input Form */}
                  {status?.ads_watched_today >= 60 && (
                    <div className="space-y-3 text-left">
                      <label className="text-xs font-black text-white/60 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                        <Wallet size={12} className="text-amber-500" /> Gram Wallet Address
                      </label>
                      <input
                        type="text"
                        value={gramAddress}
                        onChange={(e) => setGramAddress(e.target.value)}
                        placeholder="ENTER YOUR GRAM WALLET ADDRESS"
                        className="w-full bg-black/40 border-2 border-amber-500/20 rounded-2xl py-3.5 px-4 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/60 focus:bg-black/60 transition-all"
                        disabled={isSubmitting || status?.claimed_in_last_24h}
                      />
                    </div>
                  )}

                  {/* Action Button */}
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
                      disabled
                      className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/30 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      Locked (Watch {60 - status?.ads_watched_today} more ads)
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

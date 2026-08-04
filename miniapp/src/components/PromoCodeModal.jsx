import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '../App';
import triggerConfetti from '../confetti';

export default function PromoCodeModal({ isOpen, onClose, onRedeemSuccess, user }) {
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const { showToast } = useToast();

  const handleRedeem = async () => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      showToast('Please enter a bounty code', 'error');
      return;
    }

    setIsRedeeming(true);
    try {
      // In production this connects to our backend endpoint
      const res = await fetch('https://tasky-bot.onrender.com/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user?.telegram_id || '123456', code: cleanCode })
      });

      const data = await res.json();
      
      if (data.success) {
        showToast(data.message || `Redeemed ${data.reward_amount} TASKY!`, 'success');
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch(e){}
        triggerConfetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        setCode('');
        if (onRedeemSuccess) {
          onRedeemSuccess(data.reward_amount);
        }
        setTimeout(() => onClose(), 1500);
      } else {
        showToast(data.error || 'Failed to redeem code', 'error');
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch(e){}
      }
    } catch (err) {
      console.error('Promo redeem error:', err);
      showToast('Connection error', 'error');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#1a133b] to-[#0c081e] border-2 border-indigo-500/30 overflow-hidden relative"
          >
            {/* Glowing orb effect behind */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/20 blur-[50px] rounded-full" />
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-10"
            >
              <X size={24} />
            </button>

            <div className="p-6 pt-10 text-center relative z-10">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(99,102,241,0.4)]">
                <Gift size={36} className="text-white" />
              </div>

              <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
                Redeem Bounty
              </h2>
              <p className="text-sm text-indigo-200/70 mb-6 font-medium">
                Enter a secret bounty code below to claim instant TASKY rewards!
              </p>

              <div className="relative mb-6">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE"
                  className="w-full bg-black/40 border-2 border-indigo-500/30 rounded-2xl py-4 px-4 text-center text-xl font-black text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-400 focus:bg-black/60 transition-all uppercase tracking-widest"
                  maxLength={20}
                  disabled={isRedeeming}
                />
              </div>

              <button
                onClick={handleRedeem}
                disabled={!code.trim() || isRedeeming}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-white/20"
              >
                {isRedeeming ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Claim Reward
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

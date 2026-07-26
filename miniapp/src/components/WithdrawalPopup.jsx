import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Share2, XCircle } from 'lucide-react';
import { useToast } from '../App';

export default function WithdrawalPopup({ user, refreshUser }) {
  const [isDismissing, setIsDismissing] = useState(false);
  const { showToast } = useToast();

  if (!user?.has_unseen_approved_withdrawal || isDismissing) return null;

  const handleSkip = async () => {
    setIsDismissing(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL === 'http://localhost:3000' ? '' : import.meta.env.VITE_API_URL;
      const res = await fetch(`${API_URL}/api/users/skip-withdrawal-popup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user.telegram_id })
      });
      const data = await res.json();
      if (data.success) {
        refreshUser();
      } else {
        setIsDismissing(false);
      }
    } catch (err) {
      console.error(err);
      setIsDismissing(false);
    }
  };

  const handleShare = async () => {
    setIsDismissing(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL === 'http://localhost:3000' ? '' : import.meta.env.VITE_API_URL;
      const res = await fetch(`${API_URL}/api/users/dismiss-withdrawal-popup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user.telegram_id })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🎉 You got a surprise ${data.reward} TASKY reward!`, 'success');
        refreshUser();
        // Redirect to community chat
        window.open('https://t.me/TaskyOfficialCommunity', '_blank');
      } else {
        showToast(data.error || 'Failed to claim reward', 'error');
        setIsDismissing(false);
      }
    } catch (err) {
      console.error(err);
      showToast('Network error', 'error');
      setIsDismissing(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-surface rounded-2xl p-6 w-full max-w-sm relative overflow-hidden shadow-2xl border border-indigo-500/20"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          
          <div className="flex justify-center mb-4 relative">
            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full"></div>
            <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center relative border border-indigo-500/30">
              <Gift className="w-8 h-8 text-indigo-400" />
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-center text-ink mb-2">🎉 Withdrawal Approved!</h2>
          <p className="text-center text-ink-soft text-sm mb-6">
            Congratulations! You MUST share your withdrawal proof in the Tasky community group right now to receive a surprise reward from the Admin!
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-95"
            >
              <Share2 className="w-5 h-5" />
              Share Proof Now
            </button>
            <button
              onClick={handleSkip}
              className="w-full flex items-center justify-center text-ink-soft hover:text-ink font-semibold py-2 transition-all active:scale-95 text-sm"
            >
              Maybe Later ({5 - (user.withdrawal_popup_views || 0)} skips left)
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

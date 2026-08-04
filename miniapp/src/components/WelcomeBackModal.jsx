import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Sparkles, X, Trophy } from 'lucide-react';
import triggerConfetti from '../confetti';

export default function WelcomeBackModal({ user, speedPerHour = 5, onClaim }) {
  const [isOpen, setIsOpen] = useState(false);
  const [offlineEarned, setOfflineEarned] = useState(0);
  const [hoursAway, setHoursAway] = useState(0);

  useEffect(() => {
    try {
      const lastSeen = localStorage.getItem('tasky_last_seen');
      const now = Date.now();

      if (lastSeen) {
        const diffMs = now - parseInt(lastSeen, 10);
        const diffMinutes = diffMs / (1000 * 60);

        // If away for at least 15 minutes
        if (diffMinutes >= 15) {
          const hours = Math.min(diffMinutes / 60, 12); // cap at 12 hours
          const speed = Number(speedPerHour) || 5;
          const calculatedEarnings = Math.max(10, Math.floor(hours * speed));

          setHoursAway(hours.toFixed(1));
          setOfflineEarned(calculatedEarnings);
          setIsOpen(true);

          // Trigger celebratory subtle confetti
          try {
            confetti({
              particleCount: 40,
              spread: 60,
              origin: { y: 0.6 }
            });
          } catch (e) {}
        }
      }

      // Update last seen
      localStorage.setItem('tasky_last_seen', now.toString());
    } catch (e) {
      console.error('WelcomeBackModal error:', e);
    }
  }, [speedPerHour]);

  const handleClaim = () => {
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
      triggerConfetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 }
      });
    } catch (e) {}

    setIsOpen(false);
    if (onClaim) onClaim(offlineEarned);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 "
        >
          <motion.div
            initial={{ scale: 0.8, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative w-full max-w-sm bg-surface border-2 border-indigo-500/40 rounded-[2.5rem] p-6 shadow-[0_25px_60px_-15px_rgba(99,102,241,0.5)] text-center overflow-hidden"
          >
            {/* Ambient Background Glow */}

            {/* Close Icon */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-ink-soft hover:text-ink hover:bg-surface-soft transition-all"
            >
              <X size={20} />
            </button>

            {/* Glowing Icon */}
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-orange-500 to-indigo-600 p-0.5 shadow-xl mb-4">
              <div className="w-full h-full bg-surface rounded-[22px] flex items-center justify-center">
                <Zap size={36} className="text-amber-400 fill-amber-400 " />
              </div>
              <Sparkles className="absolute -top-2 -right-2 text-amber-300 w-6 h-6 " />
            </div>

            {/* Copy */}
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">
              While You Were Away
            </h3>
            <h2 className="text-2xl font-black text-ink mb-2">
              Mining Rig Was Working! ⚡
            </h2>
            <p className="text-xs text-ink-soft mb-5 px-2">
              Your rig mined non-stop for <strong className="text-ink">{hoursAway} hours</strong> while you were offline.
            </p>

            {/* Big Payout Counter Banner */}
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/15 to-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 mb-6 relative overflow-hidden">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400 block mb-1">
                Passive Yield Accrued
              </span>
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400">
                  +{offlineEarned.toLocaleString()}
                </span>
                <span className="text-lg font-black text-indigo-400">TASKY</span>
              </div>
            </div>

            {/* Action Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleClaim}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-black text-base shadow-[0_10px_25px_rgba(99,102,241,0.4)] border-b-4 border-indigo-900 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2"
            >
              <span>Collect To Balance 💥</span>
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

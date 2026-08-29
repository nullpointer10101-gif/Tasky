import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Sparkles, X, Activity, Cpu, BatteryCharging } from 'lucide-react';
import triggerConfetti from '../confetti';

export default function WelcomeBackModal({ user, speedPerHour = 5, onClaim }) {
  const [isOpen, setIsOpen] = useState(false);
  const [offlineEarned, setOfflineEarned] = useState(0);
  const [hoursAway, setHoursAway] = useState(0);
  const [hashRate, setHashRate] = useState('0.00');

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
          setHashRate((speed * 1.45).toFixed(2));
          setIsOpen(true);

          // Trigger celebratory subtle confetti
          try {
            triggerConfetti({
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#05030f]/95"
        >
          <motion.div
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative w-full max-w-sm bg-gradient-to-b from-[#181135] to-[#0d0924] border-2 border-indigo-500/40 rounded-[2rem] p-6 text-center overflow-hidden shadow-2xl"
          >
            {/* Ambient Background Grid / Tech overlay - removed mix-blend for performance */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>
            
            {/* Close Icon */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-indigo-300 hover:text-white hover:bg-white/10 transition-all z-10"
            >
              <X size={20} />
            </button>

            {/* Glowing Icon */}
            <div className="relative inline-flex flex-col items-center justify-center w-24 h-24 rounded-full border border-indigo-500/50 bg-indigo-950/50 mb-5 overflow-hidden">
               <div className="absolute inset-0 bg-indigo-500/20 animate-pulse rounded-full"></div>
               <Cpu size={36} className="text-cyan-400 mb-1 relative z-10" />
               <span className="text-[10px] font-bold text-cyan-200 tracking-widest relative z-10">CORE SECURE</span>
            </div>

            {/* Copy */}
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-1">
              SYSTEM REPORT
            </h3>
            <h2 className="text-xl font-black text-white mb-2 tracking-wide uppercase">
              Rig Maintained Power ⚡
            </h2>
            <p className="text-xs text-indigo-200 mb-5 px-1 font-medium leading-relaxed">
              Your nodes generated continuous hash-power for <strong className="text-white bg-indigo-500/30 px-1.5 py-0.5 rounded font-mono border border-indigo-500/50">{hoursAway} hrs</strong> while you were disconnected.
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-left">
               <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col items-center text-center">
                  <Activity size={14} className="text-emerald-400 mb-1" />
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Avg Hashrate</span>
                  <span className="text-sm font-mono text-emerald-300 font-bold">{hashRate} TH/s</span>
               </div>
               <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col items-center text-center">
                  <BatteryCharging size={14} className="text-yellow-400 mb-1" />
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Efficiency</span>
                  <span className="text-sm font-mono text-yellow-300 font-bold">100%</span>
               </div>
            </div>

            {/* Big Payout Counter Banner */}
            <div className="bg-gradient-to-r from-indigo-900/50 via-blue-900/40 to-indigo-900/50 border border-cyan-500/30 rounded-2xl p-4 mb-6 relative overflow-hidden shadow-inner">
               <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-indigo-300 block mb-1">
                Passive Yield Accrued
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-emerald-300 font-mono tracking-tighter">
                  +{offlineEarned.toLocaleString()}
                </span>
                <span className="text-sm font-black text-cyan-500 uppercase rotate-[-90deg] -ml-2 origin-left">TASKY</span>
              </div>
            </div>

            {/* Action Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleClaim}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white font-black text-[13px] uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] border border-cyan-300/50 transition-all flex items-center justify-center gap-2"
            >
              <Zap size={16} className="fill-white" />
              <span>COLLECT YIELD TO BALANCE</span>
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Flame, Shield, Sparkles, ChevronRight, Trophy, Cpu } from 'lucide-react';
import triggerConfetti from '../confetti';

export default function CyberMiningCore({
  activeSession,
  baseMined = 0,
  speedPerHour = 5.0,
  currentLevel = 1,
  nextTier = { name: 'Silver Vault', threshold: 2400, boost: '2.5x' },
  onClaim,
  onStart,
  claiming = false,
  starting = false,
}) {
  const [liveMined, setLiveMined] = useState(baseMined);
  const [tapBonus, setTapBonus] = useState(0);
  const [tapParticles, setTapParticles] = useState([]);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState(0);
  const animRef = useRef(null);

  // 60fps ticking calculation
  useEffect(() => {
    if (!activeSession) {
      setLiveMined(baseMined);
      return;
    }

    const ratePerMs = (Number(speedPerHour) || 5.0) / (3600 * 1000);
    const startMs = performance.now();
    const initialMined = Number(baseMined) || 0;

    const tick = (now) => {
      const elapsed = now - startMs;
      setLiveMined(initialMined + elapsed * ratePerMs + tapBonus);
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [activeSession, baseMined, speedPerHour, tapBonus]);

  const handleHyperchargeTap = (e) => {
    // Spawn floating particle
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now() + Math.random();

    setTapParticles((prev) => [...prev.slice(-6), { id, x, y }]);
    setTapBonus((prev) => prev + 0.05);

    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }
    } catch (_) {}

    setTimeout(() => {
      setTapParticles((prev) => prev.filter((p) => p.id !== id));
    }, 900);
  };

  const handleClaimClick = async () => {
    const finalAmount = Math.floor(liveMined);
    setClaimedAmount(finalAmount);
    
    // Trigger confetti
    triggerConfetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (_) {}

    setShowClaimModal(true);
    if (onClaim) {
      await onClaim();
    }
  };

  const integerMined = Math.floor(liveMined).toLocaleString();
  const decimalMined = (liveMined % 1).toFixed(3).substring(1);
  const progressToNext = Math.min(100, Math.max(10, ((liveMined % 2400) / 2400) * 100));

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-[#181135] via-[#0e0a24] to-[#080516] border border-indigo-500/30 p-5 shadow-[0_0_40px_rgba(79,70,229,0.25)] transform-gpu will-change-transform">
      {/* Background glowing plasma orbs */}
      <div className="absolute -top-12 -left-12 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-12 -right-12 w-44 h-44 bg-purple-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Cybernetic Core Reactor Ring */}
      <div className="relative flex flex-col items-center justify-center my-4">
        <div
          onClick={activeSession ? handleHyperchargeTap : undefined}
          className="relative w-48 h-48 flex items-center justify-center cursor-pointer select-none active:scale-95 transition-transform"
        >
          {/* Outer Pulsing Neon Rings */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-indigo-400/40 animate-[spin_12s_linear_infinite]" />
          <div className="absolute inset-2 rounded-full border border-cyan-400/30 animate-[spin_8s_linear_infinite_reverse]" />
          <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-indigo-600/30 via-purple-600/20 to-cyan-500/20 blur-md" />

          {/* Inner Glowing Reactor Orb */}
          <div className="relative z-10 w-36 h-36 rounded-full bg-gradient-to-b from-[#2e1d68] to-[#120b2e] border-2 border-indigo-400/50 flex flex-col items-center justify-center shadow-[inset_0_0_20px_rgba(99,102,241,0.6)]">
            <Cpu size={28} className="text-cyan-300 mb-1 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">
              {activeSession ? 'OVERDRIVE ACTIVE' : 'REACTOR IDLE'}
            </span>
            <span className="text-xs font-black text-cyan-300 flex items-center gap-1 mt-0.5">
              <Zap size={12} className="fill-cyan-300" />
              +{(Number(speedPerHour) || 5.0).toFixed(1)}/hr
            </span>
          </div>

          {/* Tap-to-boost floating particles */}
          <AnimatePresence>
            {tapParticles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 1, y: 0, scale: 0.8 }}
                animate={{ opacity: 0, y: -60, scale: 1.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="absolute font-black text-xs text-amber-300 pointer-events-none z-30 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                style={{ left: p.x, top: p.y }}
              >
                +1.5x OVERDRIVE! ⚡
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {activeSession && (
          <p className="text-[11px] font-bold text-indigo-300/80 mt-2 animate-pulse">
            👆 Tap reactor for Instant Hypercharge Multiplier!
          </p>
        )}
      </div>

      {/* Live Odometer Ticker */}
      <div className="flex flex-col items-center text-center my-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">
          MINED REWARD ACCUMULATOR
        </p>
        <div className="flex items-baseline justify-center gap-1 my-1">
          <span className="text-4xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]">
            {integerMined}
          </span>
          <span className="text-xl font-black text-cyan-300 font-mono">
            {decimalMined}
          </span>
          <span className="text-xs font-black text-indigo-300 uppercase ml-1">TASKY</span>
        </div>
      </div>

      {/* Near-Miss Tier Framing Banner */}
      <div className="my-3 p-3 rounded-2xl bg-indigo-950/60 border border-indigo-500/20 backdrop-blur-md">
        <div className="flex items-center justify-between text-xs font-black mb-1.5">
          <span className="flex items-center gap-1 text-amber-300">
            <Flame size={14} className="fill-amber-400 text-amber-400 animate-bounce" />
            Next: {nextTier.name}
          </span>
          <span className="text-cyan-300">{nextTier.boost} Mining Speed</span>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-2.5 bg-black/50 rounded-full overflow-hidden border border-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full"
            style={{ width: `${progressToNext}%` }}
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        </div>
        <p className="text-[10px] text-gray-400 font-bold mt-1 text-right">
          {Math.floor(2400 - (liveMined % 2400)).toLocaleString()} TASKY to unlock next tier!
        </p>
      </div>

      {/* Action Claim / Start Buttons */}
      <div className="mt-4">
        {activeSession ? (
          <button
            onClick={handleClaimClick}
            disabled={claiming || liveMined <= 0}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles size={18} className="animate-spin" />
            {claiming ? 'CLAIMING MINED VAULT...' : `CLAIM +${integerMined} TASKY NOW 💥`}
          </button>
        ) : (
          <button
            onClick={onStart}
            disabled={starting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(99,102,241,0.5)] active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Zap size={18} className="fill-white" />
            {starting ? 'ENGAGING CORE...' : 'START 8H MINING OVERDRIVE ⚡'}
          </button>
        )}
      </div>

      {/* Claim Celebration Modal */}
      <AnimatePresence>
        {showClaimModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#1f1548] to-[#0d0924] border-2 border-emerald-400 p-6 text-center shadow-[0_0_50px_rgba(16,185,129,0.6)]"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-3 animate-bounce">
                <Trophy size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1">
                VAULT HARVESTED! 💥
              </h2>
              <p className="text-xs text-emerald-300 font-bold mb-4">
                Tokens successfully deposited to your main balance
              </p>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 mb-5">
                <span className="text-4xl font-black text-white font-mono drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]">
                  +{claimedAmount.toLocaleString()}
                </span>
                <p className="text-xs font-bold text-indigo-200 mt-1 uppercase">TASKY CREDITED</p>
              </div>

              <button
                onClick={() => setShowClaimModal(false)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-black text-sm uppercase tracking-wider"
              >
                AWESOME! LETS GO 🚀
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

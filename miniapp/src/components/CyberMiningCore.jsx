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
  timeLeft,
  isConnected,
  onConnect,
}) {
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState(0);
  const animRef = useRef(null);
  const intRef = useRef(null);
  const decRef = useRef(null);
  const progressRef = useRef(null);
  const nextTargetRef = useRef(null);
  const claimBtnRef = useRef(null);

  useEffect(() => {
    if (!isConnected || !activeSession || activeSession.is_ready_to_claim) return;

    const rate = Number(activeSession.rate_used);
    const maxEarned = rate * 4;
    const start = new Date(activeSession.started_at).getTime();

    let animationFrameId;
    let lastUpdate = 0;

    const updateDisplay = (timestamp) => {
      // Throttle DOM updates slightly (every 50ms) to ensure perfect scrolling
      if (timestamp - lastUpdate > 50) {
        const now = Date.now();
        const elapsedHours = (now - start) / (1000 * 60 * 60);
        let currentEarned = rate * elapsedHours;
        if (currentEarned > maxEarned) currentEarned = maxEarned;

        if (intRef.current) {
          intRef.current.textContent = Math.floor(currentEarned).toLocaleString();
        }
        if (decRef.current) {
          decRef.current.textContent = (currentEarned % 1).toFixed(3).substring(1);
        }
        
        if (progressRef.current) {
          const pct = Math.min(100, Math.max(10, ((currentEarned % 2400) / 2400) * 100));
          progressRef.current.style.width = `${pct}%`;
        }
        
        if (nextTargetRef.current) {
          nextTargetRef.current.textContent = `${Math.floor(2400 - (currentEarned % 2400)).toLocaleString()} TASKY to unlock next tier!`;
        }
        
        lastUpdate = timestamp;
      }

      animationFrameId = requestAnimationFrame(updateDisplay);
    };

    animationFrameId = requestAnimationFrame(updateDisplay);

    return () => cancelAnimationFrame(animationFrameId);
  }, [activeSession, isConnected]);

  const handleClaimClick = async () => {
    // Determine claim amount directly from DOM if session was active, else from baseMined
    let finalAmount = Number(baseMined) || 0;
    if (isConnected && activeSession && intRef.current) {
        const textVal = intRef.current.textContent.replace(/,/g, '');
        finalAmount = Number(textVal) || finalAmount;
    }
    finalAmount = Math.floor(finalAmount);
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

  let displayAmount = Number(baseMined) || 0;
  if (isConnected && activeSession && !activeSession.is_ready_to_claim) {
      const rate = Number(activeSession.rate_used);
      const maxEarned = rate * 4;
      const elapsedHours = (Date.now() - new Date(activeSession.started_at).getTime()) / (1000 * 60 * 60);
      displayAmount = Math.min(rate * elapsedHours, maxEarned);
  } else if (!isConnected) {
      displayAmount = 0;
  }

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-[#181135] via-[#0e0a24] to-[#080516] border border-indigo-500/30 p-5  ">
      {/* Background glowing plasma orbs */}

      {/* Cybernetic Core Reactor Ring */}
      <div className="relative flex flex-col items-center justify-center my-2">
        <div
          className="relative w-48 h-48 flex items-center justify-center select-none"
        >
          {/* Outer Pulsing Neon Rings */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-indigo-400/40 " />
          <div className="absolute inset-2 rounded-full border border-cyan-400/30 " />

          {/* Inner Glowing Reactor Orb */}
          <div className="relative z-10 w-36 h-36 rounded-full bg-gradient-to-b from-[#2e1d68] to-[#120b2e] border-2 border-indigo-400/50 flex flex-col items-center justify-center ">
            <Cpu size={28} className="text-cyan-300 mb-1 " />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">
              {isConnected && activeSession ? 'OVERDRIVE ACTIVE' : 'REACTOR IDLE'}
            </span>
            <span className="text-xs font-black text-cyan-300 flex items-center gap-1 mt-0.5">
              <Zap size={12} className="fill-cyan-300" />
              +{(Number(speedPerHour) || 5.0).toFixed(1)}/hr
            </span>
          </div>
        </div>
      </div>

      {/* Live Odometer Ticker */}
      <div className="flex flex-col items-center text-center my-2">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">
          MINED REWARD ACCUMULATOR
        </p>
        <div className="flex items-baseline justify-center gap-1 my-1">
          <span ref={intRef} className="text-4xl font-black text-white font-mono tracking-tight drop-">
            {Math.floor(displayAmount).toLocaleString()}
          </span>
          <span ref={decRef} className="text-xl font-black text-cyan-300 font-mono">
            {(displayAmount % 1).toFixed(3).substring(1)}
          </span>
          <span className="text-xs font-black text-indigo-300 uppercase ml-1">TASKY</span>
        </div>
      </div>

      {/* Near-Miss Tier Framing Banner */}
      <div className="my-2 p-2.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/20 ">
        <div className="flex items-center justify-between text-xs font-black mb-1.5">
          <span className="flex items-center gap-1 text-amber-300">
            <Flame size={14} className="fill-amber-400 text-amber-400 " />
            Next: {nextTier.name}
          </span>
          <span className="text-cyan-300">{nextTier.boost} Mining Speed</span>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-2.5 bg-black/50 rounded-full overflow-hidden border border-white/10">
          <div
            ref={progressRef}
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-75"
            style={{ width: `${Math.min(100, Math.max(10, ((Number(baseMined) % 2400) / 2400) * 100))}%` }}
          />
        </div>
        <p ref={nextTargetRef} className="text-[10px] text-gray-400 font-bold mt-1 text-right">
          {Math.floor(2400 - (Number(baseMined) % 2400)).toLocaleString()} TASKY to unlock next tier!
        </p>
      </div>

      {/* Action Claim / Start Buttons */}
      <div className="mt-2">
        {!isConnected ? (
          <button
            onClick={onConnect}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-black text-sm uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2 border border-white/20"
          >
            CONNECT WALLET TO MINE
          </button>
        ) : activeSession ? (
          activeSession.is_ready_to_claim ? (
            <button
              onClick={handleClaimClick}
              disabled={claiming || Number(baseMined) <= 0}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-black text-sm uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-white/20"
            >
              <Sparkles size={18} />
              {claiming ? 'CLAIMING MINED VAULT...' : `CLAIM TASKY NOW 💥`}
            </button>
          ) : (
            <button
              disabled
              className="w-full py-4 rounded-2xl bg-indigo-900/40 text-indigo-200 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 border border-indigo-500/20"
            >
              MINING IN PROGRESS {timeLeft ? `• ${timeLeft}` : ''}
            </button>
          )
        ) : (
          <button
            onClick={onStart}
            disabled={starting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-black text-sm uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-white/20"
          >
            <Zap size={18} className="fill-white" />
            {starting ? 'ENGAGING CORE...' : 'START 4H MINING OVERDRIVE ⚡'}
          </button>
        )}
      </div>

      {/* Claim Celebration Modal */}
      <AnimatePresence>
        {showClaimModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80  p-4">
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#1f1548] to-[#0d0924] border-2 border-emerald-400 p-6 text-center "
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-3 ">
                <Trophy size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1">
                VAULT HARVESTED! 💥
              </h2>
              <p className="text-xs text-emerald-300 font-bold mb-4">
                Tokens successfully deposited to your main balance
              </p>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 mb-5">
                <span className="text-4xl font-black text-white font-mono drop-">
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

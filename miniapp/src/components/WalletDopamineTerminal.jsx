import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, DollarSign, Zap, Lock, Unlock, TrendingUp, Sparkles, ShieldCheck, Flame } from 'lucide-react';
import { showRewardedAd } from '../adUtils';
import triggerConfetti from '../confetti';

export default function WalletDopamineTerminal({
  user,
  balance = 0,
  swapRates = { ton: 0.0001, usdt: 0.00003 },
  onWatchAdSuccess,
  showToast
}) {
  const [taskyAmount, setTaskyAmount] = useState('10000');
  const [selectedCurrency, setSelectedCurrency] = useState('usdt');
  const [isAdWatching, setIsAdWatching] = useState(false);
  const [flashQuote, setFlashQuote] = useState(false);

  const numBalance = Number(balance) || 0;
  const usdtVal = (numBalance * 0.00003).toFixed(2);
  const unlockTarget = 1.00;
  const progressPercent = Math.min(100, (Number(usdtVal) / unlockTarget) * 100);

  // Quote calculation
  const calculatedOutput = selectedCurrency === 'usdt' 
    ? (Number(taskyAmount || 0) * 0.00003).toFixed(4)
    : (Number(taskyAmount || 0) * 0.0001).toFixed(4);

  // Live flashing quote effect
  useEffect(() => {
    const interval = setInterval(() => {
      setFlashQuote(true);
      setTimeout(() => setFlashQuote(false), 600);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickAdBoost = async () => {
    try {
      setIsAdWatching(true);
      const res = await showRewardedAd('main');
      if (res.success) {
        triggerConfetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
        if (showToast) showToast('⚡ Boost credited! +50 TASKY added to your balance', 'success');
        if (onWatchAdSuccess) onWatchAdSuccess();
      } else {
        if (showToast) showToast(res.error || 'Failed to complete booster ad', 'error');
      }
    } finally {
      setIsAdWatching(false);
    }
  };

  return (
    <div className="space-y-4 w-full transform-gpu will-change-transform">
      {/* 1. USDT Cashout Milestone Progress Bar */}
      <div className="rounded-3xl bg-gradient-to-r from-[#170e38] via-[#1b1544] to-[#0c0824] border border-indigo-500/30 p-5 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
              <DollarSign size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-wider">USDT Payout Milestone</p>
              <p className="text-[10px] text-emerald-300 font-bold">${usdtVal} / ${unlockTarget.toFixed(2)} Target</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <Unlock size={10} /> {progressPercent.toFixed(0)}% UNLOCKED
          </span>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="relative w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5 my-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
          />
        </div>

        <p className="text-[10px] text-gray-400 font-medium">
          🔥 Earn just <span className="text-white font-bold">${Math.max(0, unlockTarget - Number(usdtVal)).toFixed(2)} USDT</span> more to unlock instant non-custodial wallet cashout!
        </p>
      </div>

      {/* 2. Fast Ad-Boost Card */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-indigo-950/40 border border-amber-500/30 p-4 flex items-center justify-between shadow-[0_0_20px_rgba(245,158,11,0.15)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center animate-pulse">
            <Zap size={20} className="fill-amber-400 text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-black text-white uppercase tracking-wide flex items-center gap-1">
              Sponsored Fuel Booster
              <Sparkles size={12} className="text-amber-300" />
            </p>
            <p className="text-[10px] text-amber-200/80 font-bold">+50 TASKY + Boost Unlock Progress</p>
          </div>
        </div>

        <button
          onClick={handleQuickAdBoost}
          disabled={isAdWatching}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.5)] active:scale-95 transition-all disabled:opacity-50"
        >
          {isAdWatching ? 'LOADING...' : 'BOOST ⚡'}
        </button>
      </div>

      {/* 3. Live High-Voltage Swap Matrix */}
      <div className="rounded-3xl bg-[#120c29] border border-indigo-500/30 p-5 shadow-[0_0_30px_rgba(79,70,229,0.2)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-black text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
            <ArrowRightLeft size={14} className="text-cyan-400" />
            LIVE SWAP MATRIX
          </span>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border transition-all ${
            flashQuote ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400' : 'bg-white/5 text-gray-400 border-white/10'
          }`}>
            ● LIVE QUOTE
          </span>
        </div>

        {/* Currency Switcher */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setSelectedCurrency('usdt')}
            className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              selectedCurrency === 'usdt'
                ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-white/5 text-gray-400 border border-white/10'
            }`}
          >
            <DollarSign size={13} />
            USDT (TRC-20)
          </button>
          <button
            onClick={() => setSelectedCurrency('ton')}
            className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              selectedCurrency === 'ton'
                ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                : 'bg-white/5 text-gray-400 border border-white/10'
            }`}
          >
            <Sparkles size={13} />
            TON (The Open Network)
          </button>
        </div>

        {/* Swap Preview Box */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">You Swap</p>
            <p className="text-lg font-black text-white font-mono">{Number(taskyAmount || 0).toLocaleString()} TASKY</p>
          </div>
          <ArrowRightLeft size={18} className="text-indigo-400" />
          <div className="text-right">
            <p className="text-[10px] font-bold text-emerald-400 uppercase">You Receive</p>
            <p className="text-lg font-black text-emerald-300 font-mono">
              ≈ {calculatedOutput} {selectedCurrency.toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

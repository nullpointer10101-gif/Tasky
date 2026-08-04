import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp } from 'lucide-react';

export default function DopamineBalanceTicker({ balance = 0, speedPerHour = 5.0, usdtRate = 1000 }) {
  const baseBalance = Number(balance) || 0;
  const [liveFraction, setLiveFraction] = useState(0);

  useEffect(() => {
    // Speed per millisecond
    const ratePerMs = (Number(speedPerHour) || 5.0) / (3600 * 1000);
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setLiveFraction(elapsed * ratePerMs);
    }, 60);

    return () => clearInterval(interval);
  }, [baseBalance, speedPerHour]);

  const currentTotal = baseBalance + liveFraction;
  const integerPart = Math.floor(currentTotal).toLocaleString();
  const decimalPart = (currentTotal % 1).toFixed(3).substring(1); // e.g. ".482"
  const usdtValue = (currentTotal / (Number(usdtRate) || 1000)).toFixed(2);

  return (
    <div className="relative z-10 flex flex-col items-center text-center">
      {/* Live Mining Active Pill */}
      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full mb-3 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1">
          <Zap size={11} className="fill-emerald-400 text-emerald-400" />
          Live Mining: +{(Number(speedPerHour) || 5.0).toFixed(1)}/hr
        </span>
      </div>

      <p className="text-[11px] font-black text-white/70 uppercase tracking-[0.2em] mb-1">
        LIVE PORTFOLIO BALANCE
      </p>

      {/* Main Ticking Number */}
      <div className="flex items-baseline justify-center gap-1 mb-2">
        <span className="text-5xl font-black text-white tracking-tighter drop-shadow-md">
          {integerPart}
        </span>
        <span className="text-2xl font-black text-indigo-200/90 font-mono tracking-normal">
          {decimalPart}
        </span>
      </div>

      {/* USD Value Estimate */}
      <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-inner">
        <span className="text-sm font-bold text-white/90">≈ ${usdtValue}</span>
        <span className="text-xs font-black text-indigo-200">USDT</span>
        <span className="text-[10px] text-emerald-300 font-bold flex items-center">
          <TrendingUp size={10} className="mr-0.5" /> +{(Number(speedPerHour) / (usdtRate || 1000)).toFixed(4)}$/h
        </span>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, Sparkles } from 'lucide-react';

export default function DopamineBalanceTicker({ balance = 0, speedPerHour = 5.0, usdtRate = 1000 }) {
  const baseBalance = Number(balance) || 0;
  const [displayValue, setDisplayValue] = useState({ integer: '0', decimal: '.000', raw: 0 });
  const animFrameRef = useRef(null);

  useEffect(() => {
    const ratePerMs = (Number(speedPerHour) || 5.0) / (3600 * 1000);
    const startTime = performance.now();

    const updateTicker = (now) => {
      const elapsed = now - startTime;
      const current = baseBalance + elapsed * ratePerMs;
      const intVal = Math.floor(current).toLocaleString();
      const decVal = (current % 1).toFixed(3).substring(1);
      
      setDisplayValue({
        integer: intVal,
        decimal: decVal,
        raw: current
      });

      animFrameRef.current = requestAnimationFrame(updateTicker);
    };

    animFrameRef.current = requestAnimationFrame(updateTicker);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [baseBalance, speedPerHour]);

  const usdtValue = (displayValue.raw / (Number(usdtRate) || 1000)).toFixed(2);

  return (
    <div className="relative z-10 flex flex-col items-center text-center transform-gpu will-change-transform">
      {/* Live Mining Active Pill */}
      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full mb-3 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1">
          <Zap size={11} className="fill-emerald-400 text-emerald-400" />
          Live Mining: +{(Number(speedPerHour) || 5.0).toFixed(1)}/hr
        </span>
      </div>

      <p className="text-[11px] font-black text-white/70 uppercase tracking-[0.2em] mb-1 flex items-center gap-1">
        <Sparkles size={11} className="text-amber-300 animate-pulse" />
        LIVE PORTFOLIO BALANCE
      </p>

      {/* Main Ticking Number */}
      <div className="flex items-baseline justify-center gap-1 mb-2">
        <span className="text-5xl font-black text-white tracking-tighter drop-shadow-md font-mono">
          {displayValue.integer}
        </span>
        <span className="text-2xl font-black text-indigo-200/90 font-mono tracking-normal">
          {displayValue.decimal}
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

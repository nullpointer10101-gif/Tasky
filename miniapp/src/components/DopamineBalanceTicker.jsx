import React from 'react';
import { Sparkles, ArrowRightLeft } from 'lucide-react';

export default function DopamineBalanceTicker({ balance = 0, gramBalance = 0, speedPerHour = 5.0, usdtRate = 20000 }) {
  const baseBalance = Number(balance) || 0;
  // USDT balance is calculated based on current swap rate
  const usdtValue = (baseBalance / (Number(usdtRate) || 20000)).toFixed(2);
  
  // Format GRAM balance nicely
  const formattedGram = Number(gramBalance || 0).toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 4 
  });

  return (
    <div className="relative z-10 flex flex-col items-center w-full">
      {/* Title */}
      <p className="text-[11px] font-black text-white/70 uppercase tracking-[0.2em] mb-4 flex items-center gap-1.5">
        <Sparkles size={11} className="text-amber-300 animate-pulse" />
        LIVE PORTFOLIO BALANCE
      </p>

      {/* Grid containing USDT and GRAM balances side-by-side */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {/* USDT Balance Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-center justify-center text-center shadow-inner hover:scale-[1.02] transition-transform duration-200">
          <div className="w-10 h-10 rounded-full bg-[#26A17B]/20 border border-[#26A17B]/30 flex items-center justify-center mb-2.5">
            {/* Tether (USDT) Official Shape Logo */}
            <svg viewBox="0 0 128 128" className="w-6 h-6 shrink-0">
              <circle cx="64" cy="64" r="64" fill="#26A17B" />
              <path fill="#FFF" d="M83.2 38.4H44.8v6.4h16v25.6c-9.6 1.6-16 4.8-16 8 0 3.2 6.4 6.4 16 8v16h6.4V86.4c9.6-1.6 16-4.8 16-8 0-3.2-6.4-6.4-16-8V44.8h16v-6.4zm-19.2 41.6c-8 0-12.8-1.6-12.8-3.2s4.8-3.2 12.8-3.2 12.8 1.6 12.8 3.2-4.8 3.2-12.8 3.2z" />
            </svg>
          </div>
          <span className="text-[10px] font-black text-white/60 uppercase tracking-wider mb-1">USDT Balance</span>
          <span className="text-lg font-mono font-black text-white tracking-tight">${usdtValue}</span>
        </div>

        {/* GRAM Balance Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-center justify-center text-center shadow-inner hover:scale-[1.02] transition-transform duration-200">
          <div className="w-10 h-10 rounded-full bg-[#0088CC]/20 border border-[#0088CC]/30 flex items-center justify-center mb-2.5">
            {/* TON / GRAM Diamond Logo */}
            <svg viewBox="0 0 128 128" className="w-6 h-6 shrink-0">
              <circle cx="64" cy="64" r="64" fill="#0088CC" />
              <path fill="#FFF" d="M64 20L28 60l36 48 36-48L64 20zM38 58l26-29 26 29H38zm26 38L42 62h44L64 96z" />
            </svg>
          </div>
          <span className="text-[10px] font-black text-white/60 uppercase tracking-wider mb-1">GRAM Balance</span>
          <span className="text-lg font-mono font-black text-white tracking-tight">{formattedGram}</span>
        </div>
      </div>
    </div>
  );
}

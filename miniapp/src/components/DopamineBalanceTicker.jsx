import React from 'react';
import { Sparkles } from 'lucide-react';

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
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2.5 p-1">
            {/* Tether (USDT) Official Logo Image */}
            <img 
              src="https://cryptologos.cc/logos/tether-usdt-logo.png" 
              alt="USDT" 
              className="w-10 h-10 object-contain"
              onError={(e) => {
                // Fallback to CoinGecko URL in case cryptologos is slow/blocked
                e.target.src = "https://assets.coingecko.com/coins/images/325/large/Tether.png";
              }}
            />
          </div>
          <span className="text-[10px] font-black text-white/60 uppercase tracking-wider mb-1">USDT Balance</span>
          <span className="text-lg font-mono font-black text-white tracking-tight">${usdtValue}</span>
        </div>

        {/* GRAM Balance Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-center justify-center text-center shadow-inner hover:scale-[1.02] transition-transform duration-200">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2.5 p-1">
            {/* TON / GRAM Official Logo Image */}
            <img 
              src="https://cryptologos.cc/logos/toncoin-ton-logo.png" 
              alt="GRAM" 
              className="w-10 h-10 object-contain"
              onError={(e) => {
                // Fallback to CoinGecko URL in case cryptologos is slow/blocked
                e.target.src = "https://assets.coingecko.com/coins/images/17980/large/ton_token.png";
              }}
            />
          </div>
          <span className="text-[10px] font-black text-white/60 uppercase tracking-wider mb-1">GRAM Balance</span>
          <span className="text-lg font-mono font-black text-white tracking-tight">{formattedGram}</span>
        </div>
      </div>
    </div>
  );
}

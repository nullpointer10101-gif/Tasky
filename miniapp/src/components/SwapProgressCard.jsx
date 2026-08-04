import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, TrendingUp, Sparkles, ChevronRight, Coins } from 'lucide-react';

export default function SwapProgressCard({ balance = 0, taskyPerUsdt = 20000, targetUsd = 1.00, onNavigate }) {
  const currentBalance = Number(balance) || 0;
  const currentUsd = currentBalance / (Number(taskyPerUsdt) || 20000);
  const targetTasky = targetUsd * (Number(taskyPerUsdt) || 20000);
  const progressPercent = Math.min(100, Math.max(5, (currentUsd / targetUsd) * 100));

  const isEligible = currentUsd >= targetUsd;

  return (
    <div className="bg-surface rounded-[2rem] p-5 border-b-[4px] border-x border-t border-border shadow-sm relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute -right-8 -top-8 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl transform-gpu pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-500">
            <ArrowRightLeft size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-ink leading-tight">USDT Swap Goal</h3>
            <p className="text-[11px] font-bold text-ink-soft">Real-time withdrawal target</p>
          </div>
        </div>

        <span className="text-xs font-black text-emerald-500 px-2.5 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
          ${currentUsd.toFixed(2)} / ${targetUsd.toFixed(2)}
        </span>
      </div>

      {/* Dynamic Progress Bar */}
      <div className="space-y-1.5 mb-4">
        <div className="w-full h-3.5 bg-surface-soft rounded-full overflow-hidden p-0.5 border border-border">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
          />
        </div>
        <div className="flex justify-between text-[10px] font-bold text-ink-soft">
          <span>0 USDT</span>
          <span className="text-emerald-500 font-black">
            {progressPercent >= 100 ? "🎉 Target Reached!" : `${Math.floor(progressPercent)}% completed`}
          </span>
          <span>{targetUsd.toFixed(2)} USDT</span>
        </div>
      </div>

      {/* Dopamine Decision Framing */}
      <div className="bg-surface-soft/80 border border-border rounded-2xl p-3.5 flex items-center justify-between gap-3">
        <div className="flex-1">
          <p className="text-[12px] font-bold text-ink leading-snug">
            {isEligible ? (
              <span>You have <strong className="text-emerald-500">${currentUsd.toFixed(2)} USDT</strong> ready. Swap now or compound faster in Rig?</span>
            ) : (
              <span>Sitting on <strong className="text-emerald-500">${currentUsd.toFixed(2)}</strong>. Only ${(targetUsd - currentUsd).toFixed(2)} more to cash out!</span>
            )}
          </p>
        </div>
        <button
          onClick={() => onNavigate && onNavigate('wallet')}
          className="shrink-0 px-3.5 py-2 rounded-xl bg-emerald-500 text-white font-black text-xs shadow-md border-b-2 border-emerald-700 active:border-b-0 active:translate-y-0.5 transition-all flex items-center gap-1"
        >
          <span>{isEligible ? "Swap Now" : "View"}</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

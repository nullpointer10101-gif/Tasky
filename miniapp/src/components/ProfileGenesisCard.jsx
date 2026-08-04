import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Sparkles, Shield, Trophy, Flame, Coins, Zap, Star } from 'lucide-react';

const ACHIEVEMENTS = [
  { id: 'genesis', title: 'Genesis Pioneer', desc: 'Early Tasky Adopter', icon: Crown, unlocked: true, color: 'text-amber-400' },
  { id: 'streak', title: 'Streak Titan', desc: 'Active 7-day streak', icon: Flame, unlocked: true, color: 'text-orange-400' },
  { id: 'mining', title: 'Rig Overlord', desc: 'Mined 10,000+ TASKY', icon: Zap, unlocked: true, color: 'text-cyan-400' },
  { id: 'squad', title: 'Squad Captain', desc: 'Invited 5+ Frens', icon: Shield, unlocked: false, color: 'text-purple-400' },
];

export default function ProfileGenesisCard({ user, totalEarned = 0, balance = 0 }) {
  const telegramId = user?.telegram_id || user?.id || '8823265955';
  const name = user?.first_name || user?.username || 'Tasky Commander';
  const numBalance = Number(balance) || 0;
  const netWorthUsdt = (numBalance * 0.00003).toFixed(2);

  return (
    <div className="space-y-4 w-full ">
      {/* 1. Holographic Genesis / VIP Member Pass */}
      <div className="relative overflow-hidden rounded-3xl p-6 hologram-card shadow-[0_0_35px_rgba(99,102,241,0.3)] shimmer-effect">
        <div className="flex items-start justify-between relative z-10">
          <div>
            <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-400/20 text-amber-300 border border-amber-400/40 inline-flex items-center gap-1">
              <Sparkles size={11} /> VIP GENESIS PASS
            </span>
            <h3 className="text-xl font-black text-white mt-2 tracking-tight">{name}</h3>
            <p className="text-xs font-mono font-bold text-indigo-200/80">TG-ID: #{telegramId}</p>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 p-0.5 shadow-xl">
            <div className="w-full h-full rounded-2xl bg-[#130b2c] flex items-center justify-center">
              <Crown size={28} className="text-amber-300 " />
            </div>
          </div>
        </div>

        {/* Card Net Worth Details */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 relative z-10">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estimated Net Worth</p>
            <p className="text-xl font-black text-white font-mono">≈ ${netWorthUsdt} <span className="text-xs text-emerald-300 font-bold">USDT</span></p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Prestige Tier</p>
            <p className="text-sm font-black text-amber-300 uppercase flex items-center gap-1 mt-1">
              <Star size={14} className="fill-amber-300 text-amber-300" />
              Diamond Member
            </p>
          </div>
        </div>
      </div>

      {/* 2. Achievement Trophy Showcase */}
      <div className="rounded-3xl bg-[#130b2c] border border-indigo-500/30 p-5 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-black text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
            <Trophy size={14} className="text-amber-400" />
            PRESTIGE TROPHY SHOWCASE
          </span>
          <span className="text-[10px] text-gray-400 font-bold">3/4 UNLOCKED</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {ACHIEVEMENTS.map((ach) => {
            const Icon = ach.icon;
            return (
              <div
                key={ach.id}
                className={`p-3 rounded-2xl border flex items-start gap-2.5 transition-all ${
                  ach.unlocked
                    ? 'bg-white/5 border-white/20 shadow-sm'
                    : 'bg-black/40 border-white/5 opacity-50'
                }`}
              >
                <div className={`p-2 rounded-xl bg-white/10 ${ach.unlocked ? ach.color : 'text-gray-500'}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-xs font-black text-white leading-tight">{ach.title}</p>
                  <p className="text-[9px] text-gray-400 font-medium mt-0.5">{ach.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

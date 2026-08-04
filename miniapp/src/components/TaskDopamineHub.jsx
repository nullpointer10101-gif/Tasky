import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Sparkles, CheckCircle2, Zap, Trophy, Star } from 'lucide-react';
import triggerConfetti from '../confetti';

export default function TaskDopamineHub({
  completedCount = 0,
  targetCount = 5,
  multiplierBonus = '2.0x Boost',
  activeCategory = 'all',
  onSelectCategory,
  categories = [
    { id: 'all', label: '🔥 All Quests', count: 18 },
    { id: 'promoted', label: '⭐ Sponsored', count: 4 },
    { id: 'telegram', label: '✈️ Telegram', count: 8 },
    { id: 'daily', label: '⚡ Daily Blitz', count: 6 },
  ]
}) {
  const progressPercent = Math.min(100, (completedCount / targetCount) * 100);
  const tasksRemaining = Math.max(0, targetCount - completedCount);

  return (
    <div className="space-y-3 w-full transform-gpu will-change-transform">
      {/* 1. Quest Multiplier Streak Progress */}
      <div className="rounded-3xl bg-gradient-to-r from-[#1b113d] via-[#21164c] to-[#0f0928] border border-purple-500/30 p-4 shadow-[0_0_25px_rgba(168,85,247,0.2)]">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-400/40 flex items-center justify-center animate-pulse">
              <Star size={16} className="text-amber-300 fill-amber-300" />
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-wider">Quest Mastery Streak</p>
              <p className="text-[10px] text-purple-300 font-bold">{completedCount}/{targetCount} Tasks Finished</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
            <Zap size={10} className="fill-purple-300" /> {multiplierBonus}
          </span>
        </div>

        {/* Dynamic Multiplier Bar */}
        <div className="relative w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5 my-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 shadow-[0_0_10px_rgba(236,72,153,0.8)]"
          />
        </div>

        <p className="text-[10px] text-gray-300 font-medium">
          {tasksRemaining > 0 ? (
            <span>⚡ Complete <strong className="text-amber-300">{tasksRemaining} more</strong> tasks to activate double-speed reward multiplier!</span>
          ) : (
            <span className="text-emerald-300 font-bold">🎉 Mastery Unlocked! 2.0x Multiplier active on all rewards today!</span>
          )}
        </p>
      </div>

      {/* 2. Hot Glowing Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-1">
        {categories.map((cat) => {
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory && onSelectCategory(cat.id)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-indigo-300/40 scale-105'
                  : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              {cat.label}
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isSelected ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-400'
              }`}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

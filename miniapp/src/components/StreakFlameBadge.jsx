import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Clock, Sparkles, AlertTriangle } from 'lucide-react';

export default function StreakFlameBadge({ streakDays = 0, lastCheckin }) {
  const streak = Number(streakDays) || 0;
  
  // Calculate remaining hours in streak window (24h to 48h from last_checkin)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
  
  let hoursUntilReset = 24;
  let isUnderRisk = false;
  let checkedInToday = false;

  if (lastCheckin) {
    const lastDate = new Date(lastCheckin);
    const now = new Date();
    const elapsed = now.getTime() - lastDate.getTime();
    
    if (elapsed < TWENTY_FOUR_HOURS) {
      checkedInToday = true;
    } else if (elapsed < FORTY_EIGHT_HOURS) {
      // User hasn't checked in today and has limited hours left before streak is lost
      const msLeft = FORTY_EIGHT_HOURS - elapsed;
      hoursUntilReset = Math.max(1, Math.floor(msLeft / (1000 * 60 * 60)));
      isUnderRisk = true;
    }
  }

  // Flame tier configuration
  let flameConfig = {
    tier: 'ember',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10 border-orange-500/30',
    glow: '',
    scale: 1,
    title: 'Ember Streak'
  };

  if (streak >= 8) {
    flameConfig = {
      tier: 'plasma',
      color: 'text-fuchsia-400',
      bg: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-pink-500/40',
      glow: '',
      scale: 1.25,
      title: 'Plasma God Streak'
    };
  } else if (streak >= 4) {
    flameConfig = {
      tier: 'blaze',
      color: 'text-amber-400',
      bg: 'bg-amber-500/20 border-amber-500/40',
      glow: '',
      scale: 1.1,
      title: 'Blazing Streak'
    };
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        {/* Flame Badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border ${flameConfig.bg} ${flameConfig.glow} transition-all`}>
          <motion.div
            animate={{
              scale: [1, flameConfig.scale, 1],
              rotate: [-2, 2, -2]
            }}
            transition={{
              duration: streak >= 8 ? 0.8 : 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative"
          >
            <Flame className={`w-5 h-5 ${flameConfig.color} fill-current`} />
            {streak >= 4 && (
              <Sparkles className="w-3 h-3 text-white absolute -top-1 -right-1 " />
            )}
          </motion.div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-ink leading-tight flex items-center gap-1">
              {streak} Days 🔥
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">
              {flameConfig.title}
            </span>
          </div>
        </div>

        {/* Status / Urgency Pill */}
        {isUnderRisk ? (
          <motion.div 
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-500 text-[11px] font-black shadow-sm"
          >
            <Clock size={12} className=" text-rose-500" />
            <span>⏰ {hoursUntilReset}h left to save streak!</span>
          </motion.div>
        ) : checkedInToday ? (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-[11px] font-bold">
            <span>✨ Streak Saved Today</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-500 text-[11px] font-bold">
            <span>🎁 Claim Day {streak + 1} Bonus</span>
          </div>
        )}
      </div>
    </div>
  );
}

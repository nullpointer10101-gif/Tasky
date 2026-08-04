import React from 'react';
import { motion } from 'framer-motion';
import { Users, Trophy, ChevronRight, Gift, Sparkles } from 'lucide-react';

export default function ReferralDopamineCard({ referralData, onNavigate }) {
  const totalRefs = Number(referralData?.total_referrals || 0);
  const targetRefs = 10;
  const remainingRefs = Math.max(0, targetRefs - totalRefs);
  const rewardPerRef = referralData?.reward_per_referral || 200;
  const spinsPerRef = referralData?.spin_reward_per_referral || 2;

  return (
    <div className="bg-surface rounded-[2rem] p-5 border-b-[4px] border-x border-t border-border shadow-sm relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute -left-8 -top-8 w-28 h-28 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 text-orange-500">
            <Users size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-ink leading-tight">Referral Squad</h3>
            <p className="text-[11px] font-bold text-ink-soft">Unlock instant swap permissions</p>
          </div>
        </div>

        <span className="text-xs font-black text-orange-500 px-2.5 py-1 bg-orange-500/10 rounded-full border border-orange-500/20">
          {totalRefs} / {targetRefs} Invited
        </span>
      </div>

      {/* Unlock Progress Banner */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 border border-orange-500/20 rounded-2xl p-3.5 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-black text-xs shadow-sm">
            👥
          </div>
          <div>
            {remainingRefs > 0 ? (
              <p className="text-xs font-black text-ink leading-snug">
                <strong className="text-orange-500">{remainingRefs} more referral{remainingRefs > 1 ? 's' : ''}</strong> unlocks instant swap access!
              </p>
            ) : (
              <p className="text-xs font-black text-emerald-500 leading-snug">
                ✨ Swap access fully unlocked by your referrals!
              </p>
            )}
            <p className="text-[10px] font-bold text-ink-soft mt-0.5">
              +{rewardPerRef} TASKY & +{spinsPerRef} Spins for each friend
            </p>
          </div>
        </div>
      </div>

      {/* Leaderboard Glimpse Hook */}
      <div className="bg-surface-soft/80 border border-border rounded-2xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          <span className="text-[11px] font-bold text-ink-soft">
            Top 10 referrers this week win <strong className="text-ink">10 Bonus Spins</strong>
          </span>
        </div>
        <button
          onClick={() => onNavigate && onNavigate('referral')}
          className="shrink-0 text-xs font-black text-orange-500 hover:text-orange-600 flex items-center gap-0.5"
        >
          <span>Invite</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

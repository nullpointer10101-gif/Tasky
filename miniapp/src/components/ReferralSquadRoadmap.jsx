import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Crown, Gift, Sparkles, Copy, Share2, CheckCircle2, ChevronRight, Shield, Zap } from 'lucide-react';
import triggerConfetti from '../confetti';

const SQUAD_TIERS = [
  { level: 1, name: 'Novice', frensNeeded: 0, commission: '5%', icon: Users, color: 'text-gray-400' },
  { level: 2, name: 'Squad Captain', frensNeeded: 5, commission: '10%', icon: Shield, color: 'text-blue-400' },
  { level: 3, name: 'Crypto Whale', frensNeeded: 20, commission: '20%', icon: Zap, color: 'text-purple-400' },
  { level: 4, name: 'Diamond Guild', frensNeeded: 50, commission: '35%', icon: Crown, color: 'text-amber-400' },
];

export default function ReferralSquadRoadmap({
  referralCount = 0,
  unclaimedBounty = 450,
  referralLink = '',
  onClaimBounty,
  showToast,
}) {
  const [copied, setCopied] = useState(false);
  const [bountyClaiming, setBountyClaiming] = useState(false);

  // Find current tier
  const currentTierIndex = SQUAD_TIERS.reduce((acc, tier, idx) => {
    return referralCount >= tier.frensNeeded ? idx : acc;
  }, 0);
  const currentTier = SQUAD_TIERS[currentTierIndex];
  const nextTier = SQUAD_TIERS[currentTierIndex + 1] || null;

  const handleCopyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    triggerConfetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    if (showToast) showToast('🔥 Referral link copied! Share with your squad', 'success');
    
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (_) {}

    setTimeout(() => setCopied(false), 2500);
  };

  const handleClaim = async () => {
    if (unclaimedBounty <= 0) return;
    setBountyClaiming(true);
    triggerConfetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    
    if (onClaimBounty) {
      await onClaimBounty();
    }
    if (showToast) showToast(`💥 Claimed +${unclaimedBounty} TASKY from Squad commissions!`, 'success');
    setBountyClaiming(false);
  };

  return (
    <div className="space-y-4 w-full ">
      {/* 1. Uncollected Fren Bounty Vault Chest */}
      {unclaimedBounty > 0 && (
        <div className="rounded-3xl bg-gradient-to-r from-[#2a134a] via-[#1f0e38] to-[#120724] border-2 border-amber-400/50 p-5  relative overflow-hidden">
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center ">
                <Gift size={24} className="text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1">
                  Squad Bounty Vault
                  <Sparkles size={14} className="text-amber-300" />
                </p>
                <p className="text-lg font-black text-amber-300 font-mono">+{unclaimedBounty} TASKY</p>
              </div>
            </div>

            <button
              onClick={handleClaim}
              disabled={bountyClaiming}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs uppercase tracking-wider  active:scale-95 transition-all"
            >
              {bountyClaiming ? 'HARVESTING...' : 'CLAIM BOUNTY 💥'}
            </button>
          </div>
          <p className="text-[10px] text-amber-200/70 font-medium">
            Passive commission generated automatically by your invited team members.
          </p>
        </div>
      )}

      {/* 2. Squad Tier Roadmap */}
      <div className="rounded-3xl bg-[#130b2c] border border-indigo-500/30 p-5 ">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-black text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
            <Crown size={14} className="text-amber-400" />
            SQUAD PRESTIGE ROADMAP
          </span>
          <span className="text-[10px] font-black uppercase text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-400/30">
            {currentTier.name} ({currentTier.commission})
          </span>
        </div>

        {/* Tiers Grid */}
        <div className="grid grid-cols-4 gap-2 relative mb-4">
          {SQUAD_TIERS.map((tier, idx) => {
            const isUnlocked = referralCount >= tier.frensNeeded;
            const isCurrent = idx === currentTierIndex;
            const Icon = tier.icon;
            return (
              <div
                key={tier.level}
                className={`rounded-2xl p-2.5 text-center flex flex-col items-center justify-between border transition-all ${
                  isCurrent
                    ? 'bg-indigo-600/30 border-indigo-400 '
                    : isUnlocked
                    ? 'bg-white/5 border-white/20'
                    : 'bg-black/40 border-white/5 opacity-50'
                }`}
              >
                <Icon size={18} className={tier.color} />
                <span className="text-[10px] font-black text-white mt-1 leading-tight">{tier.name}</span>
                <span className="text-[9px] font-mono font-bold text-amber-300 mt-0.5">{tier.commission}</span>
                <span className="text-[8px] text-gray-400 mt-0.5">{tier.frensNeeded}+ Frens</span>
              </div>
            );
          })}
        </div>

        {nextTier && (
          <p className="text-[10px] text-gray-300 font-medium text-center">
            🔥 Invite <strong className="text-cyan-300">{nextTier.frensNeeded - referralCount} more frens</strong> to reach <strong className="text-amber-300">{nextTier.name}</strong> & unlock <strong className="text-emerald-300">{nextTier.commission} lifetime commission</strong>!
          </p>
        )}

        {/* 1-Tap Viral Invite Button */}
        <div className="mt-4 pt-3 border-t border-white/10 flex gap-2">
          <button
            onClick={handleCopyLink}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-black text-xs uppercase tracking-wider  flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            {copied ? <CheckCircle2 size={16} className="text-emerald-300" /> : <Copy size={16} />}
            {copied ? 'LINK COPIED! 🚀' : 'COPY SQUAD INVITE LINK'}
          </button>
        </div>
      </div>
    </div>
  );
}

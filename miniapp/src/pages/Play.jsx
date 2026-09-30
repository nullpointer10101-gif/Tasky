import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Coins, Sparkles, Calendar } from 'lucide-react';
import DailyCheckin from '../components/DailyCheckin';
import SpinWheel from '../components/SpinWheel';
import CyberFlip from '../components/CyberFlip';

const TABS = [
  { id: 'flip', label: 'Cyber Flip', badge: '1.90X', icon: Coins },
  { id: 'wheel', label: 'Daily Spin', icon: Sparkles },
  { id: 'checkin', label: 'Check-In', icon: Calendar }
];

export default function Play({ user, refreshUser }) {
  const [activeTab, setActiveTab] = useState('flip');

  if (!user) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 space-y-4 pb-24 max-w-md mx-auto min-h-full relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Gamepad2 className="text-cyan-400" size={26} /> 
            Play & Multiply
          </h1>
          <p className="text-xs text-white/50 mt-0.5">Flip coins, spin the wheel, & earn daily crypto!</p>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/10">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                try { window.Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (_) {}
                setActiveTab(tab.id);
              }}
              className={`relative py-2.5 px-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                isActive 
                  ? 'bg-gradient-to-r from-cyan-500/25 to-blue-600/30 text-white border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]' 
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-cyan-400' : ''} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="hidden sm:inline-block px-1 py-0.2 rounded bg-cyan-400/20 text-cyan-300 text-[8px] font-black">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      {activeTab === 'flip' && (
        <motion.div
          key="flip"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <CyberFlip user={user} refreshUser={refreshUser} />
        </motion.div>
      )}

      {activeTab === 'wheel' && (
        <motion.div
          key="wheel"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <SpinWheel user={user} refreshUser={refreshUser} />
        </motion.div>
      )}

      {activeTab === 'checkin' && (
        <motion.div
          key="checkin"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <DailyCheckin user={user} refreshUser={refreshUser} />
        </motion.div>
      )}
    </motion.div>
  );
}

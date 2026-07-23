import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, Zap, Coins } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { playSpin } from '../api';
import { useToast } from '../App';

// Premium casino-like color palette
const PRIZES = [
  { val: 50, label: '50', color: '#1e1b4b', text: '#a5b4fc', icon: Coins }, 
  { val: 100, label: '100', color: '#312e81', text: '#e0e7ff', icon: Coins }, 
  { val: 25, label: '25', color: '#4338ca', text: '#e0e7ff', icon: Zap },
  { val: 1000, label: '1000', color: '#eab308', text: '#ffffff', icon: Star },
  { val: 150, label: '150', color: '#312e81', text: '#e0e7ff', icon: Coins },
  { val: 2000, label: '2000', color: '#ef4444', text: '#ffffff', icon: Zap },
  { val: 500, label: '500', color: '#f59e0b', text: '#ffffff', icon: Star },
  { val: 75, label: '75', color: '#1e1b4b', text: '#a5b4fc', icon: Coins },
];

export default function SpinWheel({ user, refreshUser }) {
  const [spinning, setSpinning] = useState(false);
  const [reward, setReward] = useState(null);
  const [rotation, setRotation] = useState(-22.5); // Offset so center of slice 0 is top
  const { showToast } = useToast();

  if (!user) return null;

  const spinsAvailable = user.spins_available || 0;
  
  let spinsUsedToday = user.spins_used_today || 0;
  const todayStr = new Date().toDateString();
  const lastSpinStr = user.last_spin_date ? new Date(user.last_spin_date).toDateString() : null;
  
  if (lastSpinStr !== todayStr) {
    spinsUsedToday = 0;
  }

  const handleSpin = async () => {
    if (spinsAvailable <= 0 || spinsUsedToday >= 5 || spinning) return;

    setSpinning(true);
    setReward(null);

    const res = await playSpin(user.telegram_id);
    
    if (res.data) {
      const earned = res.data.reward_earned;
      const matchingIndices = PRIZES.map((p, i) => p.val === earned ? i : -1).filter(i => i !== -1);
      const targetIndex = matchingIndices[Math.floor(Math.random() * matchingIndices.length)] || 0;
      
      const sliceCenter = targetIndex * 45 + 22.5;
      const targetDegree = 360 - sliceCenter;
      
      const extraSpins = 360 * 6; // 6 extremely fast full rotations
      let normalizedRot = rotation % 360;
      if (normalizedRot < 0) normalizedRot += 360;
      
      const newRotation = rotation + extraSpins + targetDegree - normalizedRot;
      
      setRotation(newRotation);

      // Exaggerated spin duration for dopamine (5 seconds)
      setTimeout(() => {
        setSpinning(false);
        setReward(res.data);
        if (res.data.tier === 'high') {
           showToast(`🎰 JACKPOT! You won ${res.data.reward_earned} TASKY!`);
        } else {
           showToast(`+${res.data.reward_earned} TASKY won!`);
        }
        refreshUser();
      }, 5000);
    } else {
      setSpinning(false);
      showToast(res.error || 'Spin failed', 'error');
    }
  };

  const conicGradient = `conic-gradient(${PRIZES.map((p, i) => `${p.color} ${i * 45}deg ${(i + 1) * 45}deg`).join(', ')})`;

  return (
    <Card className="mb-4 bg-surface relative overflow-hidden border-border p-0 rounded-3xl">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1c] to-surface opacity-90 z-0"></div>
      
      

      <div className="relative z-10 p-5">
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 uppercase tracking-wide flex items-center gap-2">
              <Sparkles size={18} className="text-yellow-400" />
              Spin & Win
            </h2>
            <p className="text-xs text-amber-400 font-bold mt-1">Get 1 free spin by inviting a friend!</p>
          </div>
          <div className="text-right bg-black/40 px-3 py-1 rounded-full border border-white/5">
            <p className="text-sm font-black text-white">{spinsAvailable} <span className="text-ink-soft font-medium">Spins</span></p>
            <p className="text-[10px] text-ink-faint">{spinsUsedToday}/5 Today</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center relative min-h-[320px]">
          <AnimatePresence mode="wait">
            {!reward ? (
              <motion.div 
                key="wheel-container"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                className="relative w-72 h-72 mb-6"
              >
                {/* Glowing Aura Behind Wheel */}
                
                

                {/* The Pointer */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 drop-">
                  <svg width="32" height="42" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 40L0 0H32L16 40Z" fill="url(#gold-grad)" stroke="#FEF08A" strokeWidth="2" strokeLinejoin="round" />
                    <defs>
                      <linearGradient id="gold-grad" x1="16" y1="0" x2="16" y2="40" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FDE047" />
                        <stop offset="1" stopColor="#A16207" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                
                {/* Wheel Body */}
                <motion.div
                  className="w-full h-full rounded-full relative overflow-hidden"
                  style={{ 
                    background: conicGradient, 
                    boxShadow: 'inset 0 0 30px rgba(0,0,0,0.9), 0 0 0 4px #0f172a, 0 0 0 8px #eab308' 
                  }}
                  initial={{ rotate: rotation }}
                  animate={{ rotate: rotation }}
                  transition={{ duration: 5, ease: [0.1, 0.9, 0.2, 1] }} // Exaggerated dopamine ease
                >
                  {/* Wheel Slice Separator Lines */}
                  {PRIZES.map((_, i) => (
                    <div 
                      key={`line-${i}`}
                      className="absolute inset-0 origin-center pointer-events-none"
                      style={{ transform: `rotate(${i * 45}deg)` }}
                    >
                      <div className="w-[2px] h-1/2 bg-gradient-to-b from-white/30 to-transparent mx-auto" />
                    </div>
                  ))}

                  {/* Wheel Labels */}
                  {PRIZES.map((prize, i) => {
                    const Icon = prize.icon;
                    return (
                      <div 
                        key={i}
                        className="absolute inset-0 flex flex-col items-center justify-start origin-center pointer-events-none pt-4"
                        style={{ transform: `rotate(${i * 45 + 22.5}deg)` }}
                      >
                        <Icon size={18} color={prize.text} className="mb-1  opacity-80" />
                        <span className="font-black text-sm drop-" style={{ color: prize.text }}>
                          {prize.label}
                        </span>
                      </div>
                    );
                  })}
                  
                  {/* Center Glossy Peg */}
                  <div className="absolute inset-0 m-auto w-14 h-14 rounded-full z-10 flex items-center justify-center  border-[3px] border-surface">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full border border-yellow-200/50 flex items-center justify-center bg-black/20">
                        <Star size={12} className="text-yellow-100" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="reward"
                initial={{ scale: 0, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0.6 }}
                className="flex flex-col items-center justify-center w-full min-h-[280px]"
              >
                <div className="relative mb-6">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 border-4 border-yellow-200 flex items-center justify-center relative  z-10">
                    <Sparkles size={50} className="text-yellow-100 absolute top-4 right-4 opacity-50" />
                    <span className="text-4xl font-black text-white ">+{reward.reward_earned}</span>
                  </div>
                </div>
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-2">EPIC WIN!</h3>
                <p className="text-sm text-ink-soft mb-6 font-medium">Your balance has been updated.</p>
                <Button 
                  onClick={() => setReward(null)} 
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-black border-none  px-8 rounded-full"
                >
                  AWESOME!
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {!reward && (
            <Button 
              className="w-full font-black text-lg py-4 mt-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 border-none  rounded-2xl transition-all active:scale-95"
              onClick={handleSpin}
              disabled={spinning || spinsAvailable <= 0 || spinsUsedToday >= 5}
            >
              {spinning 
                ? 'SPINNING...' 
                : spinsUsedToday >= 5 
                  ? 'COME BACK TOMORROW!' 
                  : spinsAvailable <= 0 
                    ? 'GET MORE SPINS' 
                    : 'SPIN THE WHEEL'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, Zap, Coins } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { playSpin } from '../api';
import { useToast } from '../App';
import triggerConfetti from '../confetti';

const PRIZES = [
  { val: 50, label: '50', color: '#1E1B4B', text: '#A5B4FC', icon: Coins }, 
  { val: 100, label: '100', color: '#312E81', text: '#E0E7FF', icon: Coins }, 
  { val: 25, label: '25', color: '#4338CA', text: '#E0E7FF', icon: Zap },
  { val: 1000, label: '1000', color: '#EAB308', text: '#FFFFFF', icon: Star },
  { val: 150, label: '150', color: '#312E81', text: '#E0E7FF', icon: Coins },
  { val: 2000, label: '2000', color: '#EF4444', text: '#FFFFFF', icon: Zap },
  { val: 500, label: '500', color: '#F59E0B', text: '#FFFFFF', icon: Star },
  { val: 75, label: '75', color: '#1E1B4B', text: '#A5B4FC', icon: Coins },
];

export default function SpinWheel({ user, refreshUser }) {
  const [spinning, setSpinning] = useState(false);
  const [reward, setReward] = useState(null);
  const [rotation, setRotation] = useState(-22.5);
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

    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
      }
    } catch (e) {}

    setSpinning(true);
    setReward(null);

    const res = await playSpin(user.telegram_id);
    
    if (res.data) {
      const earned = res.data.reward_earned;
      const matchingIndices = PRIZES.map((p, i) => p.val === earned ? i : -1).filter(i => i !== -1);
      const targetIndex = matchingIndices[Math.floor(Math.random() * matchingIndices.length)] || 0;
      
      const sliceCenter = targetIndex * 45 + 22.5;
      const targetDegree = 360 - sliceCenter;
      
      const extraSpins = 360 * 8; // 8 fast rotations
      let normalizedRot = rotation % 360;
      if (normalizedRot < 0) normalizedRot += 360;
      
      const newRotation = rotation + extraSpins + targetDegree - normalizedRot;
      setRotation(newRotation);

      // Haptic tick during spin
      let ticks = 0;
      const hapticInterval = setInterval(() => {
        ticks++;
        try {
           if (window.Telegram?.WebApp?.HapticFeedback) {
             window.Telegram.WebApp.HapticFeedback.impactOccurred(ticks > 15 ? 'light' : 'medium');
           }
        } catch(e) {}
      }, 250);

      setTimeout(() => {
        clearInterval(hapticInterval);
        setSpinning(false);
        setReward(res.data);
        
        try {
          if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          }
          triggerConfetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
        } catch (e) {}

        refreshUser();
      }, 6000); // 6 seconds spin
    } else {
      setSpinning(false);
      showToast(res.error || 'Spin failed', 'error');
    }
  };

  const conicGradient = `conic-gradient(${PRIZES.map((p, i) => `${p.color} ${i * 45}deg ${(i + 1) * 45}deg`).join(', ')})`;

  return (
    <Card className="mb-4 bg-gradient-to-b from-[#0F0A1F] to-[#070510] relative overflow-hidden border border-indigo-500/20 shadow-[0_0_40px_rgba(79,70,229,0.15)] rounded-[2rem] p-0">
      
      {/* Decorative Casino Lights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
      </div>

      <div className="relative z-10 p-5">
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col">
             <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-600 uppercase tracking-wider flex items-center gap-2 drop-shadow-sm">
                <Sparkles size={22} className="text-yellow-400 fill-yellow-400/20" />
                Fortune Wheel
              </h2>
             </div>
             {spinsAvailable > 0 && spinsUsedToday < 5 ? (
               <p className="text-xs text-amber-400 font-black mt-1 flex items-center gap-1.5 bg-amber-500/10 w-fit px-3 py-1 rounded-full border border-amber-500/20">
                 <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                 </span>
                 {spinsAvailable} Free Spin{spinsAvailable > 1 ? 's' : ''} Ready!
               </p>
             ) : (
               <p className="text-xs text-ink-soft font-bold mt-1 bg-surface-soft w-fit px-3 py-1 rounded-full">Invite friends for more spins!</p>
             )}
          </div>
          
          <div className="text-right bg-[#1A152E] px-4 py-2 rounded-2xl border border-indigo-500/30 shadow-inner flex flex-col items-center justify-center">
            <p className="text-lg font-black text-white leading-none">{spinsAvailable}</p>
            <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-widest mt-1">Spins</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center relative min-h-[340px]">
          <AnimatePresence mode="wait">
            {!reward ? (
              <motion.div 
                key="wheel-container"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="relative w-72 h-72 mb-8 mt-4"
              >
                {/* Outer Ring with Lights */}
                <div className="absolute -inset-4 rounded-full border-4 border-[#2D2459] shadow-[0_0_50px_rgba(99,102,241,0.3)] bg-[#130E26]">
                  {/* Dotted border for a 'bulb' effect */}
                  <div className={`absolute inset-0 rounded-full border-[6px] border-dashed border-yellow-500/40 ${spinning ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
                </div>

                {/* The Pointer */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] filter">
                  <svg width="40" height="48" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 40L0 0H32L16 40Z" fill="url(#gold-grad)" stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round" />
                    <defs>
                      <linearGradient id="gold-grad" x1="16" y1="0" x2="16" y2="40" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FDE047" />
                        <stop offset="1" stopColor="#B45309" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                
                {/* Wheel Body */}
                <motion.div
                  className="absolute inset-0 rounded-full overflow-hidden"
                  style={{ 
                    background: conicGradient, 
                    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.9), 0 0 0 2px #4338CA'
                  }}
                  initial={{ rotate: rotation }}
                  animate={{ rotate: rotation }}
                  transition={{ duration: 6, ease: [0.1, 0.95, 0.2, 1] }} 
                >
                  {/* Wheel Slice Separator Lines */}
                  {PRIZES.map((_, i) => (
                    <div 
                      key={`line-${i}`}
                      className="absolute inset-0 origin-center pointer-events-none"
                      style={{ transform: `rotate(${i * 45}deg)` }}
                    >
                      <div className="w-[3px] h-1/2 bg-gradient-to-b from-white/40 to-transparent mx-auto" />
                    </div>
                  ))}

                  {/* Wheel Labels */}
                  {PRIZES.map((prize, i) => {
                    const Icon = prize.icon;
                    return (
                      <div 
                        key={i}
                        className="absolute inset-0 flex flex-col items-center justify-start origin-center pointer-events-none pt-5"
                        style={{ transform: `rotate(${i * 45 + 22.5}deg)` }}
                      >
                        <Icon size={20} color={prize.text} className="mb-1.5 opacity-90 filter drop-shadow-md" />
                        <span className="font-black text-[15px] drop-shadow-md tracking-tight" style={{ color: prize.text }}>
                          {prize.label}
                        </span>
                      </div>
                    );
                  })}
                  
                  {/* Center Glossy Peg */}
                  <div className="absolute inset-0 m-auto w-16 h-16 rounded-full z-10 flex items-center justify-center border-4 border-[#130E26] shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-600 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-white/20 w-1/2 h-full skew-x-12 translate-x-1/2" />
                      <div className="w-8 h-8 rounded-full border-2 border-yellow-200/50 flex items-center justify-center bg-black/40 relative z-10 shadow-inner">
                        <Star size={14} className="text-yellow-100 fill-yellow-100" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="reward"
                initial={{ scale: 0.5, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0.6 }}
                className="flex flex-col items-center justify-center w-full min-h-[300px] mt-4"
              >
                <div className="relative mb-6">
                  {/* Glowing ring behind reward */}
                  
                  <div className="w-36 h-36 rounded-full bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-600 border-[6px] border-yellow-100 flex flex-col items-center justify-center relative z-10 shadow-2xl">
                    <Sparkles size={40} className="text-yellow-100 absolute top-2 right-2 opacity-70" />
                    <span className="text-[10px] font-black uppercase text-yellow-900 tracking-widest mb-1">YOU WON</span>
                    <span className="text-4xl font-black text-white drop-shadow-md">+{reward.reward_earned}</span>
                  </div>
                </div>
                
                <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-600 mb-2 drop-shadow-sm uppercase tracking-wider">
                   {reward.tier === 'high' ? 'JACKPOT!' : 'EPIC WIN!'}
                </h3>
                
                <p className="text-sm text-ink-soft mb-8 font-medium">Rewards added directly to your balance.</p>
                
                <Button 
                  onClick={() => setReward(null)} 
                  className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-amber-500 text-black font-black border-none px-10 py-4 rounded-2xl text-lg shadow-[0_10px_20px_rgba(245,158,11,0.3)] active:translate-y-[2px] transition-all"
                >
                  COLLECT REWARD
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {!reward && (
            <div className="w-full relative z-20 mt-4">
              <Button 
                className={`w-full font-black text-lg py-5 rounded-[1.5rem] border-b-[4px] border-x border-t transition-all active:translate-y-[4px] active:border-b-[1px] ${
                  spinning || spinsAvailable <= 0 || spinsUsedToday >= 5
                    ? 'bg-surface-soft text-ink-soft border-border shadow-none'
                    : 'bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-500 border-indigo-900 text-white shadow-[0_10px_25px_rgba(79,70,229,0.4)] hover:shadow-[0_15px_35px_rgba(79,70,229,0.5)]'
                }`}
                style={{
                  backgroundSize: '200% auto',
                  animation: (!spinning && spinsAvailable > 0 && spinsUsedToday < 5) ? 'gradient-pan 3s linear infinite' : 'none'
                }}
                onClick={handleSpin}
                disabled={spinning || spinsAvailable <= 0 || spinsUsedToday >= 5}
              >
                {spinning 
                  ? 'SPINNING...' 
                  : spinsUsedToday >= 5 
                    ? 'LIMIT REACHED FOR TODAY' 
                    : spinsAvailable <= 0 
                      ? 'EARN SPINS WITH REFERRALS' 
                      : 'SPIN THE WHEEL'}
              </Button>
              <style>{`
                @keyframes gradient-pan {
                  0% { background-position: 0% 50%; }
                  100% { background-position: 200% 50%; }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

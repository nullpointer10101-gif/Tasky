import React, { useState } from 'react';
import { waitForGiga } from '../adUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Calendar, Sparkles } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { checkin } from '../api';
import { useToast } from '../App';

export default function DailyCheckin({ user, refreshUser }) {
  const [claiming, setClaiming] = useState(false);
  const [reward, setReward] = useState(null);
  const { showToast } = useToast();

  if (!user) return null;

  const [timeRemaining, setTimeRemaining] = useState('');

  if (!user) return null;

  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  let checkedInToday = false;
  let msRemaining = 0;

  if (user.last_checkin) {
    const lastCheckinDate = new Date(user.last_checkin);
    const now = new Date();
    msRemaining = TWENTY_FOUR_HOURS - (now.getTime() - lastCheckinDate.getTime());
    if (msRemaining > 0) {
      checkedInToday = true;
    }
  }

  React.useEffect(() => {
    if (!checkedInToday || msRemaining <= 0) return;
    
    const updateCountdown = () => {
      const lastCheckinDate = new Date(user.last_checkin);
      const now = new Date();
      const diff = TWENTY_FOUR_HOURS - (now.getTime() - lastCheckinDate.getTime());
      
      if (diff <= 0) {
        setTimeRemaining('');
        refreshUser(); // force reload so the button enables
        return;
      }
      
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeRemaining(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [checkedInToday, user.last_checkin]);

  let currentLoopDay = user.streak_days % 7;
  if (currentLoopDay === 0 && user.streak_days > 0) currentLoopDay = 7;
  
  let nextDayToClaim = checkedInToday ? currentLoopDay + 1 : currentLoopDay + 1;
  if (checkedInToday) {
     nextDayToClaim = currentLoopDay + 1;
     if (nextDayToClaim > 7) nextDayToClaim = 1;
  } else {
     let brokeStreak = false;
     if (user.last_checkin) {
       const lastCheckinDate = new Date(user.last_checkin);
       const now = new Date();
       if (now.getTime() - lastCheckinDate.getTime() >= 2 * TWENTY_FOUR_HOURS) {
         brokeStreak = true;
       }
     } else {
       brokeStreak = true;
     }
     
     if (brokeStreak && !checkedInToday) {
       nextDayToClaim = 1;
     } else {
       nextDayToClaim = (user.streak_days % 7) + 1;
     }
  }

  const handleClaim = async () => {
    const gigaReady = await waitForGiga(5000);
    if (!gigaReady) {
      showToast('Ad network not loaded. Please try again later.', 'error');
      return;
    }

    setClaiming(true);
    
    try {
      await window.showGiga("main");
    } catch (e) {
      showToast('You must watch the entire ad to claim your reward.', 'error');
      setClaiming(false);
      return;
    }

    try {
      const res = await checkin(user.telegram_id);
      
      if (res.data) {
        setReward(res.data);
        await refreshUser();
      } else {
        showToast(res.error || 'Failed to claim', 'error');
      }
    } catch (e) {
      showToast('Error claiming', 'error');
    } finally {
      setClaiming(false);
    }
  };

  const days = [1, 2, 3, 4, 5, 6, 7];

  return (
    <Card className="mb-4 bg-surface relative overflow-hidden border-border p-0 rounded-3xl">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] to-surface opacity-90 z-0"></div>
      

      <div className="relative z-10 p-5">
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-emerald-600 uppercase tracking-wide flex items-center gap-2">
              <Calendar size={18} className="text-emerald-400" />
              Daily Check-in
            </h2>
            <p className="text-xs text-ink-soft">Earn up to 500 TASKY on milestones</p>
          </div>
        </div>

        <div className="relative min-h-[160px]">
          <AnimatePresence mode="wait">
            {!reward ? (
              <motion.div 
                key="calendar" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(5px)' }}
                className="flex flex-col"
              >
                <div className="flex justify-between items-center mb-6 gap-2">
                  {days.map((day) => {
                    let state = 'upcoming';
                    
                    if (checkedInToday) {
                      if (day <= currentLoopDay) state = 'claimed';
                    } else {
                      if (day < nextDayToClaim) state = 'claimed';
                      if (day === nextDayToClaim) state = 'current';
                    }

                    return (
                      <div key={day} className="flex flex-col items-center flex-1">
                        <div 
                          className={`w-full aspect-square max-w-[44px] rounded-2xl flex items-center justify-center text-sm font-black border-2 transition-all duration-300 relative
                            ${state === 'claimed' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 ' : 
                              state === 'current' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-300 text-black  scale-110 z-10' : 
                              'bg-surface-soft border-border text-ink-soft'}`}
                        >
                          {state === 'claimed' ? <Check size={18} strokeWidth={4} /> : `D${day}`}
                          {state === 'current' && (
                             <Sparkles size={12} className="absolute -top-1 -right-1 text-yellow-100  animate-pulse" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button 
                  className={`w-full font-black text-lg py-4 rounded-2xl transition-all ${checkedInToday ? 'bg-surface-soft border-border text-ink-faint shadow-none' : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 border-none  active:scale-95'}`}
                  onClick={handleClaim} 
                  disabled={claiming || checkedInToday}
                >
                  {(() => {
                    if (claiming) return 'CLAIMING...';
                    if (checkedInToday) return timeRemaining ? `COME BACK IN ${timeRemaining}` : 'COME BACK LATER';
                    
                    let nextActualDay = user.streak_days + 1;
                    if (!checkedInToday) {
                      let brokeStreak = false;
                      if (user.last_checkin) {
                        const lastCheckinDate = new Date(user.last_checkin);
                        const now = new Date();
                        if (now.getTime() - lastCheckinDate.getTime() >= 2 * TWENTY_FOUR_HOURS) {
                          brokeStreak = true;
                        }
                      } else {
                        brokeStreak = true;
                      }
                      if (brokeStreak) nextActualDay = 1;
                    }
                    
                    let expectedReward = 30;
                    if (nextActualDay % 30 === 0) expectedReward = 500;
                    else if (nextActualDay % 14 === 0) expectedReward = 200;
                    else if (nextActualDay % 7 === 0) expectedReward = 100;
                    
                    return `CLAIM ${expectedReward} TASKY`;
                  })()}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="reward"
                initial={{ scale: 0, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0.6 }}
                className="flex flex-col items-center justify-center w-full py-2"
              >
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full scale-[1.2]" />
                  <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-emerald-400 to-emerald-600 border-4 border-emerald-200 flex items-center justify-center relative  z-10 rotate-3">
                    <Sparkles size={30} className="text-emerald-100 absolute top-2 right-2 opacity-60 animate-pulse" />
                    <span className="text-3xl font-black text-white  -rotate-3">+{reward.bonus_earned}</span>
                  </div>
                </div>
                <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-emerald-500 mb-1 tracking-wider">STREAK EXTENDED!</h3>
                <p className="text-xs text-ink-soft mb-5 font-medium">Come back tomorrow for more.</p>
                <Button 
                  onClick={() => setReward(null)} 
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black border-none  px-10 rounded-full py-3 transition-all active:scale-95 tracking-wide"
                >
                  AWESOME
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
}

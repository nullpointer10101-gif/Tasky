import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Share, Trophy, Users, CheckCircle2, Clock, Gift, Medal, Lock, Sparkles } from 'lucide-react';
import Card, { cardVariants } from '../components/Card';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { getReferral, getReferralLeaderboard } from '../api';
import { useToast } from '../App';
import ReferralSquadRoadmap from '../components/ReferralSquadRoadmap';
import { useIsAdmin } from '../AdminContext';

const containerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

export default function Referral({ user }) {
  const [activeTab, setActiveTab] = useState('stats');
  const [refData, setRefData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const day = now.getUTCDay();
      let daysUntilNextWednesday = 3 - day;
      if (daysUntilNextWednesday <= 0) {
        daysUntilNextWednesday += 7;
      }
      
      const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilNextWednesday, 0, 0, 0));
      const diff = target.getTime() - now.getTime();
      
      if (diff <= 0) return '0d 0h 0m 0s';
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);

      return `${d}d ${h}h ${m}m ${s}s`;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [refRes, leadRes] = await Promise.all([
          getReferral(user?.telegram_id || '123456'),
          getReferralLeaderboard()
        ]);
        if (!isMounted) return;
        if (refRes.data) setRefData(refRes.data);
        if (leadRes.data) {
          if (leadRes.data.leaderboard) {
            setLeaderboard(leadRes.data.leaderboard);
            setIsDemo(leadRes.data.is_demo_data || false);
          } else {
            setLeaderboard(leadRes.data);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Referral fetchData error:', err);
        showToast(err.message || 'Error loading referral data', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [user]);

  const handleCopy = () => {
    if (refData?.referral_link) {
      navigator.clipboard.writeText(refData.referral_link);
      showToast('Referral link copied!');
    }
  };

  const handleShare = () => {
    if (refData?.referral_link && window.Telegram?.WebApp) {
      const text = `🚨 *Claim your free USDT and crypto rewards on Tasky!* 💸\n\n⚡️ Tap the link below to start earning instantly and build your passive income! 👇\n\n${refData.referral_link}`;
      window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(refData.referral_link)}&text=${encodeURIComponent('🚨 *Claim your free USDT and crypto rewards on Tasky!* 💸\n\n⚡️ Tap the link below to start earning instantly and build your passive income! 👇\n\n')}`);
    } else {
      handleCopy();
    }
  };





  return (
    <div className="p-4 space-y-4 pb-20 min-h-full relative">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Refer & Earn</h1>
          <p className="text-sm text-ink-soft">Invite friends to earn TASKY</p>
        </div>
      </div>

      <Card className="bg-gradient-primary border-0 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="font-bold mb-4">Your Invite Link</h2>
          
          <div className="flex bg-black/20 rounded-xl p-1 mb-4  border border-white/10">
            <input 
              type="text" 
              readOnly 
              value={refData?.referral_link || ''} 
              className="bg-transparent flex-1 px-3 text-sm text-white focus:outline-none min-w-0"
            />
            <Button size="sm" variant="secondary" className="!bg-white !text-black border-0 hover:!bg-white/90" onClick={handleCopy}>
              <Copy size={16} />
            </Button>
          </div>

          <Button className="w-full bg-white text-black hover:bg-white/90 border-0 flex items-center justify-center gap-2" onClick={handleShare}>
            <Share size={18} />
            <span>Invite Friends</span>
          </Button>
        </div>
        
        {/* Decorative circles */}
        
        
      </Card>

      <div className="flex bg-surface-soft p-1.5 rounded-pill relative mb-4 shadow-inner border border-black/5">
        {['stats', 'leaderboard'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-[15px] font-bold z-10 transition-all flex items-center justify-center gap-2 relative ${
              activeTab === tab ? 'text-ink' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {tab === 'stats' ? (
              'Your Stats'
            ) : (
              <div className="flex items-center gap-1.5">
                <span className={`${activeTab === tab ? 'text-amber-500 ' : 'text-fuchsia-500 '} transition-colors`}>
                  <Trophy size={16} />
                </span>
                <span className={`${activeTab === tab ? '' : 'bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 to-purple-500 '}`}>
                  Leaderboard
                </span>
                {/* Urgent notification dot */}
                <span className="flex h-2 w-2 relative ml-0.5 -mt-2">
                  <span className=" absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 "></span>
                </span>
              </div>
            )}
          </button>
        ))}
        <motion.div
          layoutId="refTabIndicator"
          className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-surface rounded-pill shadow-sm border border-border"
          initial={false}
          animate={{ left: activeTab === 'stats' ? '4px' : 'calc(50% + 0px)' }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      </div>

      <div className="">
        {activeTab === 'stats' ? (
          <motion.div    className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="flex flex-col">
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                  <Users size={16} className="text-blue-400" />
                </div>
                <p className="text-sm text-ink-faint mb-1">Total Invites</p>
                <p className="text-xl font-bold">{refData?.total_referrals || 0}</p>
              </Card>
              
              <Card className="flex flex-col">
                <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                  <CheckCircle2 size={16} className="text-green-400" />
                </div>
                <p className="text-sm text-ink-faint mb-1">Valid Invites</p>
                <p className="text-xl font-bold">{refData?.valid_referrals || 0}</p>
              </Card>

              <Card className="flex flex-col">
                <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center mb-3">
                  <Clock size={16} className="text-orange-400" />
                </div>
                <p className="text-sm text-ink-faint mb-1">Pending</p>
                <p className="text-xl font-bold">{refData?.pending_referrals || 0}</p>
              </Card>

              <Card className="flex flex-col">
                <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center mb-3">
                  <Gift size={16} className="text-purple-400" />
                </div>
                <p className="text-sm text-ink-faint mb-1">Reward/Invite</p>
                <p className="text-lg font-bold">+{refData?.reward_per_referral || 200} & {refData?.spin_reward_per_referral || 1} Spin</p>
              </Card>
            </div>

            <Card>
              <h3 className="font-bold text-lg mb-3">How it Works</h3>
              <ul className="space-y-3 text-sm text-ink-soft">
                <li className="flex gap-2">
                  <span className="text-success mt-0.5">•</span>
                  <span>Share your unique invite link with friends.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-success mt-0.5">•</span>
                  <span>When they join and complete at least <strong className="text-ink">{refData?.tasks_required_for_valid || 0} tasks</strong>, they become a valid referral.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-success mt-0.5">•</span>
                  <span>You will instantly earn <strong className="text-ink">{refData?.reward_per_referral || 300} TASKY + {refData?.spin_reward_per_referral || 1} Spin</strong> for every valid referral!</span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-warning-soft text-warning rounded-xl text-xs font-medium border border-warning/20 leading-snug">
                <strong>Important:</strong> Any attempt to use fake accounts or bots to exploit the referral system will result in permanent account suspension and loss of all earnings.
              </div>
            </Card>
          </motion.div>
        ) : (
            <motion.div    className="space-y-3 pb-8">
            <div className="mb-6 relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[#1E1B4B] via-[#4C1D95] to-[#1E1B4B] border border-purple-500/50  flex flex-col items-center justify-center text-center transform hover:scale-[1.02] transition-transform duration-300">
              
              <div className="relative z-10 flex flex-col items-center gap-2 w-full">
                <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/20 shadow-inner ">
                  <Trophy size={14} className="text-fuchsia-300 " />
                  <span className="text-[11px] font-black text-fuchsia-100 uppercase tracking-widest ">Weekly Leaderboard W2</span>
                </div>
                
                <h2 className="text-[28px] font-black text-white  tracking-tight flex items-center justify-center gap-3 mt-1 mb-1 w-full">
                  <Clock className="text-fuchsia-400   shrink-0" size={26} />
                  <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-fuchsia-100 to-fuchsia-300 tabular-nums">
                    {timeLeft}
                  </span>
                </h2>
                
                <p className="text-[13px] font-medium text-fuchsia-200/90 leading-tight">
                  Top 10 players win <strong className="text-fuchsia-300 font-bold ">USDT & TASKY</strong> every Wednesday!
                </p>
              </div>
            </div>
            
            {leaderboard.length === 0 && !loading && (
              <EmptyState icon={<Medal />} title="No data" description="The leaderboard is empty." />
            )}

            {leaderboard.map((user, index) => {
              const rank = index + 1;
              let bgClass = "bg-surface border border-border/50 hover:bg-surface-soft hover:border-primary/40 hover: transition-all duration-300";
              let rankTextClass = "text-ink-faint font-black text-lg";
              let icon = null;
              let prizeText = "10k TASKY";
              if (rank === 4) prizeText = "50k TASKY";
              else if (rank === 5) prizeText = "40k TASKY";
              else if (rank === 6) prizeText = "30k TASKY";
              else if (rank === 7) prizeText = "20k TASKY";

              let prizeClass = "bg-primary/10 text-primary border border-primary/20  font-bold text-[10px] px-2 py-1";
              let nameClass = "text-ink font-bold text-[15px]";
              let statClass = "text-ink-soft";

              if (rank === 1) {
                bgClass = "bg-gradient-to-r from-[#FFB703] via-[#FF8F00] to-[#E65100]  border border-[#FFE082]  scale-[1.02] transform z-20 relative";
                rankTextClass = "text-[#FFF8E1] font-black text-xl ";
                icon = <Trophy size={24} className="text-[#FFF8E1] " />;
                prizeText = "100 USDT";
                prizeClass = "bg-white text-[#E65100] font-black border-0 shadow-lg px-3 py-1 text-xs scale-105";
                nameClass = "text-white font-black text-lg ";
                statClass = "text-[#FFE082] font-semibold";
              } else if (rank === 2) {
                bgClass = "bg-gradient-to-r from-[#E2E8F0] via-[#CBD5E1] to-[#94A3B8]  border border-white z-10 relative";
                rankTextClass = "text-[#334155] font-black text-lg ";
                icon = <Medal size={22} className="text-[#334155] " />;
                prizeText = "50 USDT";
                prizeClass = "bg-white text-[#475569] font-black border-0 shadow-md px-3 py-1 text-xs";
                nameClass = "text-[#0F172A] font-extrabold text-[16px] ";
                statClass = "text-[#475569] font-semibold";
              } else if (rank === 3) {
                bgClass = "bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C]  border border-[#FDBA74] z-10 relative";
                rankTextClass = "text-[#FFEDD5] font-black text-lg ";
                icon = <Medal size={22} className="text-[#FFEDD5] " />;
                prizeText = "20 USDT";
                prizeClass = "bg-white text-[#C2410C] font-black border-0 shadow-md px-3 py-1 text-xs";
                nameClass = "text-white font-extrabold text-[16px] ";
                statClass = "text-[#FFEDD5] font-semibold";
              }

              return (
                <motion.div
                  key={user.id || user.telegram_id || index}
                  variants={{ initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 } }}
                  whileHover={{ scale: rank > 1 ? 1.02 : 1.04 }}
                  className={`rounded-2xl p-4 flex items-center gap-3 overflow-hidden ${bgClass}`}
                >
                  {rank <= 3 && (
                    <>
                      
                    </>
                  )}
                  
                  <div className={`w-8 flex justify-center shrink-0 ${rankTextClass}`}>
                    {icon || `#${rank}`}
                  </div>
                  
                  <div className={`h-11 w-11 rounded-full flex items-center justify-center font-bold overflow-hidden shrink-0 shadow-inner ${rank <= 3 ? 'bg-white/20 text-white ' : 'bg-surface-soft text-ink border border-border/50'}`}>
                    {user.username ? (
                      <span className="text-sm tracking-wider">{user.username.substring(0, 2).toUpperCase()}</span>
                    ) : (
                      <Users size={20} className="opacity-80" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 z-10">
                    <h3 className={`truncate ${nameClass}`}>
                      {user.first_name || user.username || 'Anonymous'}
                    </h3>
                    <p className={`text-[11px] uppercase tracking-wider truncate mt-0.5 ${statClass}`}>
                      <strong className="font-black text-sm mr-1">{user.valid_referrals || 0}</strong> valid 
                      <span className="opacity-50 mx-1">|</span> {user.total_referrals} total
                    </p>
                  </div>
                  
                  <div className="text-right shrink-0 flex flex-col items-end gap-1 z-10">
                    <div className={`uppercase tracking-widest rounded-full flex items-center justify-center ${prizeClass}`}>
                      {prizeText}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}

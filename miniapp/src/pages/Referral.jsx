import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Share, Trophy, Users, CheckCircle2, Clock, Gift, Medal, Lock, Sparkles } from 'lucide-react';
import Card, { cardVariants } from '../components/Card';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { getReferral, getReferralLeaderboard } from '../api';
import { useToast } from '../App';

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
    <div className="p-4 space-y-4 pb-24 h-full flex flex-col">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-ink">Refer & Earn</h1>
        <p className="text-sm text-ink-soft">Invite friends to earn TASKY</p>
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

      <div className="flex bg-surface-soft p-1 rounded-pill relative mb-2">
        {['stats', 'leaderboard'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium z-10 transition-colors ${activeTab === tab ? 'text-ink' : 'text-ink-soft hover:text-ink'}`}
          >
            {tab === 'stats' ? 'Stats' : 'Leaderboard'}
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

      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {activeTab === 'stats' ? (
          <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-4">
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
                  <span>You will instantly earn <strong className="text-ink">{refData?.reward_per_referral || 200} TASKY + {refData?.spin_reward_per_referral || 1} Spin</strong> for every valid referral!</span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-warning-soft text-warning rounded-xl text-xs font-medium border border-warning/20 leading-snug">
                <strong>Important:</strong> Any attempt to use fake accounts or bots to exploit the referral system will result in permanent account suspension and loss of all earnings.
              </div>
            </Card>
          </motion.div>
        ) : (
          ['taskycs', 'takycs', 'aleem_crypto', 'testuser'].includes(user?.username?.toLowerCase()?.replace('@', '')) || ['123456', '8823265955'].includes(String(user?.telegram_id)) ? (
            <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-3 pb-8">
            <div className="p-3 bg-indigo-500/10 text-indigo-100 rounded-xl font-medium border border-indigo-500/20 flex flex-col gap-2 mb-4 relative overflow-hidden">
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Trophy size={16} />
                  <span className="font-bold">Weekly Leaderboard W1</span>
                </div>
                <div className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-bold flex items-center gap-1 border border-indigo-500/20">
                  <Clock size={12} />
                  Ends in {timeLeft}
                </div>
              </div>
              <div className="text-xs text-indigo-400/80 relative z-10 leading-snug">
                Rewards are distributed every Wednesday to the Top 10 users!
              </div>
            </div>
            
            {leaderboard.length === 0 && !loading && (
              <EmptyState icon={<Medal />} title="No data" description="The leaderboard is empty." />
            )}

            {leaderboard.map((user, index) => {
              const rank = index + 1;
              let bgClass = "bg-surface-soft border border-border";
              let rankTextClass = "text-ink-faint font-bold";
              let icon = null;
              let prizeText = "10k TASKY";
              if (rank === 4) prizeText = "50k TASKY";
              else if (rank === 5) prizeText = "40k TASKY";
              else if (rank === 6) prizeText = "30k TASKY";
              else if (rank === 7) prizeText = "20k TASKY";

              let prizeClass = "bg-primary-soft text-primary border border-primary/20";

              if (rank === 1) {
                bgClass = "bg-gradient-to-br from-amber-200 to-amber-500 border border-amber-300 text-amber-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse-slow";
                rankTextClass = "text-amber-900 font-black";
                icon = <Trophy size={18} className="text-amber-900 drop-shadow-md" />;
                prizeText = "100 USDT";
                prizeClass = "bg-amber-900/10 text-amber-950 font-black border border-amber-900/20";
              } else if (rank === 2) {
                bgClass = "bg-gradient-to-br from-slate-200 to-slate-400 border border-slate-300 text-slate-900 shadow-[0_0_15px_rgba(148,163,184,0.3)]";
                rankTextClass = "text-slate-800 font-black";
                icon = <Medal size={18} className="text-slate-800 drop-shadow-sm" />;
                prizeText = "50 USDT";
                prizeClass = "bg-slate-900/10 text-slate-900 font-black border border-slate-900/20";
              } else if (rank === 3) {
                bgClass = "bg-gradient-to-br from-orange-200 to-orange-400 border border-orange-300 text-orange-950 shadow-[0_0_15px_rgba(249,115,22,0.3)]";
                rankTextClass = "text-orange-900 font-black";
                icon = <Medal size={18} className="text-orange-900 drop-shadow-sm" />;
                prizeText = "20 USDT";
                prizeClass = "bg-orange-900/10 text-orange-950 font-black border border-orange-900/20";
              }

              return (
                <motion.div
                  key={user.id || user.telegram_id || index}
                  variants={{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }}
                  className={`rounded-2xl p-4 flex items-center gap-3 relative overflow-hidden ${bgClass}`}
                >
                  {rank === 1 && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                  )}
                  
                  <div className={`w-8 flex justify-center z-10 ${rankTextClass}`}>
                    {icon || `#${rank}`}
                  </div>
                  
                  <div className="h-10 w-10 rounded-full bg-black/10 flex items-center justify-center font-bold overflow-hidden shrink-0 z-10">
                    {user.username ? (
                      <span className="opacity-80 text-sm">{user.username.substring(0, 2).toUpperCase()}</span>
                    ) : (
                      <Users size={18} className="opacity-70" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 z-10">
                    <h3 className={`font-bold truncate ${rank <= 3 ? '' : 'text-ink'}`}>
                      {user.first_name || user.username || 'Anonymous'}
                    </h3>
                    <p className={`text-xs ${rank <= 3 ? 'opacity-80' : 'text-ink-soft'} truncate mt-0.5`}>
                      {user.valid_referrals || 0} valid / {user.total_referrals} total
                    </p>
                  </div>
                  
                  <div className="text-right shrink-0 flex flex-col items-end gap-1 z-10">
                    <div className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${prizeClass}`}>
                      {prizeText}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="flex flex-col items-center justify-center h-full pt-12 pb-24 px-4 text-center"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 w-32 h-32 rounded-full border border-dashed border-indigo-500/30 -mx-8 -my-8" />
                <div className="absolute inset-0 w-24 h-24 rounded-full border border-purple-500/20 -mx-4 -my-4" />
                <div className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
                  <Lock size={32} />
                </div>
                <div className="absolute -top-4 -right-4 text-amber-400 animate-pulse">
                  <Sparkles size={20} />
                </div>
              </div>
              <h2 className="text-2xl font-black text-ink tracking-tight mb-2">
                Global Leaderboard
              </h2>
              <div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Unlocking Soon • Q3 2025</span>
              </div>
              <p className="text-sm text-ink-soft max-w-[240px] leading-relaxed mx-auto font-medium">
                Only the elite will rank. The top 100 players will share massive <strong className="text-emerald-500">USDT Prize Pools</strong> and exclusive NFTs.
              </p>
              <div className="mt-8 p-4 bg-surface-soft rounded-2xl border border-border w-full">
                <p className="text-xs text-ink-faint font-medium mb-1">Your current mission:</p>
                <p className="text-sm font-bold text-ink">Keep inviting friends to secure an early rank advantage.</p>
              </div>
            </motion.div>
          )
        )}
      </div>
    </div>
  );
}

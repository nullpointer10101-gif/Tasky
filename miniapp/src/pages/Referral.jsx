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
            onClick={() => {
              setActiveTab(tab);
              if (tab === 'leaderboard' && showToast) {
                showToast('🔒 Leaderboard is currently locked! Season 2 coming soon.', 'error');
              }
            }}
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
                <span className="inline-flex items-center gap-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-amber-500/30">
                  <Lock size={10} />
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
                  <span>When they join and complete their <strong className="text-ink">first withdrawal</strong> (either a Gram Claim or a Gram Withdrawal), they become a valid referral.</span>
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
          <motion.div className="space-y-4 pb-8" variants={cardVariants}>
            <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-[#1E1B4B] via-[#311042] to-[#0F0D24] border border-purple-500/40 text-center flex flex-col items-center justify-center shadow-2xl">
              
              {/* Background ambient glow */}
              <div className="absolute -top-12 -left-12 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-fuchsia-500/20 rounded-full blur-3xl" />

              {/* Glowing Lock Icon */}
              <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 mb-5 shadow-xl shadow-purple-500/30 animate-pulse">
                <div className="w-full h-full rounded-2xl bg-[#0F0D24] flex items-center justify-center">
                  <Lock className="w-9 h-9 text-purple-300" />
                </div>
              </div>

              {/* Badge */}
              <div className="relative z-10 inline-flex items-center gap-2 bg-purple-500/15 px-4 py-1.5 rounded-full border border-purple-500/30 text-purple-300 text-xs font-black uppercase tracking-widest mb-3">
                <Sparkles size={14} className="text-amber-400" />
                SEASON 2 • COMING SOON
              </div>

              {/* Heading */}
              <h2 className="relative z-10 text-2xl md:text-3xl font-black text-white tracking-tight mb-2">
                Leaderboard Rewards Locked
              </h2>

              {/* Description */}
              <p className="relative z-10 text-xs md:text-sm font-medium text-purple-200/80 max-w-xs mx-auto mb-6 leading-relaxed">
                Season 1 leaderboard rewards have concluded! Season 2 mega prize pool is being configured and will launch soon.
              </p>

              {/* Info Cards */}
              <div className="relative z-10 grid grid-cols-2 gap-3 w-full max-w-sm mb-6">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-center">
                  <p className="text-[10px] font-bold text-purple-300/80 uppercase tracking-wider">Next Event</p>
                  <p className="text-sm font-black text-amber-400">Season 2 Launch</p>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-center">
                  <p className="text-[10px] font-bold text-purple-300/80 uppercase tracking-wider">Prize Pool</p>
                  <p className="text-sm font-black text-emerald-400">1,000+ USDT</p>
                </div>
              </div>

              {/* Community Announcement Banner */}
              <a
                href="https://t.me/TaskyOfficialCommunity"
                target="_blank"
                rel="noreferrer"
                className="relative z-10 inline-flex items-center gap-2 text-xs font-bold text-purple-200 bg-purple-500/20 hover:bg-purple-500/30 px-4 py-2.5 rounded-2xl border border-purple-500/30 transition-all active:scale-95"
              >
                <Trophy size={14} className="text-amber-400 shrink-0" />
                <span>Join Official Community for Season 2 Announcement</span>
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

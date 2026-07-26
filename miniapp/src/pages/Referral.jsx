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
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

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
        if (leadRes.data) setLeaderboard(leadRes.data);
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
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex flex-col items-center justify-center h-full pt-12 pb-24 px-4 text-center"
          >
            {/* The Vault Lock */}
            <div className="relative mb-8">
              {/* Glowing back plate (static) */}
              <div className="absolute inset-0 w-32 h-32 rounded-full border border-dashed border-indigo-500/30 -mx-8 -my-8" />
              <div className="absolute inset-0 w-24 h-24 rounded-full border border-purple-500/20 -mx-4 -my-4" />
              
              {/* Center Lock */}
              <div className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
                <Lock size={32} />
              </div>

              {/* Sparkles (CSS pulse) */}
              <div className="absolute -top-4 -right-4 text-amber-400 animate-pulse">
                <Sparkles size={20} />
              </div>
            </div>

            {/* Typography */}
            <h2 className="text-2xl font-black text-ink tracking-tight mb-2">
              Global Leaderboard
            </h2>
            <div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Unlocking Soon • Q3 2025</span>
            </div>
            <p className="text-sm text-ink-soft max-w-[240px] leading-relaxed mx-auto font-medium">
              Only the elite will rank. The top 100 players will share massive <strong className="text-emerald-500">USDT Prize Pools</strong> and exclusive NFTs.
            </p>
            
            {/* Call to action */}
            <div className="mt-8 p-4 bg-surface-soft rounded-2xl border border-border w-full">
              <p className="text-xs text-ink-faint font-medium mb-1">Your current mission:</p>
              <p className="text-sm font-bold text-ink">Keep inviting friends to secure an early rank advantage.</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

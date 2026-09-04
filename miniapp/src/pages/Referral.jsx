import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Share, Trophy, Users, CheckCircle2, Clock, Gift, Medal, Lock, Sparkles, Flame } from 'lucide-react';
import Card, { cardVariants } from '../components/Card';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { getReferral, getReferralLeaderboard, claimReferralCommission } from '../api';
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
  const [claimingComm, setClaimingComm] = useState(false);
  const { showToast } = useToast();

  const handleClaimCommission = async () => {
    const telegramId = user?.telegram_id || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (!telegramId) {
      showToast('Telegram user ID required', 'error');
      return;
    }
    const unclaimed = parseFloat(refData?.unclaimed_commission || 0);
    if (unclaimed < 1.0) {
      showToast(`Minimum commission claim is 1.0 GRAM. You currently have ${unclaimed.toFixed(3)} GRAM.`, 'error');
      return;
    }

    setClaimingComm(true);
    try {
      const { data, error } = await claimReferralCommission(telegramId);
      if (error) {
        showToast(error, 'error');
      } else if (data && data.success) {
        showToast(data.message || '🎉 Commission claim request submitted to Admin!', 'success');
        const refRes = await getReferral(telegramId);
        if (refRes.data) setRefData(refRes.data);
      }
    } catch (err) {
      showToast('Error submitting commission claim', 'error');
    } finally {
      setClaimingComm(false);
    }
  };

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
          <p className="text-sm text-ink-soft">Invite friends to earn TASKY & NFT Team Commissions</p>
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

            {/* Team NFT Unclaimed Commission Vault Card */}
            <div className="bg-gradient-to-br from-[#2D0B00] via-[#4A1000] to-[#1F0800] p-4 rounded-3xl border border-amber-500/50 shadow-xl space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Gift size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-wider text-amber-300">Team NFT Commission Vault</h3>
                    <p className="text-[11px] text-white/70">Min Claim: <b className="text-amber-300">1.0 GRAM</b> (Admin Review)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider">Unclaimed Balance</p>
                  <p className="text-lg font-black text-amber-300">{parseFloat(refData?.unclaimed_commission || 0).toFixed(3)} GRAM</p>
                </div>
              </div>

              {parseFloat(refData?.pending_claim_gram || 0) > 0 && (
                <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-1.5 font-semibold">
                  <Clock size={14} className="animate-spin text-amber-400 shrink-0" />
                  <span>Pending Claim: <b>{parseFloat(refData?.pending_claim_gram).toFixed(3)} GRAM</b> (Under Admin Review)</span>
                </div>
              )}

              <Button
                onClick={handleClaimCommission}
                loading={claimingComm}
                disabled={parseFloat(refData?.unclaimed_commission || 0) < 1.0 || claimingComm}
                className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider border-0 shadow-lg transition-all ${
                  parseFloat(refData?.unclaimed_commission || 0) >= 1.0
                    ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-black hover:opacity-95 shadow-amber-500/30 active:scale-98'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                {parseFloat(refData?.unclaimed_commission || 0) >= 1.0 ? '📥 Claim Commission Request to Admin' : `🔒 Min 1.0 GRAM to Claim (${(1.0 - parseFloat(refData?.unclaimed_commission || 0)).toFixed(3)} GRAM needed)`}
              </Button>
            </div>

            {/* Exact Commission Breakdown Chart Across ALL NFTs */}
            <div className="bg-gradient-to-br from-[#1E1B4B] via-[#2A123D] to-[#0F0D24] p-4 rounded-3xl border border-amber-500/30 space-y-3 shadow-xl">
              <div className="flex items-center gap-2">
                <span className="text-base">📊</span>
                <h3 className="font-black text-xs md:text-sm text-amber-300 uppercase tracking-wider">Exact Commission Breakdown Across ALL NFTs</h3>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-[11px] font-black text-ink-soft">
                      <th className="p-3">NFT Card</th>
                      <th className="p-3">Price</th>
                      <th className="p-3 text-amber-300">🥇 Level 1 Direct Ref (30%)</th>
                      <th className="p-3 text-purple-300">🥈 Level 2 Upline (10%)</th>
                      <th className="p-3 text-indigo-300">🥉 Level 3 Upline (4%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-semibold text-white">
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-bold text-purple-300">Starter Miner #01</td>
                      <td className="p-3 text-amber-400 font-extrabold">0.50 GRAM</td>
                      <td className="p-3 text-emerald-400 font-black">+0.15 GRAM</td>
                      <td className="p-3 text-purple-200">+0.05 GRAM</td>
                      <td className="p-3 text-indigo-200">+0.02 GRAM</td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-bold text-amber-300">Turbo Miner #02</td>
                      <td className="p-3 text-amber-400 font-extrabold">1.00 GRAM</td>
                      <td className="p-3 text-emerald-400 font-black">+0.30 GRAM</td>
                      <td className="p-3 text-purple-200">+0.10 GRAM</td>
                      <td className="p-3 text-indigo-200">+0.04 GRAM</td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors bg-orange-500/10">
                      <td className="p-3 font-bold text-orange-300 flex items-center gap-1">
                        <Flame size={12} className="text-orange-400" /> Mega Miner #03
                      </td>
                      <td className="p-3 text-amber-400 font-extrabold">5.00 GRAM</td>
                      <td className="p-3 text-emerald-400 font-black">+1.50 GRAM</td>
                      <td className="p-3 text-purple-200">+0.50 GRAM</td>
                      <td className="p-3 text-indigo-200">+0.20 GRAM</td>
                    </tr>
                  </tbody>
                </table>
              </div>
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

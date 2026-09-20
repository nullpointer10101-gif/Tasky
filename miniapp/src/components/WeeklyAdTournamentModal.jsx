import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Trophy, RefreshCw, Crown, Star, Flame } from 'lucide-react';
import { getCampaignTournament, recordCampaignAd } from '../api';
import { showRewardedAd } from '../adUtils';
import { useToast } from '../App';

const TIERS = [
  { rank: '1st',   label: '🥇', gram: '1.00', tasky: '20,000', col: '#FFD700', glow: 'rgba(255,215,0,0.35)' },
  { rank: '2nd',   label: '🥈', gram: '0.50', tasky: '10,000', col: '#C0C0C0', glow: 'rgba(192,192,192,0.25)' },
  { rank: '3rd',   label: '🥉', gram: '0.30', tasky: '5,000',  col: '#CD7F32', glow: 'rgba(205,127,50,0.25)' },
  { rank: '4-10',  label: '🏅', gram: '0.10', tasky: '2,000',  col: '#6366f1', glow: 'rgba(99,102,241,0.25)' },
  { rank: '11-30', label: '🎖️', gram: '0.05', tasky: '1,000',  col: '#a78bfa', glow: 'rgba(167,139,250,0.18)' },
];

function pad(n) { return String(n).padStart(2, '0'); }

function RankIcon({ rank }) {
  if (rank === 1) return React.createElement('span', { className: 'text-xl leading-none' }, '🥇');
  if (rank === 2) return React.createElement('span', { className: 'text-xl leading-none' }, '🥈');
  if (rank === 3) return React.createElement('span', { className: 'text-xl leading-none' }, '🥉');
  return React.createElement('span', { className: 'text-xs font-black text-yellow-400 leading-none' }, '#' + rank);
}

export default function WeeklyAdTournamentModal({ isOpen, onClose, user }) {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [watching, setWatching] = useState(false);
  const [tab,      setTab]      = useState('leaderboard');
  const [tl,       setTl]       = useState({ d: 0, h: 0, m: 0, s: 0 });
  const { showToast } = useToast() || {};

  useEffect(() => {
    if (!data?.tournament?.time_left_ms) return;
    const end = Date.now() + data.tournament.time_left_ms;
    const tick = () => {
      const diff = Math.max(0, end - Date.now());
      setTl({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [data?.tournament?.time_left_ms]);

  const fetchData = async () => {
    if (!user?.telegram_id) return;
    setLoading(true);
    const { data: res } = await getCampaignTournament(user.telegram_id);
    if (res?.success) setData(res);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && user?.telegram_id) fetchData();
  }, [isOpen, user?.telegram_id]);

  const handleWatch = async () => {
    if (watching) return;
    setWatching(true);
    try {
      const res = await showRewardedAd('adexium');
      if (res.success) {
        const { data: rec } = await recordCampaignAd(user.telegram_id, res.network || 'gigapub');
        if (rec?.success) {
          showToast?.('🏆 Ad counted! Rank updating...', 'success');
          fetchData();
        }
      } else {
        showToast?.(res.error || 'Watch the full ad to earn progress!', 'error');
      }
    } catch {
      showToast?.('Ad error. Tap again!', 'error');
    } finally {
      setWatching(false);
    }
  };

  if (!isOpen) return null;

  const lb      = data?.leaderboard || [];
  const me      = data?.user_stats  || {};
  const inPrize = me.rank && me.rank <= 30;

  const timerCells = [
    { v: tl.d, l: 'd' }, { v: tl.h, l: 'h' },
    { v: tl.m, l: 'm' }, { v: tl.s, l: 's' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col"
        style={{ background: 'rgba(5,3,18,0.97)', backdropFilter: 'blur(16px)' }}
      >
        {/* ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div style={{ position:'absolute',top:'-8%',left:'50%',transform:'translateX(-50%)',
            width:600,height:280,borderRadius:'50%',
            background:'radial-gradient(ellipse,rgba(234,179,8,0.10) 0%,transparent 70%)' }} />
          <div style={{ position:'absolute',bottom:0,left:'-10%',
            width:300,height:300,borderRadius:'50%',
            background:'radial-gradient(ellipse,rgba(99,102,241,0.09) 0%,transparent 70%)' }} />
        </div>

        {/* HEADER */}
        <div className="relative flex-shrink-0 px-4 pt-6 pb-4">
          <button onClick={onClose}
            className="absolute top-6 right-4 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }}>
            <X size={17} className="text-white/60" />
          </button>

          <div className="flex items-center gap-3 pr-10 mb-4">
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
              className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0"
              style={{ background:'linear-gradient(135deg,#f59e0b,#eab308)', boxShadow:'0 0 24px rgba(234,179,8,0.5)' }}>
              <Trophy size={24} className="text-black" />
            </motion.div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400/70">7-Day Championship</p>
              <h1 className="text-[19px] font-black text-white tracking-tight leading-tight">Ad Leaderboard</h1>
            </div>
          </div>

          {/* countdown */}
          <div className="rounded-2xl px-4 py-3 flex items-center justify-between"
            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-orange-400 animate-pulse" />
              <span className="text-xs font-bold text-white/50">Ends in</span>
            </div>
            <div className="flex items-center gap-1 font-mono">
              {timerCells.map(({ v, l }, i) => (
                <React.Fragment key={l}>
                  {i > 0 && <span className="text-white/20 text-[10px] mx-0.5">:</span>}
                  <span className="px-2 py-1 rounded-lg text-yellow-300 text-[11px] font-black"
                    style={{ background:'rgba(234,179,8,0.10)', border:'1px solid rgba(234,179,8,0.20)' }}>
                    {pad(v)}{l}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* MY RANK STRIP */}
        <div className="flex-shrink-0 px-4 mb-3">
          <div className="rounded-2xl px-4 py-3 flex items-center justify-between"
            style={{
              background: inPrize
                ? 'linear-gradient(135deg,rgba(234,179,8,0.14),rgba(245,158,11,0.07))'
                : 'rgba(255,255,255,0.04)',
              border: inPrize ? '1px solid rgba(234,179,8,0.30)' : '1px solid rgba(255,255,255,0.07)'
            }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: inPrize ? 'rgba(234,179,8,0.18)' : 'rgba(99,102,241,0.14)' }}>
                {inPrize
                  ? <Crown size={16} className="text-yellow-400" />
                  : <Star size={16} className="text-indigo-400" />}
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Your Rank</p>
                <div className="flex items-center gap-2">
                  <p className="text-base font-black text-white leading-none">
                    {me.rank ? '#' + me.rank : 'Not ranked'}
                  </p>
                  {inPrize && (
                    <span className="text-[9px] font-black text-emerald-300 px-2 py-0.5 rounded-full"
                      style={{ background:'rgba(52,211,153,0.12)' }}>
                      In Prize Zone ✓
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Ads Watched</p>
              <p className="text-xl font-black text-white leading-none">{me.ads_watched || 0}</p>
            </div>
          </div>
        </div>

        {/* WATCH AD CTA */}
        <div className="flex-shrink-0 px-4 mb-4">
          <motion.button
            onClick={handleWatch}
            disabled={watching}
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-2xl flex items-center justify-center gap-3 font-black text-sm uppercase tracking-wide disabled:opacity-50 relative overflow-hidden"
            style={{ padding:'15px 24px', color:'#000',
              background:'linear-gradient(135deg,#eab308,#f59e0b,#d97706)',
              boxShadow:'0 6px 28px rgba(234,179,8,0.38)' }}>
            <motion.div
              animate={{ x: ['-120%', '220%'] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'linear', repeatDelay: 1 }}
              style={{ position:'absolute', inset:0, width:'40%', skewX:'-12deg',
                background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)' }} />
            {watching
              ? <><RefreshCw size={18} className="animate-spin" /><span>Loading Sponsor Video...</span></>
              : <><Play size={18} fill="currentColor" /><span>Watch Ad and Climb Rank</span></>}
          </motion.button>
        </div>

        {/* TABS */}
        <div className="flex-shrink-0 px-4 mb-3">
          <div className="flex rounded-xl p-1 gap-1"
            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
            {[{ id:'leaderboard', label:'🏆 Leaderboard' }, { id:'prizes', label:'💎 Prize Pool' }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 py-2 rounded-lg text-xs font-black transition-all"
                style={{
                  background: tab === t.id ? 'rgba(234,179,8,0.14)' : 'transparent',
                  color: tab === t.id ? '#fbbf24' : 'rgba(255,255,255,0.35)',
                  border: tab === t.id ? '1px solid rgba(234,179,8,0.28)' : '1px solid transparent'
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-4 pb-10 hide-scrollbar">

          {tab === 'leaderboard' && (
            <div>
              <div className="flex justify-between items-center mb-3 px-0.5">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Top 30 This Week</span>
                <button onClick={fetchData} className="flex items-center gap-1 text-[10px] font-bold text-indigo-400">
                  <RefreshCw size={10} /> Refresh
                </button>
              </div>

              {loading ? (
                <div className="py-16 flex flex-col items-center gap-3">
                  <motion.div animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Trophy size={28} className="text-yellow-400/30" />
                  </motion.div>
                  <span className="text-xs text-white/25 font-bold">Loading leaderboard...</span>
                </div>
              ) : lb.length === 0 ? (
                <div className="py-14 rounded-2xl text-center"
                  style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <Trophy size={32} className="text-yellow-400/25 mx-auto mb-3" />
                  <p className="text-sm font-black text-white/40">No entries yet!</p>
                  <p className="text-xs text-white/25 mt-1">Watch an ad to claim #1 spot</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lb.map((item, i) => {
                    const isMe = String(item.telegram_id) === String(user?.telegram_id);
                    const top3 = item.rank <= 3;
                    const name = item.username
                      ? '@' + item.username.slice(0, 4) + '***'
                      : item.first_name ? item.first_name.slice(0, 7) + '***' : 'Miner';
                    return (
                      <motion.div key={item.rank}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.04, 0.4) }}
                        className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
                        style={{
                          background: isMe
                            ? 'linear-gradient(135deg,rgba(99,102,241,0.16),rgba(139,92,246,0.10))'
                            : top3 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.025)',
                          border: isMe
                            ? '1px solid rgba(99,102,241,0.35)'
                            : top3 ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(255,255,255,0.05)'
                        }}>
                        <div className="w-8 flex items-center justify-center shrink-0">
                          <RankIcon rank={item.rank} />
                        </div>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-black text-white"
                          style={{ background: top3 ? 'rgba(234,179,8,0.18)' : 'rgba(255,255,255,0.06)' }}>
                          {(name[0] || '?').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white truncate">{name}</span>
                            {isMe && (
                              <span className="text-[9px] font-black bg-indigo-500 text-white px-1.5 rounded-full shrink-0">YOU</span>
                            )}
                          </div>
                          <span className="text-[10px] text-white/35 font-medium">{item.ads_watched} ads</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-yellow-400">💎 {item.prize_gram}</p>
                          <p className="text-[9px] text-indigo-400 font-bold">+{Number(item.prize_tasky).toLocaleString()}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'prizes' && (
            <div className="space-y-3">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">Total Pool · 3.5 GRAM</p>
              {TIERS.map((tier, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="rounded-2xl p-4 flex items-center justify-between"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid ' + tier.col + '28',
                    boxShadow: i < 3 ? '0 0 18px ' + tier.glow : 'none'
                  }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{tier.label}</span>
                    <div>
                      <p className="text-xs font-black" style={{ color: tier.col }}>Rank {tier.rank}</p>
                      <p className="text-[10px] text-white/35 font-medium mt-0.5">+{tier.tasky} TASKY</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black" style={{ color: tier.col }}>💎 {tier.gram}</p>
                    <p className="text-[10px] text-white/35 font-medium">GRAM</p>
                  </div>
                </motion.div>
              ))}

              <div className="rounded-2xl p-4 mt-2 space-y-3"
                style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-wider">How it Works</p>
                {[
                  { n:'1', t:'Watch Ads', d:'Tap the Watch Ad button to log views for this tournament.' },
                  { n:'2', t:'Climb the Ranks', d:'Every ad you watch pushes you higher in real time.' },
                  { n:'3', t:'Win GRAM Prizes', d:'Finish Top 30 when the 7-day timer ends to win GRAM.' },
                ].map(s => (
                  <div key={s.n} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-black text-white/60"
                      style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.09)' }}>
                      {s.n}
                    </div>
                    <div>
                      <p className="text-xs font-black text-white">{s.t}</p>
                      <p className="text-[11px] text-white/35 mt-0.5 leading-snug">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  );
}

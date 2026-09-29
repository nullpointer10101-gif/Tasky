import React, { useState, useEffect, useCallback } from 'react';
import { X, Play, RefreshCw, Zap, Trophy, Flame, Award, Sparkles, ShieldCheck, UserPlus, Share2, Copy, Check } from 'lucide-react';
import { getCampaignTournament, startWatchCampaignAd, recordCampaignAd } from '../api';
import { showRewardedAd } from '../adUtils';
import { useToast } from '../App';

function pad(n) { return String(n).padStart(2, '0'); }

const REFERRAL_PRIZE_MAP = [
  { max: 1,  gram: 1.50, tasky: 30000, label: '🥇 1st Place' },
  { max: 2,  gram: 0.75, tasky: 15000, label: '🥈 2nd Place' },
  { max: 3,  gram: 0.40, tasky: 8000,  label: '🥉 3rd Place' },
  { max: 10, gram: 0.15, tasky: 3000,  label: '🏅 Top 10' },
  { max: 20, gram: 0.08, tasky: 1500,  label: '⭐ Top 20' },
];

const AD_PRIZE_MAP = [
  { max: 1,  gram: 1.00, tasky: 20000, label: '🥇 1st Place' },
  { max: 2,  gram: 0.50, tasky: 10000, label: '🥈 2nd Place' },
  { max: 3,  gram: 0.30, tasky: 5000,  label: '🥉 3rd Place' },
  { max: 10, gram: 0.10, tasky: 2000,  label: '🏅 Top 10' },
  { max: 30, gram: 0.05, tasky: 1000,  label: '⭐ Top 30' },
];

function nextTier(rank, isReferral = true) {
  if (!rank || rank <= 1) return null;
  const list = isReferral ? REFERRAL_PRIZE_MAP : AD_PRIZE_MAP;
  if (rank <= 3)  return { targetRank: rank - 1, ...list.find(p => p.max >= rank - 1) };
  if (rank <= 10) return { targetRank: 3, gram: isReferral ? 0.40 : 0.30, tasky: isReferral ? 8000 : 5000 };
  if (rank <= 20) return { targetRank: 10, gram: isReferral ? 0.15 : 0.10, tasky: isReferral ? 3000 : 2000 };
  return { targetRank: 20, gram: isReferral ? 0.08 : 0.05, tasky: isReferral ? 1500 : 1000 };
}

/**
 * Sticky Floating Side Button widget for 1-tap Campaign access anywhere on the screen
 */
export function WeeklyAdTournamentFloatingBubble({ user, onOpen }) {
  return (
    <div
      className="fixed z-40 flex flex-col items-end gap-1.5 pointer-events-auto select-none"
      style={{ bottom: '92px', right: '14px' }}
    >
      {/* Top Floating Reward Pill */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black text-white whitespace-nowrap shadow-2xl backdrop-blur-md border border-amber-400/40"
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.95) 0%, rgba(217, 119, 6, 0.95) 100%)',
          boxShadow: '0 4px 15px rgba(245, 158, 11, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
        }}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
        <span className="tracking-wide">🔥 1.50 GRAM</span>
      </div>

      {/* Luxury Animated Championship Orb Button */}
      <button
        onClick={onOpen}
        className="group relative flex items-center justify-center p-[2px] rounded-2xl cursor-pointer shadow-2xl active:scale-90 transition-all duration-300"
        style={{
          width: '56px',
          height: '56px',
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #ec4899, #8b5cf6, #3b82f6)',
          boxShadow: '0 0 25px rgba(251, 191, 36, 0.45), 0 8px 20px rgba(0, 0, 0, 0.6)'
        }}
      >
        {/* Animated Rotating Gradient Glow */}
        <div
          className="absolute inset-0 rounded-2xl opacity-75 blur-[3px] group-hover:opacity-100 transition-opacity"
          style={{
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #8b5cf6, #06b6d4)',
            animation: 'spin 4s linear infinite'
          }}
        />

        {/* Inner Dark Crystal Surface */}
        <div
          className="relative w-full h-full rounded-[14px] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #161b2e 0%, #0a0d18 100%)',
            border: '1px solid rgba(255, 255, 255, 0.12)'
          }}
        >
          {/* Glass Gloss Highlight */}
          <div
            className="absolute top-0 inset-x-0 h-1/2 opacity-30 pointer-events-none rounded-t-[14px]"
            style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%)'
            }}
          />

          <div className="relative flex flex-col items-center justify-center">
            <span className="text-[24px] leading-none select-none drop-shadow-[0_2px_8px_rgba(251,191,36,0.8)] transform group-hover:scale-110 transition-transform">
              👑
            </span>
            <span
              className="text-[7.5px] font-black tracking-widest text-amber-300 uppercase mt-0.5 font-mono leading-none"
              style={{
                textShadow: '0 0 6px rgba(251, 191, 36, 0.8)'
              }}
            >
              20-DAY
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}

// Helper for high-dopamine colorful avatar without `@` initial
function getAvatarDetails(row) {
  const cleanUsername = row.username ? row.username.replace(/^@+/, '') : '';
  const cleanFirstName = row.first_name || '';
  
  let initial = 'M';
  if (cleanUsername.length > 0) {
    initial = cleanUsername.charAt(0).toUpperCase();
  } else if (cleanFirstName.length > 0) {
    initial = cleanFirstName.charAt(0).toUpperCase();
  }
  
  const rank = row.rank;
  if (rank === 1) {
    return {
      initial,
      gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
      border: '2px solid #fbbf24',
      boxShadow: '0 0 16px rgba(251, 191, 36, 0.8)',
      badge: '👑'
    };
  }
  if (rank === 2) {
    return {
      initial,
      gradient: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 50%, #64748b 100%)',
      border: '2px solid #e2e8f0',
      boxShadow: '0 0 12px rgba(226, 232, 240, 0.6)',
      badge: '🥈'
    };
  }
  if (rank === 3) {
    return {
      initial,
      gradient: 'linear-gradient(135deg, #f97316 0%, #d97706 50%, #78350f 100%)',
      border: '2px solid #f97316',
      boxShadow: '0 0 12px rgba(249, 115, 22, 0.6)',
      badge: '🥉'
    };
  }

  const palettes = [
    'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
    'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  ];
  const paletteIdx = (rank || 4) % palettes.length;

  return {
    initial,
    gradient: palettes[paletteIdx],
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: 'none',
    badge: null
  };
}

export default function WeeklyAdTournamentModal({ isOpen, onClose, user }) {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [watching, setWatching] = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [tl,       setTl]       = useState({ d:0,h:0,m:0,s:0 });
  const { showToast } = useToast() || {};

  useEffect(() => {
    if (!data?.tournament?.time_left_ms) return;
    const end = Date.now() + data.tournament.time_left_ms;
    const t = setInterval(() => {
      const diff = Math.max(0, end - Date.now());
      setTl({ d:Math.floor(diff/86400000), h:Math.floor((diff%86400000)/3600000), m:Math.floor((diff%3600000)/60000), s:Math.floor((diff%60000)/1000) });
    }, 1000);
    return () => clearInterval(t);
  }, [data?.tournament?.time_left_ms]);

  const load = useCallback(async () => {
    if (!user?.telegram_id) return;
    setLoading(true);
    const { data: r } = await getCampaignTournament(user.telegram_id);
    if (r?.success) setData(r);
    setLoading(false);
  }, [user?.telegram_id]);

  useEffect(() => { if (isOpen) load(); }, [isOpen, load]);

  const isEnded = Boolean(
    data?.tournament?.status === 'ended_pending_admin_payout' ||
    data?.tournament?.status === 'completed' ||
    (data?.tournament?.time_left_ms !== undefined && data.tournament.time_left_ms <= 0) ||
    (data && tl.d === 0 && tl.h === 0 && tl.m === 0 && tl.s === 0 && data?.tournament?.time_left_ms !== undefined)
  );

  const isReferral = data?.tournament?.tournament_type === 'referral' || data?.tournament?.title?.toLowerCase()?.includes('referral');
  const maxWinners = data?.tournament?.winners_count || (isReferral ? 20 : 30);

  const inviteLink = `https://t.me/TaskyAppbot/app?startapp=${user?.referral_code || user?.telegram_id}`;

  const handleShare = () => {
    const text = `🚀 Join me on Tasky! Complete 1 quick task to earn free TON and GRAM tokens daily! 💎`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(tgUrl);
    } else {
      window.open(tgUrl, '_blank');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      showToast?.('📋 Referral Link Copied! Send it to friends to climb ranks!', 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const watchAd = async () => {
    if (watching || isEnded) return;
    setWatching(true);
    try {
      const startRes = await startWatchCampaignAd(user?.telegram_id, 'adexium').catch(() => null);
      const sessionToken = startRes?.data?.session_token || null;

      const r = await showRewardedAd('adexium');
      if (r.success) {
        const res = await recordCampaignAd(user?.telegram_id, r.network || 'gigapub', sessionToken);
        if (res?.data?.success) {
          showToast?.('🔥 +1 Ad counted! Rank updating...', 'success');
          load();
        } else {
          showToast?.(res?.data?.error || 'Ad verification failed. Must watch for at least 10 seconds!', 'error');
        }
      } else {
        showToast?.(r.error || 'Must watch the ad for at least 10 seconds!', 'error');
      }
    } catch (err) {
      showToast?.(err?.response?.data?.error || 'Try again!', 'error');
    } finally {
      setWatching(false);
    }
  };

  if (!isOpen) return null;

  const lb = data?.leaderboard || [];
  const me = data?.user_stats || {};
  const inPrize = me.rank && me.rank <= maxWinners;
  const next = nextTier(me.rank, isReferral);
  const myScore = me.score !== undefined ? me.score : (me.ads_watched || 0);

  const nextLbEntry = lb[me.rank - 2];
  const nextScore = nextLbEntry ? (nextLbEntry.score !== undefined ? nextLbEntry.score : nextLbEntry.ads_watched) : 0;
  const toOvercome = nextLbEntry ? Math.max(0, nextScore - myScore + 1) : 0;
  const progressPct = nextLbEntry ? Math.min(100, Math.max(8, Math.round((myScore / Math.max(1, nextScore + 1)) * 100))) : (me.rank === 1 ? 100 : 50);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: '#06091c',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: "'Inter',-apple-system,sans-serif",
    }}>

      {/* BG gradient burst */}
      <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 300, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse, rgba(251,191,36,0.20) 0%, transparent 70%)' }} />

      <style>{`
        @keyframes trophy-bob { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-5px) scale(1.05)} }
        @keyframes live-blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes gold-glow  { 0%,100%{box-shadow:0 0 22px rgba(251,191,36,0.6),0 4px 20px rgba(251,191,36,0.4)} 50%{box-shadow:0 0 45px rgba(251,191,36,0.95),0 4px 35px rgba(251,191,36,0.7)} }
        @keyframes spin-icon  { to{transform:rotate(360deg)} }
        @keyframes bar-glow   { 0%,100%{box-shadow:0 0 10px rgba(245,158,11,0.6)} 50%{box-shadow:0 0 20px rgba(245,158,11,0.9)} }
        .lb-scroll::-webkit-scrollbar{display:none}
        .lb-scroll{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ flexShrink:0, display:'flex', alignItems:'center',
        justifyContent:'space-between', padding:'16px 16px 0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{
            fontSize:9, fontWeight:900,
            color: isEnded ? '#fbbf24' : '#ef4444',
            textTransform:'uppercase',
            letterSpacing:'0.15em',
            animation: isEnded ? 'none' : 'live-blink 1.4s ease-in-out infinite',
            background: isEnded ? 'rgba(251,191,36,0.18)' : 'rgba(239,68,68,0.14)',
            border: isEnded ? '1px solid rgba(251,191,36,0.45)' : '1px solid rgba(239,68,68,0.3)',
            borderRadius:20, padding:'3px 8px'
          }}>
            {isEnded ? '● SEASON CONCLUDED' : '● LIVE SEASON'}
          </span>
          <span style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.4)',
            textTransform:'uppercase', letterSpacing:'0.1em' }}>
            {isReferral ? '20-Day Referral Championship' : 'Ad Championship'}
          </span>
        </div>
        <button onClick={onClose} style={{ width:34, height:34, borderRadius:'50%',
          background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', color:'rgba(255,255,255,0.45)', flexShrink:0 }}>
          <X size={15}/>
        </button>
      </div>

      {/* ── TROPHY HERO & DOPAMINE PRIZE PODIUM ── */}
      <div style={{ flexShrink:0, textAlign:'center', padding:'8px 14px 10px',
        borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:8 }}>
          <div style={{ fontSize:34, lineHeight:1, animation:'trophy-bob 3s ease-in-out infinite',
            filter:'drop-shadow(0 0 18px rgba(251,191,36,0.95))' }}>🏆</div>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em' }}>
              {isEnded ? 'Championship Status' : 'Season Ends In (20 Days)'}
            </div>
            {isEnded ? (
              <div style={{ fontSize:13, fontWeight:900, color:'#fbbf24', letterSpacing:'0.02em' }}>
                ⏳ Ended • Checking &amp; Processing All Payments
              </div>
            ) : (
              <div style={{ fontSize:15, fontWeight:900, color:'#fff', letterSpacing:'0.02em', fontFamily:'monospace' }}>
                ⏳ {pad(tl.d)}d {pad(tl.h)}h {pad(tl.m)}m {pad(tl.s)}s
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Qualification Explainer Banner */}
        {isReferral && !isEnded && (
          <div style={{
            margin:'4px 0 8px', padding:'8px 12px', borderRadius:12,
            background:'rgba(6, 182, 212, 0.12)', border:'1px solid rgba(6, 182, 212, 0.35)',
            textAlign:'left', display:'flex', alignItems:'center', gap:8
          }}>
            <Sparkles size={16} color="#38bdf8" style={{ flexShrink:0 }} />
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.9)', lineHeight:1.35 }}>
              <strong>Referral Rule:</strong> Newly invited friends must complete at least <strong>1 task</strong> in the mini app to count!
            </div>
          </div>
        )}

        {/* High-Dopamine Top 3 Prize Podium Cards */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {/* 1st Place Champion */}
          <div style={{ flex:1.1, padding:'9px 6px', borderRadius:14,
            background:'linear-gradient(135deg, rgba(251,191,36,0.28) 0%, rgba(217,119,6,0.12) 100%)',
            border:'1.5px solid #fbbf24', textAlign:'center', boxShadow:'0 0 16px rgba(251,191,36,0.35)', position:'relative' }}>
            <div style={{ fontSize:10, fontWeight:900, color:'#fbbf24', textTransform:'uppercase', letterSpacing:'0.04em' }}>🥇 1ST PLACE</div>
            <div style={{ fontSize:14, fontWeight:900, color:'#fff', marginTop:2, letterSpacing:'-0.01em' }}>
              {isReferral ? '1.50 GRAM' : '1.00 GRAM'}
            </div>
            <div style={{ fontSize:9, fontWeight:900, color:'#a855f7', marginTop:2, background:'rgba(168,85,247,0.2)', borderRadius:10, padding:'1px 4px', border:'1px solid rgba(168,85,247,0.4)' }}>
              {isReferral ? '+30,000 TASKY' : '+20,000 TASKY'}
            </div>
          </div>

          {/* 2nd Place Runner Up */}
          <div style={{ flex:1, padding:'8px 5px', borderRadius:14,
            background:'linear-gradient(135deg, rgba(226,232,240,0.20) 0%, rgba(148,163,184,0.08) 100%)',
            border:'1.5px solid #cbd5e1', textAlign:'center', boxShadow:'0 0 10px rgba(203,213,225,0.2)' }}>
            <div style={{ fontSize:9, fontWeight:900, color:'#cbd5e1', textTransform:'uppercase' }}>🥈 2ND PLACE</div>
            <div style={{ fontSize:13, fontWeight:900, color:'#fff', marginTop:2 }}>
              {isReferral ? '0.75 GRAM' : '0.50 GRAM'}
            </div>
            <div style={{ fontSize:9, fontWeight:800, color:'#818cf8', marginTop:2 }}>
              {isReferral ? '+15,000 TASKY' : '+10,000 TASKY'}
            </div>
          </div>

          {/* 3rd Place Podium */}
          <div style={{ flex:1, padding:'8px 5px', borderRadius:14,
            background:'linear-gradient(135deg, rgba(245,158,11,0.20) 0%, rgba(180,83,9,0.08) 100%)',
            border:'1.5px solid #f59e0b', textAlign:'center', boxShadow:'0 0 10px rgba(245,158,11,0.2)' }}>
            <div style={{ fontSize:9, fontWeight:900, color:'#f59e0b', textTransform:'uppercase' }}>🥉 3RD PLACE</div>
            <div style={{ fontSize:13, fontWeight:900, color:'#fff', marginTop:2 }}>
              {isReferral ? '0.40 GRAM' : '0.30 GRAM'}
            </div>
            <div style={{ fontSize:9, fontWeight:800, color:'#818cf8', marginTop:2 }}>
              {isReferral ? '+8,000 TASKY' : '+5,000 TASKY'}
            </div>
          </div>
        </div>

        {/* All Prize Tiers Strip */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:8, fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.5)' }}>
          <span style={{ color:'#34d399' }}>🏅 Ranks 4–10: <b>{isReferral ? '0.15 GRAM + 3k' : '0.10 GRAM + 2k'}</b></span>
          <span>•</span>
          <span style={{ color:'#818cf8' }}>⭐ Ranks 11–{maxWinners}: <b>{isReferral ? '0.08 GRAM + 1.5k' : '0.05 GRAM + 1k'}</b></span>
        </div>
      </div>

      {/* ── MY STATS & VIVID PROGRESS ── */}
      <div style={{ flexShrink:0, display:'flex', gap:10, padding:'10px 14px 0' }}>
        {/* Rank card */}
        <div style={{ flex:1, borderRadius:16, padding:'12px 14px',
          background: inPrize
            ? 'linear-gradient(135deg,rgba(251,191,36,0.22),rgba(245,158,11,0.09))'
            : 'rgba(255,255,255,0.05)',
          border: inPrize ? '1px solid rgba(251,191,36,0.45)' : '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:3 }}>
            {isEnded ? 'Final Rank' : 'Your Rank'}
          </div>
          <div style={{ fontSize:34, fontWeight:900, color: inPrize ? '#fbbf24' : '#fff', lineHeight:1, letterSpacing:'-0.02em' }}>
            {me.rank ? '#'+me.rank : '—'}
          </div>
          {me.rank === 1 ? (
            <div style={{ fontSize:10, fontWeight:900, color:'#fbbf24', marginTop:4 }}>🏆 #1 CHAMPION</div>
          ) : me.rank <= 3 ? (
            <div style={{ fontSize:10, fontWeight:900, color:'#fbbf24', marginTop:4 }}>🥇 TOP 3 WINNER</div>
          ) : inPrize ? (
            <div style={{ fontSize:10, fontWeight:800, color:'#34d399', marginTop:4 }}>🎯 TOP {maxWinners} WINNER</div>
          ) : (
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', marginTop:4 }}>
              {isEnded ? 'Ended' : (isReferral ? 'Invite friends to rank' : 'Watch ads to rank')}
            </div>
          )}
        </div>

        {/* Score card */}
        <div style={{ flex:1, borderRadius:16, padding:'12px 14px',
          background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:3 }}>
            {isReferral ? 'Valid Referrals' : 'Ads Watched'}
          </div>
          <div style={{ fontSize:34, fontWeight:900, color:'#fff', lineHeight:1, letterSpacing:'-0.02em' }}>{myScore}</div>
          {me.estimated_gram > 0
            ? <div style={{ fontSize:10, fontWeight:800, color:'#fbbf24', marginTop:4 }}>💎 {me.estimated_gram} GRAM Prize</div>
            : <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', marginTop:4 }}>{isEnded ? 'Season concluded' : 'Start inviting!'}</div>}
        </div>
      </div>

      {/* Special Winner Banner if in Prize Zone & Tournament Ended */}
      {isEnded && inPrize && (
        <div style={{
          flexShrink:0, margin:'8px 14px 0', padding:'12px 14px', borderRadius:16,
          background:'linear-gradient(135deg, rgba(251,191,36,0.24) 0%, rgba(99,102,241,0.18) 100%)',
          border:'1.5px solid #fbbf24', boxShadow:'0 0 20px rgba(251,191,36,0.35)', textAlign:'center'
        }}>
          <div style={{ fontSize:12, fontWeight:900, color:'#fbbf24', textTransform:'uppercase', letterSpacing:'0.04em' }}>
            🎯 YOU PLACED #{me.rank} OF TOP {maxWinners}!
          </div>
          <div style={{ fontSize:15, fontWeight:900, color:'#fff', marginTop:2 }}>
            💎 {me.estimated_gram} GRAM + {Number(me.estimated_tasky).toLocaleString()} TASKY
          </div>
          <div style={{ fontSize:10, fontWeight:800, color:'#fbbf24', marginTop:4, display:'inline-block', background:'rgba(251,191,36,0.15)', padding:'3px 10px', borderRadius:20, border:'1px solid rgba(251,191,36,0.3)' }}>
            ⏳ Payout Status: In Review
          </div>
        </div>
      )}

      {/* Progress Bar To Next Rank */}
      {!isEnded && me.rank > 1 && toOvercome > 0 && (
        <div style={{ flexShrink:0, margin:'8px 14px 0',
          background:'linear-gradient(135deg, rgba(99,102,241,0.14), rgba(168,85,247,0.10))',
          border:'1px solid rgba(168,85,247,0.35)',
          borderRadius:16, padding:'10px 14px', boxShadow:'0 0 15px rgba(99,102,241,0.15)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
            <span style={{ fontSize:11, fontWeight:900, color:'#fff', display:'flex', alignItems:'center', gap:5 }}>
              <Flame size={14} color="#f59e0b" fill="#f59e0b" />
              Overtake #{me.rank - 1}: <span style={{ color:'#fbbf24' }}>{toOvercome} more {isReferral ? 'valid referral' : 'ad'}{toOvercome > 1 ? 's' : ''}</span>
            </span>
            {next && (
              <span style={{ fontSize:10, fontWeight:900, color:'#a855f7', background:'rgba(168,85,247,0.2)', padding:'2px 8px', borderRadius:20, border:'1px solid rgba(168,85,247,0.4)' }}>
                💎 {next.gram} GRAM Target
              </span>
            )}
          </div>
          <div style={{ height:8, background:'rgba(255,255,255,0.08)', borderRadius:99, overflow:'hidden', position:'relative' }}>
            <div style={{
              width: `${progressPct}%`,
              height: '100%',
              borderRadius: 99,
              background: 'linear-gradient(90deg, #f59e0b 0%, #ec4899 50%, #8b5cf6 100%)',
              animation: 'bar-glow 2s ease-in-out infinite',
              transition: 'width 0.6s ease-out'
            }} />
          </div>
        </div>
      )}

      {/* ── ACTION BUTTON (Invite or Watch Ad) ── */}
      <div style={{ flexShrink:0, padding:'10px 14px 8px', display:'flex', gap:8 }}>
        {isEnded ? (
          <button onClick={() => {
            if (window.Telegram?.WebApp?.openTelegramLink) {
              window.Telegram.WebApp.openTelegramLink('https://t.me/TaskyPayouts');
            } else {
              window.open('https://t.me/TaskyPayouts', '_blank');
            }
          }} style={{
            flex:1, padding:'15px', borderRadius:18, border:'none', cursor:'pointer',
            fontSize:14, fontWeight:900, letterSpacing:'0.04em', textTransform:'uppercase',
            color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)',
            boxShadow: '0 0 20px rgba(124,58,237,0.5)',
          }}>
            📢 View Payouts Channel (@TaskyPayouts)
          </button>
        ) : isReferral ? (
          <>
            <button onClick={handleShare} style={{
              flex: 1.4, padding:'14px', borderRadius:18, border:'none', cursor:'pointer',
              fontSize:14, fontWeight:900, letterSpacing:'0.03em', textTransform:'uppercase',
              color:'#000', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              background: 'linear-gradient(135deg,#fde68a 0%,#fbbf24 50%,#d97706 100%)',
              animation: 'gold-glow 2s ease-in-out infinite',
            }}>
              <Share2 size={18} /> Invite Friends Now
            </button>
            <button onClick={handleCopyLink} style={{
              flex: 0.8, padding:'14px', borderRadius:18, border:'1px solid rgba(251,191,36,0.4)',
              cursor:'pointer', fontSize:13, fontWeight:900, color:'#fbbf24',
              background: 'rgba(251,191,36,0.12)', display:'flex', alignItems:'center',
              justifyContent:'center', gap:6
            }}>
              {copied ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </>
        ) : (
          <button onClick={watchAd} disabled={watching} style={{
            width:'100%', padding:'15px', borderRadius:18, border:'none', cursor:'pointer',
            fontSize:15, fontWeight:900, letterSpacing:'0.05em', textTransform:'uppercase',
            color:'#000', display:'flex', alignItems:'center', justifyContent:'center', gap:10,
            background: watching ? 'rgba(251,191,36,0.5)' : 'linear-gradient(135deg,#fde68a 0%,#fbbf24 50%,#d97706 100%)',
            animation: watching ? 'none' : 'gold-glow 2s ease-in-out infinite',
            opacity: watching ? 0.7 : 1, transition:'opacity 0.2s',
          }}>
            {watching
              ? <><RefreshCw size={18} style={{ animation:'spin-icon 1s linear infinite' }}/> Loading Ad...</>
              : <><Play size={18} fill="#000"/> Watch Ad — Climb Ranks</>}
          </button>
        )}
      </div>

      {/* ── EXCITING LEADERBOARD CARDS ── */}
      <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'2px 16px 6px' }}>
        <span style={{ fontSize:10, fontWeight:900, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.15em', display:'flex', alignItems:'center', gap:4 }}>
          {isEnded ? `👑 Top ${maxWinners} Standings` : `🏅 Top ${maxWinners} Championship Standings`}
        </span>
        <button onClick={load} style={{ fontSize:10, fontWeight:700, color:'#818cf8', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
          <RefreshCw size={10}/> Refresh
        </button>
      </div>

      <div className="lb-scroll" style={{ flex:1, overflowY:'auto', padding:'0 14px 32px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,0.2)', fontSize:13, fontWeight:700 }}>Loading championship...</div>
        ) : lb.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <div style={{ fontSize:32 }}>🚀</div>
            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:13, fontWeight:800, marginTop:8 }}>
              {isReferral ? 'Be the first to invite a friend & claim #1!' : 'Be the first to watch an ad!'}
            </div>
            {isReferral && (
              <div style={{ color:'rgba(255,255,255,0.25)', fontSize:11, marginTop:4 }}>
                Invited friends must complete 1 task to appear on the leaderboard.
              </div>
            )}
          </div>
        ) : lb.map((row) => {
          const isMe = String(row.telegram_id) === String(user?.telegram_id);
          const avatar = getAvatarDetails(row);

          const cleanUser = row.username ? '@' + row.username.replace(/^@+/, '') : (row.first_name || 'Champion');
          const displayName = cleanUser.length > 13 ? cleanUser.slice(0, 11) + '..' : cleanUser;

          let cardBg = 'rgba(255,255,255,0.025)';
          let cardBorder = '1px solid rgba(255,255,255,0.05)';
          let cardShadow = 'none';

          if (isMe) {
            cardBg = 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(99,102,241,0.15))';
            cardBorder = '1.5px solid #a855f7';
            cardShadow = '0 0 16px rgba(168,85,247,0.35)';
          } else if (row.rank === 1) {
            cardBg = 'linear-gradient(135deg, rgba(251,191,36,0.22), rgba(217,119,6,0.08))';
            cardBorder = '1.5px solid rgba(251,191,36,0.55)';
            cardShadow = '0 0 16px rgba(251,191,36,0.2)';
          } else if (row.rank === 2) {
            cardBg = 'linear-gradient(135deg, rgba(226,232,240,0.16), rgba(148,163,184,0.06))';
            cardBorder = '1.5px solid rgba(226,232,240,0.35)';
          } else if (row.rank === 3) {
            cardBg = 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(180,83,9,0.06))';
            cardBorder = '1.5px solid rgba(245,158,11,0.35)';
          }

          const rowScore = row.score !== undefined ? row.score : row.ads_watched;

          return (
            <div key={row.telegram_id} style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'10px 12px', borderRadius:16, marginBottom:8,
              background: cardBg, border: cardBorder, boxShadow: cardShadow
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                {/* Rank Badge */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize: row.rank <= 3 ? 16 : 12, fontWeight: 900,
                  color: row.rank === 1 ? '#fbbf24' : row.rank === 2 ? '#e2e8f0' : row.rank === 3 ? '#f59e0b' : '#94a3b8',
                  background: row.rank <= 3 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'
                }}>
                  {row.rank <= 3 ? (row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : '🥉') : `#${row.rank}`}
                </div>

                {/* Avatar */}
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight: 900, fontSize: 14, color: '#fff',
                  background: avatar.gradient, border: avatar.border, boxShadow: avatar.boxShadow,
                  position: 'relative'
                }}>
                  {avatar.initial}
                  {avatar.badge && (
                    <span style={{ position: 'absolute', top: -7, right: -6, fontSize: 12 }}>
                      {avatar.badge}
                    </span>
                  )}
                </div>

                {/* Name */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', display:'flex', alignItems:'center', gap:4 }}>
                    {displayName}
                    {isMe && <span style={{ fontSize: 9, background: '#a855f7', color: '#fff', padding: '1px 5px', borderRadius: 8, fontWeight: 900 }}>YOU</span>}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                    {rowScore} {isReferral ? 'valid refs' : 'ads'}
                  </div>
                </div>
              </div>

              {/* Prize Badge */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#fbbf24' }}>
                  {row.prize_gram} GRAM
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#a855f7' }}>
                  +{Number(row.prize_tasky).toLocaleString()} TASKY
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

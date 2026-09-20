import React, { useState, useEffect, useCallback } from 'react';
import { X, Play, RefreshCw, Zap, Trophy, Flame, Award, Sparkles, ShieldCheck } from 'lucide-react';
import { getCampaignTournament, startWatchCampaignAd, recordCampaignAd } from '../api';
import { showRewardedAd } from '../adUtils';
import { useToast } from '../App';

function pad(n) { return String(n).padStart(2, '0'); }

const PRIZE_MAP = [
  { max: 1,  gram: 1.00, tasky: 20000, label: '🥇 1st Place' },
  { max: 2,  gram: 0.50, tasky: 10000, label: '🥈 2nd Place' },
  { max: 3,  gram: 0.30, tasky: 5000,  label: '🥉 3rd Place' },
  { max: 10, gram: 0.10, tasky: 2000,  label: '🏅 Top 10' },
  { max: 30, gram: 0.05, tasky: 1000,  label: '⭐ Top 30' },
];

function nextTier(rank) {
  if (!rank || rank <= 1)  return null;
  if (rank <= 3)  return { targetRank: rank - 1, ...PRIZE_MAP.find(p => p.max >= rank - 1) };
  if (rank <= 10) return { targetRank: 3, gram: 0.30, tasky: 5000 };
  if (rank <= 30) return { targetRank: 10, gram: 0.10, tasky: 2000 };
  return { targetRank: 30, gram: 0.05, tasky: 1000 };
}

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

/**
 * Sticky Floating Side Button widget for 1-tap Campaign access anywhere on the screen
 */
export function WeeklyAdTournamentFloatingBubble({ user, onOpen }) {
  return (
    <div
      className="fixed z-40 flex flex-col items-end gap-1 pointer-events-auto"
      style={{ bottom: '95px', right: '14px' }}
    >
      {/* Live Badge Pill */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black text-black whitespace-nowrap shadow-xl border border-amber-300"
        style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #d97706 100%)',
          boxShadow: '0 0 12px rgba(251, 191, 36, 0.65)'
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
        🔥 1.00 GRAM
      </div>

      {/* Floating Trophy Champion Button */}
      <button
        onClick={onOpen}
        className="relative flex flex-col items-center justify-center overflow-hidden cursor-pointer shadow-2xl active:scale-90 transition-transform"
        style={{
          width: '58px',
          height: '58px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #311c03 0%, #150901 60%, #3e1b00 100%)',
          border: '2px solid #fbbf24',
          boxShadow: '0 0 22px rgba(251, 191, 36, 0.6), inset 0 0 12px rgba(251, 191, 36, 0.35)'
        }}
      >
        <span className="text-[22px] leading-none select-none mb-0.5" style={{ animation: 'trophy-bob 2.5s ease-in-out infinite' }}>🏆</span>
        <span className="text-[8px] font-black leading-none text-amber-300 uppercase tracking-tighter font-mono">CAMPAIGN</span>
      </button>
    </div>
  );
}

export default function WeeklyAdTournamentModal({ isOpen, onClose, user }) {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [watching, setWatching] = useState(false);
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

  const watchAd = async () => {
    if (watching) return;
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
          showToast?.(res?.data?.error || 'Ad verification failed. Must watch for at least 15 seconds!', 'error');
        }
      } else {
        showToast?.(r.error || 'Must watch the ad for at least 15 seconds!', 'error');
      }
    } catch (err) {
      showToast?.(err?.response?.data?.error || 'Try again!', 'error');
    } finally {
      setWatching(false);
    }
  };

  if (!isOpen) return null;

  const lb   = data?.leaderboard || [];
  const me   = data?.user_stats  || {};
  const inPrize = me.rank && me.rank <= 30;
  const next = nextTier(me.rank);
  const myAds = me.ads_watched || 0;

  // progress toward next tier
  const nextLbEntry = lb[me.rank - 2]; // person just above me
  const adsToOvercome = nextLbEntry ? Math.max(0, nextLbEntry.ads_watched - myAds + 1) : 0;
  const progressPct = nextLbEntry ? Math.min(100, Math.max(8, Math.round((myAds / Math.max(1, nextLbEntry.ads_watched + 1)) * 100))) : (me.rank === 1 ? 100 : 50);

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
        background: 'radial-gradient(ellipse, rgba(251,191,36,0.16) 0%, transparent 70%)' }} />

      <style>{`
        @keyframes trophy-bob { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-5px) scale(1.05)} }
        @keyframes live-blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes gold-glow  { 0%,100%{box-shadow:0 0 22px rgba(251,191,36,0.5),0 4px 20px rgba(251,191,36,0.3)} 50%{box-shadow:0 0 40px rgba(251,191,36,0.85),0 4px 32px rgba(251,191,36,0.6)} }
        @keyframes spin-icon  { to{transform:rotate(360deg)} }
        @keyframes bar-glow   { 0%,100%{box-shadow:0 0 10px rgba(245,158,11,0.6)} 50%{box-shadow:0 0 20px rgba(245,158,11,0.9)} }
        .lb-scroll::-webkit-scrollbar{display:none}
        .lb-scroll{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ flexShrink:0, display:'flex', alignItems:'center',
        justifyContent:'space-between', padding:'16px 16px 0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:9, fontWeight:900, color:'#ef4444', textTransform:'uppercase',
            letterSpacing:'0.15em', animation:'live-blink 1.4s ease-in-out infinite',
            background:'rgba(239,68,68,0.14)', border:'1px solid rgba(239,68,68,0.3)',
            borderRadius:20, padding:'3px 8px' }}>● LIVE</span>
          <span style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.4)',
            textTransform:'uppercase', letterSpacing:'0.1em' }}>Ad Championship</span>
        </div>
        <button onClick={onClose} style={{ width:34, height:34, borderRadius:'50%',
          background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', color:'rgba(255,255,255,0.45)', flexShrink:0 }}>
          <X size={15}/>
        </button>
      </div>

      {/* ── TROPHY HERO ── */}
      <div style={{ flexShrink:0, textAlign:'center', padding:'8px 14px 12px',
        borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:4 }}>
          <div style={{ fontSize:32, lineHeight:1, animation:'trophy-bob 3s ease-in-out infinite',
            filter:'drop-shadow(0 0 15px rgba(251,191,36,0.9))' }}>🏆</div>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Tournament Ends In</div>
            <div style={{ fontSize:15, fontWeight:900, color:'#fff', letterSpacing:'0.02em', fontFamily:'monospace' }}>
              ⏳ {pad(tl.d)}d {pad(tl.h)}h {pad(tl.m)}m {pad(tl.s)}s
            </div>
          </div>
        </div>

        {/* Top 3 Prize Cards Row */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
          <div style={{ flex:1, padding:'7px 4px', borderRadius:12,
            background:'linear-gradient(135deg,rgba(251,191,36,0.22),rgba(245,158,11,0.08))',
            border:'1px solid rgba(251,191,36,0.45)', textAlign:'center', boxShadow:'0 0 12px rgba(251,191,36,0.2)' }}>
            <div style={{ fontSize:9, fontWeight:900, color:'#fbbf24', textTransform:'uppercase' }}>🥇 1st Place</div>
            <div style={{ fontSize:13, fontWeight:900, color:'#fff', marginTop:1 }}>1.00 GRAM</div>
          </div>

          <div style={{ flex:1, padding:'7px 4px', borderRadius:12,
            background:'linear-gradient(135deg,rgba(203,213,225,0.18),rgba(148,163,184,0.06))',
            border:'1px solid rgba(203,213,225,0.3)', textAlign:'center' }}>
            <div style={{ fontSize:9, fontWeight:900, color:'#cbd5e1', textTransform:'uppercase' }}>🥈 2nd Place</div>
            <div style={{ fontSize:13, fontWeight:900, color:'#fff', marginTop:1 }}>0.50 GRAM</div>
          </div>

          <div style={{ flex:1, padding:'7px 4px', borderRadius:12,
            background:'linear-gradient(135deg,rgba(245,158,11,0.18),rgba(180,83,9,0.06))',
            border:'1px solid rgba(245,158,11,0.3)', textAlign:'center' }}>
            <div style={{ fontSize:9, fontWeight:900, color:'#f59e0b', textTransform:'uppercase' }}>🥉 3rd Place</div>
            <div style={{ fontSize:13, fontWeight:900, color:'#fff', marginTop:1 }}>0.30 GRAM</div>
          </div>
        </div>
      </div>

      {/* ── MY STATS & VIVID DOPAMINE PROGRESS ── */}
      <div style={{ flexShrink:0, display:'flex', gap:10, padding:'12px 14px 0' }}>
        {/* Rank card */}
        <div style={{ flex:1, borderRadius:16, padding:'13px 14px',
          background: inPrize
            ? 'linear-gradient(135deg,rgba(251,191,36,0.22),rgba(245,158,11,0.09))'
            : 'rgba(255,255,255,0.05)',
          border: inPrize ? '1px solid rgba(251,191,36,0.45)' : '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Your Rank</div>
          <div style={{ fontSize:36, fontWeight:900, color: inPrize ? '#fbbf24' : '#fff', lineHeight:1, letterSpacing:'-0.02em' }}>
            {me.rank ? '#'+me.rank : '—'}
          </div>
          {me.rank === 1 ? (
            <div style={{ fontSize:10, fontWeight:900, color:'#fbbf24', marginTop:4 }}>🏆 #1 CHAMPION</div>
          ) : me.rank <= 3 ? (
            <div style={{ fontSize:10, fontWeight:900, color:'#fbbf24', marginTop:4 }}>🥇 TOP 3 PRIZE ZONE</div>
          ) : inPrize ? (
            <div style={{ fontSize:10, fontWeight:800, color:'#34d399', marginTop:4 }}>🎯 TOP 30 PRIZE ZONE</div>
          ) : (
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', marginTop:4 }}>Watch ads to rank</div>
          )}
        </div>

        {/* Ads card */}
        <div style={{ flex:1, borderRadius:16, padding:'13px 14px',
          background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Ads This Week</div>
          <div style={{ fontSize:36, fontWeight:900, color:'#fff', lineHeight:1, letterSpacing:'-0.02em' }}>{myAds}</div>
          {me.estimated_gram > 0
            ? <div style={{ fontSize:10, fontWeight:800, color:'#fbbf24', marginTop:4 }}>💎 {me.estimated_gram} GRAM est.</div>
            : <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', marginTop:4 }}>Keep watching!</div>}
        </div>
      </div>

      {/* ── HIGH DOPAMINE PROGRESS BAR TO NEXT RANK ── */}
      {me.rank > 1 && adsToOvercome > 0 && (
        <div style={{ flexShrink:0, margin:'10px 14px 0',
          background:'linear-gradient(135deg, rgba(99,102,241,0.14), rgba(168,85,247,0.10))',
          border:'1px solid rgba(168,85,247,0.35)',
          borderRadius:16, padding:'11px 14px', boxShadow:'0 0 15px rgba(99,102,241,0.15)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontSize:11, fontWeight:900, color:'#fff', display:'flex', alignItems:'center', gap:5 }}>
              <Flame size={14} color="#f59e0b" fill="#f59e0b" />
              Overtake #{me.rank - 1}: <span style={{ color:'#fbbf24' }}>{adsToOvercome} more ad{adsToOvercome > 1 ? 's' : ''}</span>
            </span>
            {next && (
              <span style={{ fontSize:10, fontWeight:900, color:'#a855f7', background:'rgba(168,85,247,0.2)', padding:'2px 8px', borderRadius:20, border:'1px solid rgba(168,85,247,0.4)' }}>
                💎 {next.gram} GRAM Target
              </span>
            )}
          </div>
          {/* Glowing Animated Bar */}
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

      {/* ── WATCH AD BUTTON ── */}
      <div style={{ flexShrink:0, padding:'12px 14px 10px' }}>
        <button onClick={watchAd} disabled={watching} style={{
          width:'100%', padding:'16px', borderRadius:18, border:'none', cursor:'pointer',
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
      </div>

      {/* ── EXCITING LEADERBOARD CARDS ── */}
      <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 16px 8px' }}>
        <span style={{ fontSize:10, fontWeight:900, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.15em', display:'flex', alignItems:'center', gap:4 }}>
          🏅 Top 30 Championship Standings
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
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:13, fontWeight:700, marginTop:8 }}>Be the first to watch an ad!</div>
          </div>
        ) : lb.map((row, i) => {
          const isMe = String(row.telegram_id) === String(user?.telegram_id);
          const medal = MEDALS[row.rank];
          const name = row.username ? '@'+row.username.slice(0,6)+'**'
            : row.first_name ? row.first_name.slice(0,9)+'**' : 'Miner';

          // Vibrant styles for top 3 & current user
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

          return (
            <div key={row.rank} style={{
              display:'flex', alignItems:'center', gap:10, marginBottom:8,
              borderRadius:16, padding:'10px 12px',
              background: cardBg,
              border: cardBorder,
              boxShadow: cardShadow,
              transition: 'transform 0.15s ease'
            }}>
              {/* Rank Icon / Number */}
              <div style={{ width:28, textAlign:'center', flexShrink:0 }}>
                {medal
                  ? <span style={{ fontSize:20, lineHeight:1 }}>{medal}</span>
                  : <span style={{ fontSize:12, fontWeight:900, color:'rgba(255,255,255,0.4)' }}>#{row.rank}</span>}
              </div>

              {/* Avatar Initial */}
              <div style={{ width:34, height:34, borderRadius:12, flexShrink:0, display:'flex',
                alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:14, color:'#fff',
                background: row.rank === 1 ? 'linear-gradient(135deg,#fde68a,#d97706)'
                  : row.rank === 2 ? 'linear-gradient(135deg,#f1f5f9,#64748b)'
                  : row.rank === 3 ? 'linear-gradient(135deg,#fed7aa,#c2410c)'
                  : 'rgba(255,255,255,0.08)' }}>
                {(name[0]||'?').toUpperCase()}
              </div>

              {/* User Name & Ads Watched */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ fontSize:13, fontWeight:900, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
                  {isMe && <span style={{ fontSize:8, fontWeight:900, background:'#a855f7', color:'#fff', borderRadius:20, padding:'2px 6px', flexShrink:0 }}>YOU</span>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.4)', fontWeight:700 }}>🔥 {row.ads_watched} ads</span>
                  {row.rank <= 3 && (
                    <span style={{ fontSize:8, fontWeight:900, color: row.rank===1 ? '#fbbf24' : row.rank===2 ? '#cbd5e1' : '#f59e0b', textTransform:'uppercase' }}>
                      {row.rank===1 ? '• CHAMPION' : row.rank===2 ? '• RUNNER UP' : '• 3RD PODIUM'}
                    </span>
                  )}
                </div>
              </div>

              {/* Rewards */}
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:13, fontWeight:900, color:'#fbbf24' }}>💎 {row.prize_gram}G</div>
                <div style={{ fontSize:9, fontWeight:800, color:'#818cf8' }}>+{Number(row.prize_tasky).toLocaleString()} T</div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { X, Play, RefreshCw, Zap } from 'lucide-react';
import { getCampaignTournament, recordCampaignAd } from '../api';
import { showRewardedAd } from '../adUtils';
import { useToast } from '../App';

function pad(n) { return String(n).padStart(2, '0'); }

const PRIZE_MAP = [
  { max: 1,  gram: 1.00, tasky: 20000 },
  { max: 2,  gram: 0.50, tasky: 10000 },
  { max: 3,  gram: 0.30, tasky: 5000  },
  { max: 10, gram: 0.10, tasky: 2000  },
  { max: 30, gram: 0.05, tasky: 1000  },
];
function nextTier(rank) {
  if (!rank || rank <= 1)  return null;
  if (rank <= 3)  return { targetRank: rank - 1, ...PRIZE_MAP.find(p => p.max >= rank - 1) };
  if (rank <= 10) return { targetRank: 3, gram: 0.30, tasky: 5000 };
  if (rank <= 30) return { targetRank: 10, gram: 0.10, tasky: 2000 };
  return { targetRank: 30, gram: 0.05, tasky: 1000 };
}

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

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
      const r = await showRewardedAd('adexium');
      if (r.success) {
        const { data: rec } = await recordCampaignAd(user.telegram_id, r.network || 'gigapub');
        if (rec?.success) { showToast?.('🔥 +1 Ad counted! Rank updating...', 'success'); load(); }
      } else { showToast?.(r.error || 'Watch the full ad!', 'error'); }
    } catch { showToast?.('Try again!', 'error'); }
    finally { setWatching(false); }
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
        background: 'radial-gradient(ellipse, rgba(251,191,36,0.13) 0%, transparent 70%)' }} />

      <style>{`
        @keyframes trophy-bob { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-5px) scale(1.04)} }
        @keyframes live-blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes gold-glow  { 0%,100%{box-shadow:0 0 20px rgba(251,191,36,0.4),0 4px 20px rgba(251,191,36,0.3)} 50%{box-shadow:0 0 36px rgba(251,191,36,0.75),0 4px 32px rgba(251,191,36,0.55)} }
        @keyframes spin-icon  { to{transform:rotate(360deg)} }
        @keyframes bar-fill   { from{width:0%} to{width:var(--w)} }
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
      <div style={{ flexShrink:0, textAlign:'center', padding:'10px 20px 14px',
        borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize:48, lineHeight:1, animation:'trophy-bob 3s ease-in-out infinite',
          filter:'drop-shadow(0 0 20px rgba(251,191,36,0.9)) drop-shadow(0 0 40px rgba(251,191,36,0.4))' }}>
          🏆
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginTop:8 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em' }}>1st Prize</div>
            <div style={{ fontSize:28, fontWeight:900, color:'#fbbf24', lineHeight:1, letterSpacing:'-0.02em' }}>1.00 GRAM</div>
          </div>
          <div style={{ width:1, height:40, background:'rgba(255,255,255,0.1)' }}/>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Ends in</div>
            <div style={{ fontSize:16, fontWeight:900, color:'#fff', lineHeight:1, letterSpacing:'0.02em', fontFamily:'monospace' }}>
              {pad(tl.d)}d {pad(tl.h)}h {pad(tl.m)}m {pad(tl.s)}s
            </div>
          </div>
        </div>
      </div>

      {/* ── MY STATS ── */}
      <div style={{ flexShrink:0, display:'flex', gap:10, padding:'12px 14px 0' }}>
        {/* Rank card */}
        <div style={{ flex:1, borderRadius:16, padding:'13px 14px',
          background: inPrize
            ? 'linear-gradient(135deg,rgba(251,191,36,0.16),rgba(245,158,11,0.07))'
            : 'rgba(255,255,255,0.05)',
          border: inPrize ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Your Rank</div>
          <div style={{ fontSize:36, fontWeight:900, color: inPrize ? '#fbbf24' : '#fff', lineHeight:1, letterSpacing:'-0.02em' }}>
            {me.rank ? '#'+me.rank : '—'}
          </div>
          {inPrize
            ? <div style={{ fontSize:10, fontWeight:700, color:'#34d399', marginTop:4 }}>🎯 Prize zone!</div>
            : <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', marginTop:4 }}>Watch ads to rank</div>}
        </div>

        {/* Ads card */}
        <div style={{ flex:1, borderRadius:16, padding:'13px 14px',
          background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Ads This Week</div>
          <div style={{ fontSize:36, fontWeight:900, color:'#fff', lineHeight:1, letterSpacing:'-0.02em' }}>{myAds}</div>
          {me.estimated_gram > 0
            ? <div style={{ fontSize:10, fontWeight:700, color:'#fbbf24', marginTop:4 }}>💎 {me.estimated_gram} GRAM est.</div>
            : <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', marginTop:4 }}>Keep watching!</div>}
        </div>
      </div>

      {/* ── PROGRESS TO NEXT RANK ── */}
      {me.rank > 1 && adsToOvercome > 0 && (
        <div style={{ flexShrink:0, margin:'10px 14px 0',
          background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.20)',
          borderRadius:14, padding:'10px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.5)' }}>
              <Zap size={10} style={{ display:'inline', color:'#fbbf24', marginRight:4 }}/>
              {adsToOvercome} more ad{adsToOvercome > 1 ? 's' : ''} to climb to #{me.rank - 1}
            </span>
            {next && <span style={{ fontSize:10, fontWeight:800, color:'#818cf8' }}>💎 {next.gram} GRAM</span>}
          </div>
          <div style={{ height:5, background:'rgba(255,255,255,0.08)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ '--w': Math.min(100, (myAds / (myAds + adsToOvercome)) * 100) + '%',
              height:'100%', borderRadius:99, width:'var(--w)',
              background:'linear-gradient(90deg,#818cf8,#a78bfa)',
              animation:'bar-fill 0.8s ease-out forwards' }}/>
          </div>
        </div>
      )}

      {/* ── WATCH AD ── */}
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

      {/* ── LEADERBOARD ── */}
      <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 16px 8px' }}>
        <span style={{ fontSize:10, fontWeight:900, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.15em' }}>
          🏅 Top 30 Leaderboard
        </span>
        <button onClick={load} style={{ fontSize:10, fontWeight:700, color:'#818cf8', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
          <RefreshCw size={10}/> Refresh
        </button>
      </div>

      <div className="lb-scroll" style={{ flex:1, overflowY:'auto', padding:'0 14px 32px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,0.2)', fontSize:13, fontWeight:700 }}>Loading...</div>
        ) : lb.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <div style={{ fontSize:32 }}>🚀</div>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:13, fontWeight:700, marginTop:8 }}>Be the first to watch an ad!</div>
          </div>
        ) : lb.map((row, i) => {
          const isMe = String(row.telegram_id) === String(user?.telegram_id);
          const medal = MEDALS[row.rank];
          const name = row.username ? '@'+row.username.slice(0,5)+'**'
            : row.first_name ? row.first_name.slice(0,8)+'**' : 'Miner';
          return (
            <div key={row.rank} style={{
              display:'flex', alignItems:'center', gap:10, marginBottom:6,
              borderRadius:14, padding:'9px 12px',
              background: isMe
                ? 'linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.10))'
                : row.rank===1 ? 'rgba(251,191,36,0.07)'
                : row.rank<=3  ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.025)',
              border: isMe ? '1px solid rgba(99,102,241,0.35)'
                : row.rank<=3 ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ width:26, textAlign:'center', flexShrink:0 }}>
                {medal
                  ? <span style={{ fontSize:18, lineHeight:1 }}>{medal}</span>
                  : <span style={{ fontSize:11, fontWeight:900, color:'rgba(255,255,255,0.35)' }}>#{row.rank}</span>}
              </div>
              <div style={{ width:32, height:32, borderRadius:10, flexShrink:0, display:'flex',
                alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:13, color:'#fff',
                background: row.rank<=3 ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.07)' }}>
                {(name[0]||'?').toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ fontSize:12, fontWeight:800, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
                  {isMe && <span style={{ fontSize:8, fontWeight:900, background:'#4f46e5', color:'#fff', borderRadius:20, padding:'2px 6px', flexShrink:0 }}>YOU</span>}
                </div>
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)', fontWeight:600 }}>{row.ads_watched} ads</span>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:12, fontWeight:900, color:'#fbbf24' }}>💎 {row.prize_gram}G</div>
                <div style={{ fontSize:9, fontWeight:700, color:'#818cf8' }}>+{Number(row.prize_tasky).toLocaleString()}</div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

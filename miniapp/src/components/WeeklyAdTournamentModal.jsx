import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Play, RefreshCw, Zap, Crown } from 'lucide-react';
import { getCampaignTournament, recordCampaignAd } from '../api';
import { showRewardedAd } from '../adUtils';
import { useToast } from '../App';

function pad(n) { return String(n).padStart(2,'0'); }

const MEDALS = { 1:'🥇', 2:'🥈', 3:'🥉' };

export default function WeeklyAdTournamentModal({ isOpen, onClose, user }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [watching, setWatching] = useState(false);
  const [tl, setTl]           = useState({ d:0, h:0, m:0, s:0 });
  const { showToast }         = useToast() || {};

  /* ── countdown ── */
  useEffect(() => {
    if (!data?.tournament?.time_left_ms) return;
    const end = Date.now() + data.tournament.time_left_ms;
    const t = setInterval(() => {
      const diff = Math.max(0, end - Date.now());
      setTl({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000)  / 60000),
        s: Math.floor((diff % 60000)    / 1000),
      });
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
        if (rec?.success) { showToast?.('🔥 +1 ad counted!', 'success'); load(); }
      } else { showToast?.(r.error || 'Watch the full ad!', 'error'); }
    } catch { showToast?.('Try again!', 'error'); }
    finally { setWatching(false); }
  };

  if (!isOpen) return null;

  const lb  = data?.leaderboard || [];
  const me  = data?.user_stats  || {};
  const top = me.rank && me.rank <= 30;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity:0 }}
        animate={{ opacity:1 }}
        exit={{ opacity:0 }}
        style={{ position:'fixed', inset:0, zIndex:60,
          background:'rgba(4,3,15,0.96)', display:'flex', flexDirection:'column', overflow:'hidden' }}
      >

        {/* ── TOP BAR ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'18px 16px 10px', flexShrink:0 }}>
          <div>
            <p style={{ fontSize:10, fontWeight:900, letterSpacing:'0.15em',
              textTransform:'uppercase', color:'rgba(251,191,36,0.7)', margin:0 }}>
              7-Day Tournament
            </p>
            <p style={{ fontSize:20, fontWeight:900, color:'#fff', margin:0, lineHeight:1.2 }}>
              Ad Championship
            </p>
          </div>
          <button onClick={onClose}
            style={{ width:36, height:36, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.12)',
              background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center',
              justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.5)', flexShrink:0 }}>
            <X size={16} />
          </button>
        </div>

        {/* ── COUNTDOWN STRIP ── */}
        <div style={{ padding:'0 16px 12px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8,
            background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:14, padding:'10px 14px', justifyContent:'space-between' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)' }}>Ends in</span>
            <div style={{ display:'flex', gap:4, alignItems:'center' }}>
              {[{v:tl.d,l:'d'},{v:tl.h,l:'h'},{v:tl.m,l:'m'},{v:tl.s,l:'s'}].map(({v,l},i)=>(
                <React.Fragment key={l}>
                  {i>0 && <span style={{ color:'rgba(251,191,36,0.3)', fontSize:11, fontWeight:900 }}>:</span>}
                  <span style={{ background:'rgba(251,191,36,0.10)', border:'1px solid rgba(251,191,36,0.20)',
                    borderRadius:8, padding:'3px 7px', fontSize:12, fontWeight:900, color:'#fbbf24',
                    fontFamily:'monospace', minWidth:28, textAlign:'center' }}>
                    {pad(v)}{l}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* ── MY RANK CARD ── */}
        <div style={{ padding:'0 16px 12px', flexShrink:0 }}>
          <div style={{
            background: top
              ? 'linear-gradient(135deg,rgba(251,191,36,0.13),rgba(245,158,11,0.06))'
              : 'rgba(255,255,255,0.04)',
            border: top ? '1px solid rgba(251,191,36,0.28)' : '1px solid rgba(255,255,255,0.07)',
            borderRadius:16, padding:'14px 16px',
            display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:12, display:'flex',
                alignItems:'center', justifyContent:'center', flexShrink:0,
                background: top ? 'rgba(251,191,36,0.15)' : 'rgba(99,102,241,0.15)' }}>
                {top ? <Crown size={18} color="#fbbf24"/> : <Zap size={18} color="#818cf8"/>}
              </div>
              <div>
                <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)',
                  textTransform:'uppercase', letterSpacing:'0.1em', margin:0 }}>Your Rank</p>
                <p style={{ fontSize:22, fontWeight:900, color:'#fff', margin:0, lineHeight:1 }}>
                  {me.rank ? '#'+me.rank : '—'}
                  {top && <span style={{ fontSize:11, fontWeight:900, color:'#34d399',
                    background:'rgba(52,211,153,0.10)', borderRadius:20, padding:'2px 8px',
                    marginLeft:8 }}>Prize Zone ✓</span>}
                </p>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)',
                textTransform:'uppercase', letterSpacing:'0.1em', margin:0 }}>Ads</p>
              <p style={{ fontSize:28, fontWeight:900, color:'#fff', margin:0, lineHeight:1 }}>
                {me.ads_watched || 0}
              </p>
            </div>
          </div>
        </div>

        {/* ── LEADERBOARD (scrollable) ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'0 16px', WebkitOverflowScrolling:'touch' }}
          className="hide-scrollbar">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom:10 }}>
            <span style={{ fontSize:10, fontWeight:900, textTransform:'uppercase',
              letterSpacing:'0.15em', color:'rgba(255,255,255,0.3)' }}>Top 30</span>
            <button onClick={load}
              style={{ fontSize:10, fontWeight:700, color:'#818cf8', background:'none',
                border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
              <RefreshCw size={10}/> Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'rgba(255,255,255,0.25)',
              fontSize:13, fontWeight:700 }}>Loading...</div>
          ) : lb.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'rgba(255,255,255,0.25)',
              fontSize:13, fontWeight:700 }}>
              No entries yet — be first!
            </div>
          ) : lb.map((row, i) => {
            const isMe = String(row.telegram_id) === String(user?.telegram_id);
            const name = row.username
              ? '@' + row.username.slice(0,5) + '**'
              : row.first_name ? row.first_name.slice(0,8)+'**' : 'Miner';
            const medal = MEDALS[row.rank];
            return (
              <div key={row.rank} style={{
                display:'flex', alignItems:'center', gap:10, marginBottom:6,
                borderRadius:14, padding:'10px 12px',
                background: isMe
                  ? 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.08))'
                  : row.rank <= 3 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                border: isMe ? '1px solid rgba(99,102,241,0.3)'
                  : row.rank <= 3 ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
              }}>
                <span style={{ width:28, textAlign:'center', fontSize: medal ? 18 : 11,
                  fontWeight:900, color:'#fbbf24', flexShrink:0, lineHeight:1 }}>
                  {medal || '#'+row.rank}
                </span>
                <div style={{ width:32, height:32, borderRadius:10, flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:900, fontSize:13, color:'#fff',
                  background: row.rank<=3 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.06)' }}>
                  {(name[0]||'?').toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:12, fontWeight:800, color:'#fff',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
                    {isMe && <span style={{ fontSize:8, fontWeight:900, background:'#4f46e5',
                      color:'#fff', borderRadius:20, padding:'2px 6px', flexShrink:0 }}>YOU</span>}
                  </div>
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)', fontWeight:600 }}>
                    {row.ads_watched} ads
                  </span>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <p style={{ fontSize:12, fontWeight:900, color:'#fbbf24', margin:0 }}>
                    💎 {row.prize_gram}
                  </p>
                  <p style={{ fontSize:9, fontWeight:700, color:'#818cf8', margin:0 }}>
                    +{Number(row.prize_tasky).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
          <div style={{ height:100 }}/>
        </div>

        {/* ── STICKY WATCH AD BUTTON ── */}
        <div style={{ flexShrink:0, padding:'12px 16px 28px',
          background:'linear-gradient(to top,rgba(4,3,15,1) 60%,transparent)',
          position:'sticky', bottom:0 }}>
          <button onClick={watchAd} disabled={watching}
            style={{ width:'100%', padding:'17px 0', borderRadius:18,
              fontSize:15, fontWeight:900, letterSpacing:'0.05em',
              textTransform:'uppercase', color:'#000', border:'none', cursor:'pointer',
              background: watching ? 'rgba(251,191,36,0.5)' : 'linear-gradient(135deg,#fbbf24,#f59e0b)',
              boxShadow: watching ? 'none' : '0 0 0 0 rgba(251,191,36,0.5)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              animation: watching ? 'none' : 'pulse-btn 2s infinite',
              opacity: watching ? 0.7 : 1, transition:'all 0.2s' }}>
            {watching
              ? <><RefreshCw size={18} style={{ animation:'spin 1s linear infinite' }}/> Loading Ad...</>
              : <><Play size={18} fill="#000"/> Watch Ad — Climb the Board</>}
          </button>
        </div>

        <style>{`
          @keyframes pulse-btn {
            0%,100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.45); }
            50%      { box-shadow: 0 0 0 14px rgba(251,191,36,0); }
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>

      </motion.div>
    </AnimatePresence>
  );
}

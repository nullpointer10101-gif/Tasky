import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Play, RefreshCw } from 'lucide-react';
import { getCampaignTournament, recordCampaignAd } from '../api';
import { showRewardedAd } from '../adUtils';
import { useToast } from '../App';

function pad(n) { return String(n).padStart(2, '0'); }
const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 60,
    background: 'linear-gradient(180deg, #06091a 0%, #080614 100%)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  /* top hero */
  hero: {
    flexShrink: 0, textAlign: 'center', padding: '32px 20px 20px',
    background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(251,191,36,0.12) 0%, transparent 70%)',
  },
  trophy: {
    fontSize: 52, lineHeight: 1, display: 'block', marginBottom: 8,
    filter: 'drop-shadow(0 0 18px rgba(251,191,36,0.8))',
    animation: 'float 3s ease-in-out infinite',
  },
  title: { fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', margin: 0 },
  sub:   { fontSize: 12, fontWeight: 600, color: 'rgba(251,191,36,0.7)', margin: '4px 0 0', letterSpacing: '0.12em', textTransform: 'uppercase' },
  closeBtn: {
    position: 'absolute', top: 20, right: 16, width: 36, height: 36,
    borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
  },
  /* stat cards */
  statsRow: { display: 'flex', gap: 10, padding: '0 16px 14px', flexShrink: 0 },
  statCard: (highlight) => ({
    flex: 1, borderRadius: 16, padding: '14px 16px', textAlign: 'center',
    background: highlight
      ? 'linear-gradient(135deg, rgba(251,191,36,0.14) 0%, rgba(245,158,11,0.06) 100%)'
      : 'rgba(255,255,255,0.05)',
    border: highlight ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(255,255,255,0.08)',
    boxShadow: highlight ? '0 0 20px rgba(251,191,36,0.10)' : 'none',
  }),
  statLabel: { fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' },
  statValue: { fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1, margin: 0 },
  statSub:   { fontSize: 10, fontWeight: 700, color: 'rgba(52,211,153,1)', margin: '4px 0 0' },
  /* countdown */
  timerRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '0 16px 16px', flexShrink: 0,
  },
  timerCell: {
    background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)',
    borderRadius: 10, padding: '6px 10px', fontSize: 15, fontWeight: 900,
    color: '#fbbf24', fontFamily: 'monospace', minWidth: 40, textAlign: 'center',
  },
  timerDot: { fontSize: 14, fontWeight: 900, color: 'rgba(251,191,36,0.4)' },
  /* watch ad CTA */
  ctaWrap:  { padding: '0 16px 16px', flexShrink: 0 },
  ctaBtn: (loading) => ({
    width: '100%', padding: '17px 0', borderRadius: 18, border: 'none', cursor: 'pointer',
    fontSize: 15, fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase',
    color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    background: loading ? 'rgba(251,191,36,0.5)' : 'linear-gradient(135deg, #fde68a, #fbbf24, #d97706)',
    boxShadow: loading ? 'none' : '0 4px 24px rgba(251,191,36,0.45)',
    animation: loading ? 'none' : 'goldPulse 2s ease-in-out infinite',
    opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
  }),
  /* leaderboard */
  lbHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px 10px', flexShrink: 0,
  },
  lbTitle:   { fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em' },
  refreshBtn: { fontSize: 10, fontWeight: 700, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  lbScroll:  { flex: 1, overflowY: 'auto', padding: '0 16px 32px' },
  lbRow: (isMe, rank) => ({
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7,
    borderRadius: 14, padding: '10px 12px',
    background: isMe
      ? 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.10))'
      : rank === 1 ? 'rgba(251,191,36,0.07)'
      : rank === 2 ? 'rgba(192,192,192,0.06)'
      : rank === 3 ? 'rgba(205,127,50,0.07)'
      : 'rgba(255,255,255,0.03)',
    border: isMe
      ? '1px solid rgba(99,102,241,0.35)'
      : rank <= 3 ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(255,255,255,0.05)',
  }),
  lbRank:   { width: 28, textAlign: 'center', flexShrink: 0 },
  lbAvatar: (top3) => ({
    width: 34, height: 34, borderRadius: 10, flexShrink: 0, fontWeight: 900, fontSize: 14,
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: top3 ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.07)',
  }),
  lbName:  { fontSize: 12, fontWeight: 800, color: '#fff', flex: 1 },
  lbAds:   { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600 },
  lbPrize: { textAlign: 'right', flexShrink: 0 },
  lbGram:  { fontSize: 12, fontWeight: 900, color: '#fbbf24', margin: 0 },
  lbTasky: { fontSize: 9, fontWeight: 700, color: '#818cf8', margin: 0 },
  youBadge: {
    fontSize: 8, fontWeight: 900, background: '#4f46e5', color: '#fff',
    borderRadius: 20, padding: '2px 6px', marginLeft: 6,
  },
  empty: { textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 700 },
  css: `
    @keyframes float {
      0%,100% { transform: translateY(0px); }
      50%      { transform: translateY(-6px); }
    }
    @keyframes goldPulse {
      0%,100% { box-shadow: 0 4px 24px rgba(251,191,36,0.45); }
      50%      { box-shadow: 0 4px 36px rgba(251,191,36,0.75); }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .hide-lb::-webkit-scrollbar { display: none; }
    .hide-lb { -ms-overflow-style: none; scrollbar-width: none; }
  `,
};

export default function WeeklyAdTournamentModal({ isOpen, onClose, user }) {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [watching, setWatching] = useState(false);
  const [tl,       setTl]       = useState({ d:0, h:0, m:0, s:0 });
  const { showToast } = useToast() || {};

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
        if (rec?.success) { showToast?.('🔥 +1 counted! Rank updating...', 'success'); load(); }
      } else { showToast?.(r.error || 'Watch the full ad!', 'error'); }
    } catch { showToast?.('Try again!', 'error'); }
    finally { setWatching(false); }
  };

  if (!isOpen) return null;

  const lb   = data?.leaderboard || [];
  const me   = data?.user_stats  || {};
  const top  = me.rank && me.rank <= 30;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        style={S.overlay}
      >
        <style>{S.css}</style>

        {/* ── HERO ── */}
        <div style={{ ...S.hero, position: 'relative' }}>
          <button style={S.closeBtn} onClick={onClose}><X size={16}/></button>
          <span style={S.trophy}>🏆</span>
          <h1 style={S.title}>Ad Championship</h1>
          <p style={S.sub}>7-Day Tournament · Top 30 Win GRAM</p>
        </div>

        {/* ── STAT CARDS ── */}
        <div style={S.statsRow}>
          <div style={S.statCard(top)}>
            <p style={S.statLabel}>Your Rank</p>
            <p style={S.statValue}>{me.rank ? '#'+me.rank : '—'}</p>
            {top && <p style={S.statSub}>🎯 In prize zone!</p>}
          </div>
          <div style={S.statCard(false)}>
            <p style={S.statLabel}>Ads This Week</p>
            <p style={S.statValue}>{me.ads_watched || 0}</p>
            {me.estimated_gram > 0 && (
              <p style={{ ...S.statSub, color: '#fbbf24' }}>💎 {me.estimated_gram} GRAM est.</p>
            )}
          </div>
        </div>

        {/* ── COUNTDOWN ── */}
        <div style={S.timerRow}>
          {[{v:tl.d,l:'d'},{v:tl.h,l:'h'},{v:tl.m,l:'m'},{v:tl.s,l:'s'}].map(({v,l},i)=>(
            <React.Fragment key={l}>
              {i > 0 && <span style={S.timerDot}>:</span>}
              <span style={S.timerCell}>{pad(v)}{l}</span>
            </React.Fragment>
          ))}
        </div>

        {/* ── WATCH AD ── */}
        <div style={S.ctaWrap}>
          <button style={S.ctaBtn(watching)} onClick={watchAd} disabled={watching}>
            {watching
              ? <><RefreshCw size={18} style={{ animation:'spin 1s linear infinite' }}/> Loading Ad...</>
              : <><Play size={18} fill="#000"/> Watch Ad &amp; Earn Rank</>}
          </button>
        </div>

        {/* ── LEADERBOARD ── */}
        <div style={S.lbHeader}>
          <span style={S.lbTitle}>🏅 Leaderboard</span>
          <button style={S.refreshBtn} onClick={load}><RefreshCw size={10}/> Refresh</button>
        </div>

        <div style={S.lbScroll} className="hide-lb">
          {loading ? (
            <div style={S.empty}>Loading...</div>
          ) : lb.length === 0 ? (
            <div style={S.empty}>No entries yet — be first! 🚀</div>
          ) : lb.map((row, i) => {
            const isMe  = String(row.telegram_id) === String(user?.telegram_id);
            const top3  = row.rank <= 3;
            const medal = MEDAL[row.rank];
            const name  = row.username
              ? '@' + row.username.slice(0,5) + '**'
              : row.first_name ? row.first_name.slice(0,8)+'**' : 'Miner';
            return (
              <div key={row.rank} style={S.lbRow(isMe, row.rank)}>
                <div style={S.lbRank}>
                  {medal
                    ? <span style={{ fontSize:20, lineHeight:1 }}>{medal}</span>
                    : <span style={{ fontSize:11, fontWeight:900, color:'rgba(255,255,255,0.4)' }}>#{row.rank}</span>}
                </div>
                <div style={S.lbAvatar(top3)}>
                  {(name[0]||'?').toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center' }}>
                    <span style={S.lbName}>{name}</span>
                    {isMe && <span style={S.youBadge}>YOU</span>}
                  </div>
                  <span style={S.lbAds}>{row.ads_watched} ads watched</span>
                </div>
                <div style={S.lbPrize}>
                  <p style={S.lbGram}>💎 {row.prize_gram} G</p>
                  <p style={S.lbTasky}>+{Number(row.prize_tasky).toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>

      </motion.div>
    </AnimatePresence>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Tv, RefreshCw, Wifi, WifiOff, Trophy, Clock, Wallet, CheckCircle, AlertCircle, Zap, User, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

const ADS_GOAL = 60;

function timeSince(dateStr) {
  if (!dateStr) return '—';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
}

function getProgressColor(count) {
  const pct = (count / ADS_GOAL) * 100;
  if (pct >= 100) return { bar: 'bg-emerald-400', text: 'text-emerald-400', glow: 'shadow-emerald-500/40' };
  if (pct >= 80) return { bar: 'bg-amber-400', text: 'text-amber-400', glow: 'shadow-amber-500/40' };
  if (pct >= 50) return { bar: 'bg-blue-400', text: 'text-blue-400', glow: 'shadow-blue-500/40' };
  return { bar: 'bg-indigo-400', text: 'text-indigo-400', glow: 'shadow-indigo-500/20' };
}

function WatcherCard({ watcher, onRemind }) {
  const adsWatchedCount = Math.min(watcher.ads_watched, ADS_GOAL);
  const pct = Math.min((adsWatchedCount / ADS_GOAL) * 100, 100);
  const colors = getProgressColor(adsWatchedCount);
  const isNearGoal = adsWatchedCount >= 50 && adsWatchedCount < 60;
  const isComplete = adsWatchedCount >= 60;
  const displayName = watcher.username ? `@${watcher.username}` : watcher.first_name;

  return (
    <div className={`relative bg-surface-soft border rounded-2xl p-4 transition-all duration-300 overflow-hidden group
      ${isComplete ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/10' : 
        isNearGoal ? 'border-amber-500/40 shadow-lg shadow-amber-500/10' : 
        'border-border hover:border-indigo-500/30'}`}>

      {/* Glow bg */}
      {(isComplete || isNearGoal) && (
        <div className={`absolute inset-0 opacity-5 ${isComplete ? 'bg-emerald-400' : 'bg-amber-400'} rounded-2xl`} />
      )}

      {/* Status badge */}
      {watcher.claimed_today && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-emerald-500/15 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-500/25">
          <CheckCircle size={9} /> Claimed
        </div>
      )}
      {isComplete && !watcher.claimed_today && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-500/15 text-amber-400 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-amber-500/25 animate-pulse">
          <Zap size={9} /> Ready!
        </div>
      )}
      {isNearGoal && !watcher.claimed_today && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-blue-500/15 text-blue-400 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-blue-500/25">
          <AlertCircle size={9} /> Close
        </div>
      )}

      {/* User info */}
      <div className="flex items-center gap-3 mb-3 pr-16">
        <div className="relative shrink-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors.bar} bg-opacity-10 border border-current/20 ${colors.text}`}>
            <User size={16} />
          </div>
          {/* Yellow online dot */}
          {watcher.isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-yellow-400 border-2 border-surface-soft shadow-sm shadow-yellow-400/50" title="Online now" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-ink leading-tight truncate">{watcher.first_name}</p>
          <p className="text-[11px] text-ink-soft font-mono leading-tight truncate">{displayName}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className={`text-xs font-black ${colors.text}`}>{adsWatchedCount} / {ADS_GOAL} ads</span>
          <span className="text-[10px] text-ink-soft font-bold">{Math.round(pct)}%</span>
        </div>
        <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${colors.bar} ${isComplete || isNearGoal ? `shadow-sm ${colors.glow}` : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between mt-2.5 gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-[10px] text-ink-soft font-bold">
          <Clock size={10} />
          {timeSince(watcher.last_watch_time)}
        </div>
        <div className="flex items-center gap-2">
          {!watcher.claimed_today && watcher.ads_watched < 60 && (
            <button
              onClick={() => onRemind(watcher.telegram_id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20 transition-all"
              title="Send Reminder"
            >
              <Bell size={10} /> Remind
            </button>
          )}
          <div className={`flex items-center gap-1 text-[10px] font-bold ${watcher.has_wallet ? 'text-emerald-400' : 'text-red-400/70'}`}>
            <Wallet size={10} />
            {watcher.has_wallet ? 'Wallet ✓' : 'No Wallet'}
          </div>
        </div>
      </div>
    </div>
  );
}


export default function GramWatchers() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [filter, setFilter] = useState('all'); // all | near | ready | claimed

  const fetchWatchers = useCallback(async () => {
    try {
      const { data: res } = await api.get('/gram-watchers');
      setData(res);
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Failed to fetch gram watchers', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchers();
  }, [fetchWatchers]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(fetchWatchers, 15000);
    return () => clearInterval(interval);
  }, [isLive, fetchWatchers]);

  const filtered = (data?.watchers || []).filter(w => {
    if (filter === 'near') return w.ads_watched >= 50 && w.ads_watched < 60;
    if (filter === 'ready') return w.ads_watched >= 60 && !w.claimed_today;
    if (filter === 'claimed') return w.claimed_today;
    return true;
  });

  const stats = data ? {
    total: data.total,
    near: data.watchers.filter(w => w.ads_watched >= 50 && w.ads_watched < 60).length,
    ready: data.watchers.filter(w => w.ads_watched >= 60 && !w.claimed_today).length,
    claimed: data.watchers.filter(w => w.claimed_today).length,
  } : { total: 0, near: 0, ready: 0, claimed: 0 };

  const handleRemind = async (telegramId) => {
    try {
      const promise = api.post(`/send-gram-reminder/${telegramId}`);
      toast.promise(promise, {
        loading: 'Sending reminder...',
        success: 'Reminder sent successfully!',
        error: 'Failed to send reminder',
      });
      await promise;
    } catch (err) {
      console.error(err);
    }
  };

  const filterTabs = [
    { key: 'all', label: 'All', count: stats.total, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    { key: 'near', label: '⚡ Close (50+)', count: stats.near, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { key: 'ready', label: '🎯 Ready to Claim', count: stats.ready, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { key: 'claimed', label: '✅ Claimed', count: stats.claimed, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  ];

  if (loading) {
    return (
      <div className="p-4 md:p-10 h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse text-violet-400">
          <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
          <p className="font-black text-sm uppercase tracking-widest">Loading Gram Watchers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-ink flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Tv size={22} />
            </div>
            Gram Watchers
          </h1>
          <p className="text-ink-soft text-sm">Last 24h gram ad watchers — real-time progress to 60 ads</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {lastUpdated && (
            <span className="text-[10px] text-ink-soft font-mono hidden sm:block">
              Updated {timeSince(lastUpdated.toISOString())}
            </span>
          )}
          <button
            onClick={() => setIsLive(l => !l)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border transition-all duration-200
              ${isLive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20' : 
                'bg-surface-soft text-ink-soft border-border hover:border-indigo-500/30'}`}
          >
            {isLive ? <Wifi size={13} /> : <WifiOff size={13} />}
            {isLive ? 'LIVE' : 'PAUSED'}
          </button>
          <button
            onClick={fetchWatchers}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-surface-soft border border-border text-ink-soft hover:text-ink hover:border-indigo-500/30 transition-all duration-200"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* Live pulse indicator */}
      {isLive && (
        <div className="flex items-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 absolute" />
          <span className="text-[11px] text-emerald-400 font-black uppercase tracking-widest">Live — refreshing every 15s</span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Watchers', value: stats.total, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', icon: Tv },
          { label: 'Close (50+ ads)', value: stats.near, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: AlertCircle },
          { label: 'Ready to Claim', value: stats.ready, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Trophy },
          { label: 'Claimed Today', value: stats.claimed, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: CheckCircle },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} border ${s.border} rounded-2xl p-4 flex items-center gap-3`}>
            <div className={`w-9 h-9 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center ${s.color} shrink-0`}>
              <s.icon size={18} />
            </div>
            <div>
              <p className={`text-2xl font-black leading-none ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-ink-soft font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black border transition-all duration-200
              ${filter === tab.key ? tab.color : 'text-ink-soft bg-surface-soft border-border hover:border-indigo-500/20'}`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${filter === tab.key ? '' : 'bg-surface text-ink-soft'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Watchers grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-ink-soft">
          <Tv size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-black text-sm uppercase tracking-widest">No watchers found</p>
          <p className="text-xs mt-1">Nobody has watched gram ads today yet in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(watcher => (
            <WatcherCard key={watcher.telegram_id} watcher={watcher} onRemind={handleRemind} />
          ))}
        </div>
      )}

      {/* Footer */}
      {data && (
        <p className="text-center text-[10px] text-ink-soft font-mono mt-8 opacity-50">
          Showing {filtered.length} of {data.total} users · Data as of {new Date(data.asOf).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

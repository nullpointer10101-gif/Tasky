import React, { useState, useEffect } from 'react';
import { Activity, CheckSquare, Coins, Tv, UserCheck, Calendar, RotateCcw, ListChecks, Pickaxe, Wallet, Upload, Star, Users, Zap, Eye, Gift, Clock } from 'lucide-react';
import api from '../api';

// Maps action string to { icon, color, bg, border, label }
function getActionMeta(action) {
  if (!action) return { icon: Activity, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', label: 'Active' };

  const a = action.toLowerCase();

  if (a.includes('registered')) return { icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Registered' };
  if (a.includes('check-in') || a.includes('checkin') || a.includes('daily')) return { icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Daily Check-in' };
  if (a.includes('spin')) return { icon: RotateCcw, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', label: 'Spin Wheel' };
  if (a.includes('completed a task')) return { icon: CheckSquare, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', label: 'Completed Task' };
  if (a.includes('viewed tasks') || a.includes('/tasks')) return { icon: ListChecks, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', label: 'Viewed Tasks' };
  if (a.includes('mining start') || a.includes('started mining')) return { icon: Pickaxe, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'Started Mining' };
  if (a.includes('mining claim') || a.includes('claimed mining')) return { icon: Coins, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'Mining Reward' };
  if (a.includes('wallet') || a.includes('bound wallet')) return { icon: Wallet, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', label: 'Wallet Bound' };
  if (a.includes('gram ad') || a.includes('watch-ad') || a.includes('watched gram')) return { icon: Tv, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', label: 'Watched Gram Ad' };
  if (a.includes('gram claim') || a.includes('0.02 gram')) return { icon: Gift, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', label: 'Claimed GRAM' };
  if (a.includes('gram wallet') || a.includes('gram address')) return { icon: Wallet, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20', label: 'Updated GRAM Wallet' };
  if (a.includes('upload') || a.includes('proof')) return { icon: Upload, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Uploaded Proof' };
  if (a.includes('special offer') || a.includes('/offers')) return { icon: Star, color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Viewed Offers' };
  if (a.includes('/profile') || a.includes('/users/')) return { icon: Users, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', label: 'Viewed Profile' };
  if (a.includes('/leaderboard')) return { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'Leaderboard' };
  if (a.includes('visited') || a.startsWith('/')) return { icon: Eye, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', label: 'Browsed App' };

  return { icon: Activity, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', label: action };
}

export default function LiveActivity() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const { data } = await api.get('/stats');
      setLogs(data.recentLogsList || []);
    } catch (e) {
      console.error('Failed to load live logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Poll every 5s for real-time feel
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-ink mb-2 tracking-tight flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
          </span>
          Live User Activity Logs
        </h1>
        <p className="text-ink-soft text-sm">Real-time terminal stream showing active user events on the Telegram Mini App.</p>
      </div>

      <div className="bg-surface-soft border border-border rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col min-h-[600px]">
        {loading && logs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-ink-soft animate-pulse font-bold text-sm">
            Connecting to stream...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center py-12 text-ink-soft font-bold text-sm bg-surface rounded-2xl border border-border/50">
            Listening for incoming requests...
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto max-h-[700px] pr-2 custom-scrollbar">
            {logs.map((log, idx) => {
              const meta = getActionMeta(log.action);
              const IconComp = meta.icon;
              return (
                <div key={idx} className="bg-surface border border-border/60 hover:border-border transition-all rounded-2xl p-4 flex items-center gap-4 shadow-sm border-l-4 animate-in fade-in duration-200"
                  style={{ borderLeftColor: meta.color.replace('text-', '').includes('indigo') ? '#818cf8' : undefined }}
                >
                  {/* Action Icon */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.color} border ${meta.border}`}>
                    <IconComp size={18} />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-black text-ink leading-none">{log.first_name || 'User'}</span>
                      {log.username && log.username !== log.telegram_id && (
                        <span className="text-xs text-ink-soft font-mono">@{log.username}</span>
                      )}
                      <span className="text-[10px] text-ink-soft font-mono px-2 py-0.5 rounded bg-surface-soft border border-border">ID: {log.telegram_id}</span>
                    </div>
                    <p className={`text-xs font-bold mt-1 ${meta.color}`}>{log.action}</p>
                  </div>
                  {/* Time */}
                  <span className="text-[11px] text-ink-soft font-bold shrink-0 flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

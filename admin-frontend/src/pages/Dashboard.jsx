import React, { useState, useEffect } from 'react';
import {
  Users, CheckSquare, ArrowDownToLine, Coins, Activity, Tv,
  LogIn, Calendar, RotateCcw, ListChecks, Pickaxe, Wallet,
  Eye, Gift, Upload, Zap, Star, Image, UserCheck, UserPlus, Clock
} from 'lucide-react';
import api from '../api';

// Maps action string to { icon, color, label }
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

// Color coding for active user action badges
function getActionBadge(action) {
  const meta = getActionMeta(action);
  return meta;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(), 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/stats');
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  if (!stats) {
    return (
      <div className="p-4 md:p-10 h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse text-indigo-400">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
          <p className="font-bold text-ink tracking-widest uppercase text-sm">Loading Vault...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', shadow: 'shadow-blue-500/5' },
    { title: 'Active Users (5m)', value: stats.onlineUsers || 0, icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10', shadow: 'shadow-indigo-500/5' },
    { title: 'Circulating TASKY', value: stats.totalCirculatingTasky.toLocaleString(), icon: Coins, color: 'text-emerald-400', bg: 'bg-emerald-500/10', shadow: 'shadow-emerald-500/5' },
    { title: 'New Users Today', value: stats.newUsersToday ?? 0, icon: UserPlus, color: 'text-pink-400', bg: 'bg-pink-500/10', shadow: 'shadow-pink-500/5' },
  ];

  const gramAdCards = [
    { title: "Today's Gram Ads", value: stats.todayGramAds ?? 0, icon: Tv, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', shadow: 'shadow-violet-500/5', badge: 'TODAY' },
    { title: "Yesterday's Gram Ads", value: stats.yesterdayGramAds ?? 0, icon: Tv, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', shadow: 'shadow-fuchsia-500/5', badge: 'YESTERDAY' },
  ];

  return (
    <div className="p-4 md:p-10 pb-20 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-ink mb-2 tracking-tight">System Overview</h1>
        <p className="text-ink-soft text-sm md:text-base">Real-time statistics for the Tasky platform infrastructure.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className={`bg-surface-soft border border-border rounded-3xl p-6 flex flex-col justify-between shadow-xl ${stat.shadow} relative overflow-hidden group`}>
            <div className={`absolute -right-8 -top-8 w-32 h-32 ${stat.bg} rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500`}></div>
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color} backdrop-blur-md`}>
                <stat.icon size={28} />
              </div>
            </div>
            
            <div className="relative z-10">
              <p className="text-4xl font-black text-ink mb-1 tracking-tight">{stat.value}</p>
              <p className="text-sm font-bold text-ink-soft uppercase tracking-wider">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gram Ads Stats */}
      <div className="mt-6">
        <h2 className="text-lg font-black text-ink flex items-center gap-2 mb-4">
          <Tv className="text-violet-400" size={20} />
          Gram Ad Views
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {gramAdCards.map((card, i) => (
            <div key={i} className={`bg-surface-soft border ${card.border} rounded-3xl p-6 flex flex-col justify-between shadow-xl ${card.shadow} relative overflow-hidden group`}>
              <div className={`absolute -right-8 -top-8 w-32 h-32 ${card.bg} rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500`}></div>
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${card.bg} ${card.color} backdrop-blur-md`}>
                  <card.icon size={28} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${card.bg} ${card.color} border ${card.border}`}>
                  {card.badge}
                </span>
              </div>
              <div className="relative z-10">
                <p className={`text-4xl font-black mb-1 tracking-tight ${card.color}`}>{card.value.toLocaleString()}</p>
                <p className="text-sm font-bold text-ink-soft uppercase tracking-wider">{card.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Users Today */}
      <div className="mt-6">
        <h2 className="text-lg font-black text-ink flex items-center gap-2 mb-4">
          <UserPlus className="text-pink-400" size={20} />
          New Users (Last 24h)
          <span className="text-xs bg-pink-500/10 text-pink-400 font-bold px-2.5 py-1 rounded-full border border-pink-500/20 ml-1">
            {stats.newUsersToday ?? 0} joined
          </span>
        </h2>
        <div className="bg-surface-soft border border-border rounded-3xl p-4 shadow-xl">
          {!stats.newUsersList || stats.newUsersList.length === 0 ? (
            <div className="text-center py-8 text-ink-soft font-bold text-sm bg-surface rounded-2xl border border-border/50">
              No new users in the last 24 hours.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {stats.newUsersList.map((u, idx) => (
                <div key={idx} className="bg-surface border border-pink-500/10 hover:border-pink-500/30 transition-all rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-pink-500/10 text-pink-400 flex items-center justify-center border border-pink-500/20 shrink-0 text-sm font-black">
                    {(u.first_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink text-sm leading-tight truncate">{u.first_name || 'No Name'}</p>
                    <p className="text-[11px] text-ink-soft font-mono truncate">@{u.username || u.telegram_id}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <div className="flex items-center gap-1 text-[10px] text-pink-400/80 font-bold">
                      <Clock size={9} />
                      {new Date(u.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <p className="text-[9px] text-ink-soft font-bold">
                      {new Date(u.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Users & Live Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
        {/* Active Users List */}
        <div className="bg-surface-soft border border-border rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col max-h-[500px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-ink flex items-center gap-2">
              <Activity className="text-indigo-400 animate-pulse" size={20} />
              Active Users
            </h2>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 font-bold px-2.5 py-1 rounded-full border border-indigo-500/20">
              {stats.activeUsersList?.length || 0} Online
            </span>
          </div>

          <div className="overflow-y-auto space-y-2.5 flex-1 pr-1 custom-scrollbar">
            {!stats.activeUsersList || stats.activeUsersList.length === 0 ? (
              <div className="text-center py-12 text-ink-soft font-bold text-sm bg-surface rounded-2xl border border-border/50">
                No active users in the last 5 minutes.
              </div>
            ) : (
              stats.activeUsersList.map((user, idx) => {
                const meta = getActionBadge(user.lastAction);
                const IconComp = meta.icon;
                return (
                  <div key={idx} className="bg-surface border border-border/60 hover:border-indigo-500/30 transition-all rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0 text-sm font-black">
                      {(user.first_name || '?')[0].toUpperCase()}
                    </div>
                    {/* Name + handle */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink text-sm leading-tight truncate">{user.first_name || 'No Name'}</p>
                      <p className="text-[11px] text-ink-soft font-mono truncate">@{user.username || user.telegram_id}</p>
                    </div>
                    {/* Action badge */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-lg border ${meta.bg} ${meta.color} ${meta.border}`}>
                        <IconComp size={10} />
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-ink-soft font-bold">
                        {Math.max(0, Math.round((Date.now() - user.timestamp) / 1000))}s ago
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Live Activity Logs */}
        <div className="bg-surface-soft border border-border rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col max-h-[500px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-ink flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
              Live Activity
            </h2>
            <span className="text-[10px] text-emerald-400 font-black bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Real-time
            </span>
          </div>

          <div className="overflow-y-auto space-y-2 flex-1 pr-1 custom-scrollbar">
            {!stats.recentLogsList || stats.recentLogsList.length === 0 ? (
              <div className="text-center py-12 text-ink-soft font-bold text-sm bg-surface rounded-2xl border border-border/50">
                Listening for incoming requests...
              </div>
            ) : (
              stats.recentLogsList.map((log, idx) => {
                const meta = getActionMeta(log.action);
                const IconComp = meta.icon;
                return (
                  <div key={idx} className={`bg-surface border border-border/60 rounded-2xl p-3 flex items-center gap-3 shadow-sm border-l-2`}
                    style={{ borderLeftColor: meta.color.replace('text-', '').includes('indigo') ? '#818cf8' : undefined }}
                  >
                    {/* Action Icon */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.color} border ${meta.border}`}>
                      <IconComp size={14} />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-ink leading-none">{log.first_name || 'User'}</span>
                        {log.username && log.username !== log.telegram_id && (
                          <span className="text-[10px] text-ink-soft font-mono">@{log.username}</span>
                        )}
                      </div>
                      <p className={`text-[11px] font-bold mt-0.5 ${meta.color}`}>{meta.label}</p>
                    </div>
                    {/* Time */}
                    <span className="text-[9px] text-ink-soft font-bold shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

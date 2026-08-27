import React, { useState, useEffect } from 'react';
import { Users, CheckSquare, ArrowDownToLine, Coins, Activity, Tv } from 'lucide-react';
import api from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(), 10000); // Auto-refresh every 10 seconds
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className={`bg-surface-soft border border-border rounded-3xl p-6 flex flex-col justify-between shadow-xl ${stat.shadow} relative overflow-hidden group`}>
            {/* Background Glow */}
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

      {/* Active Users & Live Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
        {/* Active Users List */}
        <div className="bg-surface-soft border border-border rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col max-h-[500px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-ink flex items-center gap-2">
              <Activity className="text-indigo-400 animate-pulse" size={20} />
              Active Users (5M)
            </h2>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 font-bold px-2.5 py-1 rounded-full border border-indigo-500/20">
              {stats.activeUsersList?.length || 0} Online
            </span>
          </div>

          <div className="overflow-y-auto space-y-3 flex-1 pr-1 custom-scrollbar">
            {!stats.activeUsersList || stats.activeUsersList.length === 0 ? (
              <div className="text-center py-12 text-ink-soft font-bold text-sm bg-surface rounded-2xl border border-border/50">
                No active users in the last 5 minutes.
              </div>
            ) : (
              stats.activeUsersList.map((user, idx) => (
                <div key={idx} className="bg-surface border border-border/60 hover:border-indigo-500/30 transition-all rounded-2xl p-4 flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
                      <Users size={18} />
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-ink text-sm leading-tight">{user.first_name || 'No Name'}</p>
                      <p className="text-xs text-ink-soft font-mono truncate">@{user.username || user.telegram_id}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-lg mb-1 leading-none">
                      {user.lastAction}
                    </span>
                    <p className="text-[10px] text-ink-soft font-bold">
                      {Math.max(0, Math.round((Date.now() - user.timestamp) / 1000))}s ago
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Activity Logs */}
        <div className="bg-surface-soft border border-border rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col max-h-[500px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-ink flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
              Live Activity Feed
            </h2>
            <span className="text-[10px] text-ink-soft font-mono font-bold tracking-wider uppercase">
              Real-time Logs
            </span>
          </div>

          <div className="overflow-y-auto space-y-3 flex-1 pr-1 custom-scrollbar">
            {!stats.recentLogsList || stats.recentLogsList.length === 0 ? (
              <div className="text-center py-12 text-ink-soft font-bold text-sm bg-surface rounded-2xl border border-border/50">
                Listening for incoming requests...
              </div>
            ) : (
              stats.recentLogsList.map((log, idx) => (
                <div key={idx} className="bg-surface border border-border/60 rounded-2xl p-4 flex flex-col gap-1.5 shadow-sm border-l-2 border-l-emerald-500">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-ink leading-none">
                      {log.first_name || 'User'} <span className="text-ink-soft font-mono font-normal">(@{log.username})</span>
                    </span>
                    <span className="text-[9px] text-ink-soft font-bold">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 leading-none">
                    <span className="font-mono text-[10px] uppercase bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-400">LOG</span>
                    {log.action}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

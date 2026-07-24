import React, { useState, useEffect } from 'react';
import { Users, CheckSquare, ArrowDownToLine, Coins } from 'lucide-react';
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
    { title: 'Pending Tasks', value: stats.pendingTasks, icon: CheckSquare, color: 'text-orange-400', bg: 'bg-orange-500/10', shadow: 'shadow-orange-500/5' },
    { title: 'Pending Withdrawals', value: stats.pendingWithdrawals, icon: ArrowDownToLine, color: 'text-rose-400', bg: 'bg-rose-500/10', shadow: 'shadow-rose-500/5' },
    { title: 'Circulating TASKY', value: stats.totalCirculatingTasky.toLocaleString(), icon: Coins, color: 'text-emerald-400', bg: 'bg-emerald-500/10', shadow: 'shadow-emerald-500/5' },
  ];

  return (
    <div className="p-4 md:p-10 pb-20 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-ink mb-2 tracking-tight">System Overview</h1>
        <p className="text-ink-soft text-sm md:text-base">Real-time statistics for the Tasky platform infrastructure.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Users, CheckSquare, ArrowDownToLine, Coins } from 'lucide-react';
import api from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/stats');
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  if (!stats) return <div className="p-8 text-ink">Loading stats...</div>;

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { title: 'Pending Tasks', value: stats.pendingTasks, icon: CheckSquare, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { title: 'Pending Withdrawals', value: stats.pendingWithdrawals, icon: ArrowDownToLine, color: 'text-red-400', bg: 'bg-red-400/10' },
    { title: 'Circulating TASKY', value: stats.totalCirculatingTasky.toLocaleString(), icon: Coins, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-ink mb-2">Dashboard overview</h1>
        <p className="text-ink-soft">Real-time statistics for the Tasky platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-surface-soft border border-border rounded-3xl p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className={"w-12 h-12 rounded-xl flex items-center justify-center " + stat.bg + " " + stat.color}>
                <stat.icon size={24} />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-ink mb-1">{stat.value}</p>
              <p className="text-sm font-bold text-ink-faint">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

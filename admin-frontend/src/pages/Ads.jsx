import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlaySquare, TrendingUp, Calendar, Clock, Layers, Sparkles } from 'lucide-react';
import api from '../api';
import { format, parseISO } from 'date-fns';

const Ads = () => {
  const [data, setData] = useState({ stats: null, chart: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/ads/stats');
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch ad stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const stats = data.stats || {};

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-ink">Ad Statistics</h1>
        <p className="text-ink-soft mt-2">Monitor multi-provider ad performance (GigaPub & Monetag) and user engagement.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Top Overall Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={itemVariants}>
              <div className="bg-surface p-6 rounded-3xl h-full border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                    <PlaySquare size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink-soft mb-1 uppercase tracking-wider">Total Ads Watched</p>
                    <h3 className="text-3xl font-black text-ink">
                      {parseInt(stats.total_ads || 0).toLocaleString()}
                    </h3>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="bg-surface p-6 rounded-3xl h-full border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink-soft mb-1 uppercase tracking-wider">Ads Today</p>
                    <h3 className="text-3xl font-black text-ink">
                      {parseInt(stats.ads_today || 0).toLocaleString()}
                    </h3>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="bg-surface p-6 rounded-3xl h-full border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink-soft mb-1 uppercase tracking-wider">Ads Yesterday</p>
                    <h3 className="text-3xl font-black text-ink">
                      {parseInt(stats.ads_yesterday || 0).toLocaleString()}
                    </h3>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Provider Breakdown Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <div className="bg-surface p-6 rounded-3xl border border-indigo-500/20 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-500/15 text-indigo-400 rounded-xl">
                      <Layers size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-ink text-lg">GigaPub Network</h4>
                      <p className="text-xs text-ink-soft">30 daily cap per user</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-black uppercase rounded-full border border-indigo-500/20">
                    Provider 1
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-border/50">
                  <div>
                    <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">Today</p>
                    <p className="text-2xl font-black text-indigo-400 mt-0.5">
                      {parseInt(stats.gigapub_today || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">All-Time</p>
                    <p className="text-2xl font-black text-ink mt-0.5">
                      {parseInt(stats.gigapub_total || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="bg-surface p-6 rounded-3xl border border-amber-500/20 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/15 text-amber-400 rounded-xl">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-ink text-lg">Monetag Network</h4>
                      <p className="text-xs text-ink-soft">30 daily cap per user</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-black uppercase rounded-full border border-amber-500/20">
                    Provider 2
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-border/50">
                  <div>
                    <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">Today</p>
                    <p className="text-2xl font-black text-amber-400 mt-0.5">
                      {parseInt(stats.monetag_today || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">All-Time</p>
                    <p className="text-2xl font-black text-ink mt-0.5">
                      {parseInt(stats.monetag_total || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Chart Section */}
          <motion.div variants={itemVariants}>
            <div className="bg-surface p-6 rounded-3xl border border-border">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="text-indigo-500" size={20} />
                  <h3 className="text-lg font-bold text-ink">Last 7 Days Trend</h3>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-indigo-500"></span>
                    <span className="text-ink-soft">GigaPub</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-amber-400"></span>
                    <span className="text-ink-soft">Monetag</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-end gap-3 h-64 mt-4">
                {data.chart?.length > 0 ? (
                  data.chart.map((day, idx) => {
                    const totalDay = parseInt(day.count || 0);
                    const gigaCount = parseInt(day.gigapub_count || 0);
                    const monetagCount = parseInt(day.monetag_count || 0);
                    const maxCount = Math.max(...data.chart.map(d => parseInt(d.count || 0)));
                    const heightPercent = maxCount > 0 ? (totalDay / maxCount) * 100 : 0;
                    
                    const gigaPct = totalDay > 0 ? (gigaCount / totalDay) * 100 : 100;
                    const monetagPct = totalDay > 0 ? (monetagCount / totalDay) * 100 : 0;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-2 group relative">
                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity absolute -top-12 z-20 bg-surface-soft border border-border text-ink text-[11px] py-1.5 px-2.5 rounded-xl font-bold shadow-xl whitespace-nowrap">
                          <div>Total: <span className="text-indigo-400">{totalDay}</span></div>
                          <div className="text-[10px] text-ink-soft">G: {gigaCount} | M: {monetagCount}</div>
                        </div>

                        {/* Stacked bar */}
                        <div 
                          className="w-full rounded-t-lg overflow-hidden flex flex-col-reverse transition-all group-hover:brightness-110"
                          style={{ height: `${Math.max(6, heightPercent)}%` }}
                        >
                          <div 
                            className="w-full bg-indigo-500/80 transition-colors"
                            style={{ height: `${gigaPct}%` }}
                            title={`GigaPub: ${gigaCount}`}
                          />
                          <div 
                            className="w-full bg-amber-400 transition-colors"
                            style={{ height: `${monetagPct}%` }}
                            title={`Monetag: ${monetagCount}`}
                          />
                        </div>
                        <span className="text-xs font-bold text-ink-soft truncate w-full text-center">
                          {format(parseISO(day.date), 'MMM d')}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-soft text-sm font-medium">
                    No data available for the last 7 days.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Ads;

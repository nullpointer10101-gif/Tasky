import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlaySquare, TrendingUp, Calendar, Clock } from 'lucide-react';
import Card from '../components/Card';
import api from '../api';
import { format, parseISO } from 'date-fns';

const Ads = () => {
  const [data, setData] = useState({ stats: null, chart: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/admin/ads/stats');
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

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-ink">Ad Statistics</h1>
        <p className="text-ink-soft mt-2">Monitor ad performance and revenue indicators</p>
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
          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={itemVariants}>
              <Card className="h-full border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                    <PlaySquare size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink-soft mb-1 uppercase tracking-wider">Total Ads Watched</p>
                    <h3 className="text-3xl font-black text-ink">
                      {parseInt(data.stats?.total_ads || 0).toLocaleString()}
                    </h3>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="h-full border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink-soft mb-1 uppercase tracking-wider">Ads Today</p>
                    <h3 className="text-3xl font-black text-ink">
                      {parseInt(data.stats?.ads_today || 0).toLocaleString()}
                    </h3>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="h-full border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink-soft mb-1 uppercase tracking-wider">Ads Yesterday</p>
                    <h3 className="text-3xl font-black text-ink">
                      {parseInt(data.stats?.ads_yesterday || 0).toLocaleString()}
                    </h3>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Chart Section */}
          <motion.div variants={itemVariants}>
            <Card className="border border-border">
              <div className="flex items-center gap-2 mb-6">
                <Clock className="text-indigo-500" size={20} />
                <h3 className="text-lg font-bold text-ink">Last 7 Days</h3>
              </div>
              
              <div className="flex items-end gap-2 h-64 mt-4">
                {data.chart?.length > 0 ? (
                  data.chart.map((day, idx) => {
                    // Find max value to scale the bars
                    const maxCount = Math.max(...data.chart.map(d => parseInt(d.count)));
                    const heightPercent = maxCount > 0 ? (parseInt(day.count) / maxCount) * 100 : 0;
                    
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-2 group">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-ink text-surface text-xs py-1 px-2 rounded font-bold mb-1">
                          {day.count}
                        </div>
                        <div 
                          className="w-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors rounded-t-lg"
                          style={{ height: \`\${Math.max(5, heightPercent)}%\` }}
                        ></div>
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
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Ads;

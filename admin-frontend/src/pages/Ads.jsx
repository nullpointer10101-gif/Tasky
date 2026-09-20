import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlaySquare, TrendingUp, Calendar, Clock, Layers, Sparkles } from 'lucide-react';
import api from '../api';
import { format, parseISO } from 'date-fns';

function formatChartDate(dateStr) {
  if (!dateStr) return '';
  try {
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return format(d, 'MMM d');
      }
    }
    return format(parseISO(dateStr), 'MMM d');
  } catch (e) {
    return String(dateStr);
  }
}

const Ads = () => {
  const [data, setData] = useState({ stats: null, chart: [] });
  const [campaignTournaments, setCampaignTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);

  const fetchStatsAndCampaigns = async () => {
    try {
      setLoading(true);
      const [statsRes, campaignRes] = await Promise.all([
        api.get('/ads/stats').catch(() => ({ data: { stats: null, chart: [] } })),
        api.get('/campaign/admin/overview').catch(() => ({ data: { tournaments: [] } }))
      ]);
      if (statsRes.data) setData(statsRes.data);
      if (campaignRes.data?.tournaments) setCampaignTournaments(campaignRes.data.tournaments);
    } catch (error) {
      console.error('Failed to fetch ad/campaign stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsAndCampaigns();
  }, []);

  const handleApprovePayout = async (tournamentId, winner) => {
    const confirmPay = window.confirm(
      `Approve & Pay Rank #${winner.rank} (${winner.prize_gram} GRAM + ${winner.prize_tasky} TASKY) to ${winner.first_name} (ID: ${winner.telegram_id})?`
    );
    if (!confirmPay) return;

    setPayingId(`${tournamentId}-${winner.telegram_id}`);
    try {
      const res = await api.post('/campaign/admin/approve-payout', {
        tournament_id: tournamentId,
        telegram_id: winner.telegram_id,
        rank: winner.rank,
        admin_username: 'Admin'
      });
      if (res.data?.success) {
        alert(res.data.message || 'Payout successfully sent!');
        fetchStatsAndCampaigns();
      } else {
        alert(res.data?.error || 'Failed to process payout');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Error processing payout');
    } finally {
      setPayingId(null);
    }
  };

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
  const chartData = data.chart || [];
  const maxCount = Math.max(1, ...chartData.map(d => parseInt(d.count || 0, 10)));

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
                      <h4 className="font-black text-ink text-lg">Adexium Network</h4>
                      <p className="text-xs text-ink-soft">30 daily cap per user</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-black uppercase rounded-full border border-cyan-500/20">
                    Provider 1
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-border/50">
                  <div>
                    <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">Today</p>
                    <p className="text-2xl font-black text-cyan-400 mt-0.5">
                      {parseInt(stats.adexium_today || stats.monetag_today || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">All-Time</p>
                    <p className="text-2xl font-black text-ink mt-0.5">
                      {parseInt(stats.adexium_total || stats.monetag_total || 0).toLocaleString()}
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
                    <span className="w-3 h-3 rounded-sm bg-indigo-500 shadow-sm"></span>
                    <span className="text-ink-soft">GigaPub</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-cyan-400 shadow-sm"></span>
                    <span className="text-ink-soft">Adexium</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-stretch gap-3 h-72 mt-4 pt-6 pb-2 px-2">
                {chartData.length > 0 ? (
                  chartData.map((day, idx) => {
                    const totalDay = parseInt(day.count || 0, 10);
                    const gigaCount = parseInt(day.gigapub_count || 0, 10);
                    const monetagCount = parseInt(day.adexium_count || day.monetag_count || 0, 10);
                    const heightPercent = maxCount > 0 ? Math.round((totalDay / maxCount) * 100) : 0;
                    
                    const gigaPct = totalDay > 0 ? (gigaCount / totalDay) * 100 : 0;
                    const monetagPct = totalDay > 0 ? (monetagCount / totalDay) * 100 : 0;

                    return (
                      <div key={idx} className="h-full flex-1 flex flex-col justify-end items-center group relative">
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 absolute -top-14 z-30 bg-[#16122b] border border-indigo-500/30 text-white text-[11px] py-2 px-3 rounded-2xl font-bold shadow-2xl whitespace-nowrap backdrop-blur-md">
                          <div className="font-mono text-xs text-white flex items-center justify-between gap-3">
                            <span>{formatChartDate(day.date)}</span>
                            <span className="text-indigo-300 font-black">{totalDay.toLocaleString()} ads</span>
                          </div>
                          <div className="text-[10px] text-white/70 mt-1 flex items-center gap-3">
                            <span className="text-indigo-400">🟣 Giga: {gigaCount.toLocaleString()}</span>
                            <span className="text-cyan-300">🔵 Adexium: {monetagCount.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Total Count Label above bar */}
                        <span className="text-[11px] font-black font-mono text-ink-soft group-hover:text-indigo-400 transition-colors mb-1.5">
                          {totalDay > 0 ? (totalDay >= 1000 ? `${(totalDay / 1000).toFixed(1)}k` : totalDay) : '0'}
                        </span>

                        {/* Bar Track Container */}
                        <div className="w-full flex-1 flex items-end justify-center">
                          <div 
                            className="w-full max-w-[48px] rounded-t-xl overflow-hidden flex flex-col justify-end transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] border border-white/5 bg-white/5"
                            style={{ 
                              height: totalDay > 0 ? `${Math.max(10, heightPercent)}%` : '4px' 
                            }}
                          >
                            {totalDay > 0 ? (
                              <>
                                {/* Adexium (Top) */}
                                {monetagCount > 0 && (
                                  <div 
                                    className="w-full bg-gradient-to-t from-cyan-500 to-cyan-400 transition-all"
                                    style={{ height: `${monetagPct}%` }}
                                    title={`Adexium: ${monetagCount}`}
                                  />
                                )}
                                {/* GigaPub (Bottom) */}
                                {gigaCount > 0 && (
                                  <div 
                                    className="w-full bg-gradient-to-t from-indigo-600 to-indigo-500 transition-all"
                                    style={{ height: `${gigaPct}%` }}
                                    title={`GigaPub: ${gigaCount}`}
                                  />
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full bg-white/10" />
                            )}
                          </div>
                        </div>

                        {/* Day Label at bottom */}
                        <span className="text-xs font-bold text-ink-soft truncate w-full text-center mt-2 group-hover:text-ink transition-colors">
                          {formatChartDate(day.date)}
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

          {/* 7-DAY CHAMPIONSHIP ADMIN MANUAL PAYOUT MANAGER */}
          <motion.div variants={itemVariants}>
            <div className="bg-surface p-6 rounded-3xl border border-yellow-500/30 shadow-lg">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-2xl border border-yellow-500/20">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-ink flex items-center gap-2">
                      🏆 7-Day Ad Championship Payout Manager
                    </h3>
                    <p className="text-xs text-ink-soft">
                      Strict Manual Policy: Tournaments NEVER auto-pay. Inspect Top 30 user activity & approve payouts manually.
                    </p>
                  </div>
                </div>
              </div>

              {campaignTournaments.length > 0 ? (
                <div className="space-y-6">
                  {campaignTournaments.map((tournament) => (
                    <div key={tournament.id} className="bg-bg/50 p-5 rounded-2xl border border-border/80">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50 flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-white">{tournament.title}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                              tournament.status === 'active' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}>
                              {tournament.status === 'active' ? '🟢 Active Campaign' : '⏳ Ended — Pending Admin Review'}
                            </span>
                          </div>
                          <p className="text-xs text-ink-soft mt-1 font-mono">
                            Window: {formatChartDate(tournament.start_at)} — {formatChartDate(tournament.end_at)}
                          </p>
                        </div>
                      </div>

                      {/* Top 30 Winners Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-ink-soft uppercase font-bold border-b border-border/40 text-[10px]">
                              <th className="py-2 px-3">Rank</th>
                              <th className="py-2 px-3">User</th>
                              <th className="py-2 px-3">Telegram ID</th>
                              <th className="py-2 px-3">Wallet</th>
                              <th className="py-2 px-3 text-center">Ads Watched</th>
                              <th className="py-2 px-3">Prize</th>
                              <th className="py-2 px-3 text-right">Action / Payout</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {tournament.winners?.map((w) => {
                              const isPaid = w.payout_status === 'approved_and_paid';
                              const isPaying = payingId === `${tournament.id}-${w.telegram_id}`;

                              return (
                                <tr key={w.rank} className="hover:bg-white/5 transition-colors">
                                  <td className="py-2.5 px-3 font-black text-yellow-400">
                                    {w.rank === 1 ? '🥇 #1' : w.rank === 2 ? '🥈 #2' : w.rank === 3 ? '🥉 #3' : `#${w.rank}`}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-white">
                                    {w.first_name} {w.username ? `(@${w.username})` : ''}
                                    {w.is_banned && <span className="ml-1 text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">BANNED</span>}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-ink-soft">{w.telegram_id}</td>
                                  <td className="py-2.5 px-3 font-mono text-[11px] text-indigo-300">
                                    {w.wallet_address ? `${w.wallet_address.slice(0, 6)}...${w.wallet_address.slice(-4)}` : <span className="text-red-400/80">No Wallet</span>}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-center text-emerald-400">{w.ads_watched}</td>
                                  <td className="py-2.5 px-3 font-bold text-yellow-400">
                                    💎 {w.prize_gram} GRAM <span className="text-[10px] text-indigo-300 block">+{w.prize_tasky} TASKY</span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    {isPaid ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                        ✓ Approved & Paid
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleApprovePayout(tournament.id, w)}
                                        disabled={isPaying}
                                        className="px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black text-[11px] uppercase rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                                      >
                                        {isPaying ? 'Processing...' : 'Approve & Pay Winner 💎'}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-soft italic">No campaign tournaments found.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Ads;

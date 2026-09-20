import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Award, Zap, Play, X, Shield, Sparkles, RefreshCw, ChevronRight } from 'lucide-react';
import { getCampaignTournament, recordCampaignAd } from '../api';
import { showRewardedAd } from '../adUtils';
import { useToast } from '../App';

export default function WeeklyAdTournamentModal({ isOpen, onClose, user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watching, setWatching] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const { showToast } = useToast() || {};

  const fetchTournament = async () => {
    if (!user?.telegram_id) return;
    setLoading(true);
    const { data: res, error } = await getCampaignTournament(user.telegram_id);
    if (res && res.success) {
      setData(res);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && user?.telegram_id) {
      fetchTournament();
    }
  }, [isOpen, user?.telegram_id]);

  // Live timer countdown
  useEffect(() => {
    if (!data?.tournament?.time_left_ms) return;
    let end = Date.now() + data.tournament.time_left_ms;

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, end - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [data?.tournament?.time_left_ms]);

  const handleWatchAd = async () => {
    if (watching) return;
    setWatching(true);

    try {
      if (showToast) showToast("Launching Tournament Ad...", "info");
      const res = await showRewardedAd('adexium');

      if (res.success) {
        const { data: rec, error } = await recordCampaignAd(user.telegram_id, res.network || 'gigapub');
        if (rec && rec.success) {
          if (showToast) showToast("🎉 Tournament Ad Completed! Score updated!", "success");
          fetchTournament();
        } else {
          if (showToast) showToast(error || "Ad recorded!", "success");
          fetchTournament();
        }
      } else {
        if (showToast) showToast(res.error || "Ad was closed early. Watch the entire ad to climb ranks!", "error");
      }
    } catch (e) {
      console.error("[Tournament] Ad Watch Error:", e);
      if (showToast) showToast("Ad session error. Please tap again!", "error");
    } finally {
      setWatching(false);
    }
  };

  if (!isOpen) return null;

  const userStats = data?.user_stats || {};
  const leaderboard = data?.leaderboard || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg max-h-[90vh] bg-surface rounded-3xl border border-yellow-500/30 overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Top Banner & Header */}
          <div className="relative p-5 bg-gradient-to-b from-yellow-500/20 via-surface to-surface border-b border-white/10">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-ink-soft hover:text-white transition-colors z-10"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-500 to-amber-400 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                <Trophy size={24} className="text-black" />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest text-yellow-400 uppercase bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                  7-Day Ad Championship
                </span>
                <h2 className="text-xl font-black text-white tracking-tight">Top 30 GRAM Tournament</h2>
              </div>
            </div>

            {/* Countdown Timer */}
            <div className="mt-4 p-3 bg-black/40 rounded-2xl border border-yellow-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-yellow-400 animate-pulse" />
                <span className="text-xs font-bold text-ink-soft">Ends In:</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-yellow-400">
                <span className="bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20">{timeLeft.days}d</span>:
                <span className="bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20">{timeLeft.hours}h</span>:
                <span className="bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20">{timeLeft.minutes}m</span>:
                <span className="bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20">{timeLeft.seconds}s</span>
              </div>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 hide-scrollbar">
            {/* User Rank Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-yellow-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-yellow-400/80 uppercase tracking-wider">Your Live Rank</span>
                <div className="text-2xl font-black text-white flex items-center gap-2">
                  {userStats.rank ? `#${userStats.rank}` : 'Unranked'}
                  {userStats.rank && userStats.rank <= 30 && (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      In Prize Zone 💎
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-soft mt-0.5">
                  <strong className="text-yellow-400">{userStats.ads_watched || 0}</strong> Ads Watched This Week
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">Est. Prize</span>
                <div className="text-base font-black text-yellow-400">
                  {userStats.estimated_gram > 0 ? `💎 ${userStats.estimated_gram} GRAM` : '0 GRAM'}
                </div>
                {userStats.estimated_tasky > 0 && (
                  <div className="text-xs font-bold text-indigo-400">
                    +{userStats.estimated_tasky.toLocaleString()} TASKY
                  </div>
                )}
              </div>
            </div>

            {/* Direct Action Button to Watch Ad */}
            <button
              onClick={handleWatchAd}
              disabled={watching}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 hover:from-yellow-400 hover:to-amber-300 text-black font-black text-sm uppercase tracking-wide flex items-center justify-center gap-3 shadow-xl shadow-yellow-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {watching ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Loading Sponsor Video...</span>
                </>
              ) : (
                <>
                  <Play size={18} fill="currentColor" />
                  <span>Watch Campaign Ad & Climb Rank 🚀</span>
                </>
              )}
            </button>

            {/* Prize Pool Distribution Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-ink-soft px-1">
                <span>PRIZE TIERS (TOP 30)</span>
                <span className="text-yellow-400">Total Pool: 3.5 GRAM</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/30">
                  <div className="text-lg font-black text-yellow-400">🥇 1st</div>
                  <div className="font-bold text-white mt-1">1.00 GRAM</div>
                  <div className="text-[10px] text-indigo-400 font-bold">+20,000 TASKY</div>
                </div>
                <div className="p-3 bg-slate-400/10 rounded-2xl border border-slate-400/30">
                  <div className="text-lg font-black text-slate-300">🥈 2nd</div>
                  <div className="font-bold text-white mt-1">0.50 GRAM</div>
                  <div className="text-[10px] text-indigo-400 font-bold">+10,000 TASKY</div>
                </div>
                <div className="p-3 bg-amber-700/10 rounded-2xl border border-amber-700/30">
                  <div className="text-lg font-black text-amber-500">🥉 3rd</div>
                  <div className="font-bold text-white mt-1">0.30 GRAM</div>
                  <div className="text-[10px] text-indigo-400 font-bold">+5,000 TASKY</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
                <div className="p-2.5 bg-surface-soft rounded-xl border border-white/5 flex items-center justify-between px-3">
                  <span className="font-bold text-ink-soft">Ranks 4–10</span>
                  <span className="font-bold text-yellow-400">0.10 GRAM ea.</span>
                </div>
                <div className="p-2.5 bg-surface-soft rounded-xl border border-white/5 flex items-center justify-between px-3">
                  <span className="font-bold text-ink-soft">Ranks 11–30</span>
                  <span className="font-bold text-yellow-400">0.05 GRAM ea.</span>
                </div>
              </div>

              {/* Admin Verification & Payout Notice */}
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30 flex items-start gap-2 text-left">
                <Shield size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10.5px] text-amber-200/90 font-medium leading-tight">
                  <strong className="text-amber-300 font-bold">Admin Manual Review Policy:</strong> When the 7-day timer ends, Top 30 ad activity is verified for fair play. Prizes are reviewed & manually credited/paid by Admin to prevent auto-botting.
                </p>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-ink-soft px-1">
                <span>TOP 30 LEADERBOARD</span>
                <button onClick={fetchTournament} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px]">
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-ink-soft font-bold flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin text-yellow-400" />
                  <span>Loading Leaderboard...</span>
                </div>
              ) : leaderboard.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.map((item) => {
                    const isUser = String(item.telegram_id) === String(user?.telegram_id);
                    let rankBadge = `#${item.rank}`;
                    let bgClass = "bg-surface-soft border-white/5";

                    if (item.rank === 1) {
                      rankBadge = "🥇";
                      bgClass = "bg-yellow-500/10 border-yellow-500/30";
                    } else if (item.rank === 2) {
                      rankBadge = "🥈";
                      bgClass = "bg-slate-400/10 border-slate-400/30";
                    } else if (item.rank === 3) {
                      rankBadge = "🥉";
                      bgClass = "bg-amber-700/10 border-amber-700/30";
                    } else if (isUser) {
                      bgClass = "bg-indigo-600/20 border-indigo-500/40";
                    }

                    const displayName = item.username
                      ? `@${item.username.slice(0, 3)}***`
                      : item.first_name ? `${item.first_name.slice(0, 8)}***` : 'Miner';

                    return (
                      <div
                        key={item.rank}
                        className={`p-3 rounded-2xl border ${bgClass} flex items-center justify-between transition-all`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 text-center font-black text-sm text-yellow-400">{rankBadge}</span>
                          <div>
                            <div className="font-bold text-xs text-white flex items-center gap-1.5">
                              {displayName}
                              {isUser && <span className="text-[9px] bg-indigo-500 text-white font-black px-1.5 py-0.2 rounded-full">YOU</span>}
                            </div>
                            <span className="text-[10px] text-ink-soft font-medium">
                              {item.ads_watched} Ads Watched
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-yellow-400">💎 {item.prize_gram} GRAM</span>
                          <div className="text-[9px] text-indigo-400 font-bold">+{item.prize_tasky.toLocaleString()} TASKY</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-ink-soft bg-surface-soft rounded-2xl border border-white/5">
                  Tournament just started! Be the first to watch an ad and claim #1 Rank!
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

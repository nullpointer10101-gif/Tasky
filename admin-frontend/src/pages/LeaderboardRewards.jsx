import React, { useEffect, useState } from "react";
import api from "../api";
import toast from "react-hot-toast";
import {
  Trophy, Crown, Star, Coins, Gift,
  CheckCircle, AlertTriangle, Loader2, RefreshCw,
  Users, Zap, Megaphone, Wallet, ChevronDown, ChevronUp
} from "lucide-react";

const DEFAULT_REWARD_TIERS = [
  { rank: 1,  label: "🥇 1st Place",  reward: 100,   token: "USDT",  color: "#FFD700" },
  { rank: 2,  label: "🥈 2nd Place",  reward: 50,    token: "USDT",  color: "#C0C0C0" },
  { rank: 3,  label: "🥉 3rd Place",  reward: 20,    token: "USDT",  color: "#CD7F32" },
  { rank: 4,  label: "🏅 4th–10th",   reward: 50000, token: "TASKY", color: "#818cf8", rangeEnd: 10 },
  { rank: 11, label: "⭐ 11th–20th",  reward: 20000, token: "TASKY", color: "#38bdf8", rangeEnd: 20 },
  { rank: 21, label: "✨ 21st–30th",  reward: 10000, token: "TASKY", color: "#34d399", rangeEnd: 30 },
];

function getRankMeta(rank) {
  if (rank === 1) return { icon: "🥇", color: "#FFD700", bg: "rgba(255,215,0,0.08)" };
  if (rank === 2) return { icon: "🥈", color: "#C0C0C0", bg: "rgba(192,192,192,0.08)" };
  if (rank === 3) return { icon: "🥉", color: "#CD7F32", bg: "rgba(205,127,50,0.08)" };
  if (rank <= 10) return { icon: "🏅", color: "#818cf8", bg: "rgba(129,140,248,0.06)" };
  if (rank <= 20) return { icon: "⭐", color: "#38bdf8", bg: "rgba(56,189,248,0.06)" };
  return { icon: "✨", color: "#34d399", bg: "rgba(52,211,153,0.06)" };
}

function getTierForRank(rank) {
  for (const t of DEFAULT_REWARD_TIERS) {
    const end = t.rangeEnd || t.rank;
    if (rank >= t.rank && rank <= end) return t;
  }
  return null;
}

export default function LeaderboardRewards() {
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [announcing, setAnnouncing]   = useState(false);
  const [result, setResult]           = useState(null);
  const [tiers, setTiers]             = useState(DEFAULT_REWARD_TIERS);
  const [editingTier, setEditingTier] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [customMsg, setCustomMsg]     = useState("");

  useEffect(() => { fetchLeaderboard(); }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/leaderboard/detailed");
      setUsers(data.slice(0, 30));
    } catch {
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const handleDistribute = async () => {
    if (!window.confirm("This will credit TASKY balance rewards to the top " + users.length + " users and post a leaderboard announcement to the Tasky Payouts channel. Proceed?")) return;
    setDistributing(true);
    setResult(null);
    try {
      const payload = {
        tiers: tiers.map(t => ({ rankStart: t.rank, rankEnd: t.rangeEnd || t.rank, reward: t.reward, token: t.token })),
        customMessage: customMsg || null
      };
      const { data } = await api.post("/leaderboard/distribute-rewards", payload);
      setResult(data);
      toast.success("Rewards distributed to " + (data.rewarded || 0) + " users!");
      fetchLeaderboard();
    } catch (err) {
      toast.error(err.response?.data?.error || "Distribution failed");
    } finally {
      setDistributing(false);
    }
  };

  const handleAnnounce = async () => {
    setAnnouncing(true);
    try {
      const { data } = await api.post("/leaderboard/announce", {
        users: users.slice(0, 10),
        tiers,
        customMessage: customMsg || null
      });
      if (data.success) {
        toast.success("Leaderboard announcement posted to Tasky Payouts channel!");
        setPreviewText(data.previewText || "");
        setShowPreview(true);
      } else {
        toast.error(data.error || "Announce failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Announce failed");
    } finally {
      setAnnouncing(false);
    }
  };

  const totalTasky = users.reduce((sum, _, i) => {
    const t = getTierForRank(i + 1);
    return (!t || t.token !== "TASKY") ? sum : sum + t.reward;
  }, 0);

  return (
    <div className="min-h-screen bg-[#070a14] text-white p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
            <Trophy className="text-yellow-400" size={32} />
            Leaderboard Reward Distribution
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Distribute rewards to top 30 users &amp; broadcast to Tasky Payouts channel as strategic marketing
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchLeaderboard}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={handleAnnounce} disabled={announcing || users.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-500/20">
            {announcing ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
            Announce to Channel
          </button>
          <button onClick={handleDistribute} disabled={distributing || users.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 text-black text-sm font-black transition-all shadow-lg shadow-yellow-500/30">
            {distributing ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
            {distributing ? "Distributing…" : "Distribute Rewards"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Eligible Users", value: users.length, icon: Users, color: "text-sky-400" },
          { label: "TASKY Pool", value: totalTasky.toLocaleString(), icon: Coins, color: "text-purple-400" },
          { label: "USDT Pool", value: "170 USDT", icon: Wallet, color: "text-green-400" },
          { label: "Reward Tiers", value: tiers.length, icon: Star, color: "text-yellow-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <Icon className={color} size={22} />
            <div>
              <div className="text-xs text-slate-500 font-medium">{label}</div>
              <div className="text-lg font-black text-white">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard Table */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center gap-2">
            <Crown className="text-yellow-400" size={18} />
            <span className="font-bold text-white text-sm">Top 30 Leaderboard</span>
            <span className="ml-auto text-xs text-slate-500">{loading ? "Loading…" : users.length + " users"}</span>
          </div>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="animate-spin text-indigo-400" size={36} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase border-b border-slate-800">
                    <th className="py-3 px-4 text-left">Rank</th>
                    <th className="py-3 px-4 text-left">User</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                    <th className="py-3 px-4 text-right">Reward</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => {
                    const rank = i + 1;
                    const meta = getRankMeta(rank);
                    const tier = getTierForRank(rank);
                    return (
                      <tr key={u.telegram_id} style={{ background: meta.bg }}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <span className="text-lg">{meta.icon}</span>
                          <span className="ml-2 font-black text-xs" style={{ color: meta.color }}>#{rank}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white text-sm">
                            {u.username ? "@" + u.username : u.first_name || "Unknown"}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">{u.telegram_id}</div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-purple-300">{Number(u.balance || 0).toLocaleString()}</span>
                          <span className="text-xs text-slate-500 ml-1">TASKY</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {tier ? (
                            <span className="font-black text-sm" style={{ color: meta.color }}>
                              {tier.reward.toLocaleString()} {tier.token}
                            </span>
                          ) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {u.is_banned
                            ? <span className="text-xs bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full font-semibold">Banned</span>
                            : <span className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">Active</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Tier Editor */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2">
              <Star className="text-yellow-400" size={16} />
              <span className="font-bold text-white text-sm">Reward Tiers (Editable)</span>
            </div>
            <div className="p-3 space-y-2">
              {tiers.map((tier, idx) => (
                <div key={idx} className="rounded-xl p-3 border border-slate-800 bg-slate-950/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold" style={{ color: tier.color }}>{tier.label}</span>
                    <button onClick={() => setEditingTier(editingTier === idx ? null : idx)}
                      className="text-slate-500 hover:text-white transition-colors">
                      {editingTier === idx ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    <span className="font-black text-white">{tier.reward.toLocaleString()} {tier.token}</span>
                  </div>
                  {editingTier === idx && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500">Amount</label>
                        <input type="number" value={tier.reward}
                          onChange={e => setTiers(prev => prev.map((t, i) => i === idx ? { ...t, reward: Number(e.target.value) } : t))}
                          className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Token</label>
                        <select value={tier.token}
                          onChange={e => setTiers(prev => prev.map((t, i) => i === idx ? { ...t, token: e.target.value } : t))}
                          className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white">
                          <option value="TASKY">TASKY</option>
                          <option value="USDT">USDT</option>
                          <option value="GRAM">GRAM</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Custom Message */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Megaphone className="text-indigo-400" size={16} />
              <span className="font-bold text-white text-sm">Custom Channel Note</span>
            </div>
            <textarea rows={4} value={customMsg} onChange={e => setCustomMsg(e.target.value)}
              placeholder="Add a custom note to the Tasky Payouts channel post… (optional)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500 transition-colors" />
            <p className="text-xs text-slate-500">Appended to the bottom of the announcement post.</p>
          </div>

          {/* Result */}
          {result && (
            <div className={"rounded-2xl p-4 border text-sm space-y-2 " + (result.error ? "border-red-700 bg-red-900/20" : "border-emerald-700 bg-emerald-900/20")}>
              <div className="flex items-center gap-2 font-bold">
                {result.error
                  ? <AlertTriangle size={16} className="text-red-400" />
                  : <CheckCircle size={16} className="text-emerald-400" />}
                <span className={result.error ? "text-red-400" : "text-emerald-400"}>
                  {result.error ? "Error" : "Distribution Complete!"}
                </span>
              </div>
              {result.rewarded !== undefined && <p className="text-slate-300">✅ Rewarded <strong>{result.rewarded}</strong> users</p>}
              {result.skipped !== undefined && <p className="text-slate-400">⏭ Skipped <strong>{result.skipped}</strong> (banned)</p>}
              {result.channelPost && <p className="text-indigo-300">📣 Announcement posted to channel</p>}
              {result.error && <p className="text-red-300">{result.error}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && previewText && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Megaphone className="text-indigo-400" size={20} />
              <h3 className="font-black text-white text-lg">Channel Post Preview</h3>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 text-xs text-slate-300 whitespace-pre-wrap max-h-80 overflow-y-auto">
              {previewText}
            </div>
            <button onClick={() => setShowPreview(false)} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold transition-all">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import api from "../api";
import toast from "react-hot-toast";
import {
  Trophy, Loader2, RefreshCw, Gift, Megaphone, CheckCircle,
  AlertTriangle, Copy, ExternalLink, Coins, Zap, Star, Crown, Wallet
} from "lucide-react";

const PRIZE_STRUCTURE = [
  { rankMin: 1,  rankMax: 1,  gram: 1.00, tasky: 20000, label: "🥇 1st Place" },
  { rankMin: 2,  rankMax: 2,  gram: 0.50, tasky: 10000, label: "🥈 2nd Place" },
  { rankMin: 3,  rankMax: 3,  gram: 0.30, tasky: 5000,  label: "🥉 3rd Place" },
  { rankMin: 4,  rankMax: 10, gram: 0.10, tasky: 2000,  label: "🏅 Ranks 4–10" },
  { rankMin: 11, rankMax: 30, gram: 0.05, tasky: 1000,  label: "🎖️ Ranks 11–30" },
];
function getPrize(rank) {
  const tier = PRIZE_STRUCTURE.find(t => rank >= t.rankMin && rank <= t.rankMax);
  return tier || { gram: 0, tasky: 0, label: "—" };
}
function getRankMeta(rank) {
  if (rank === 1) return { icon: "🥇", color: "#FFD700", bg: "rgba(255,215,0,0.08)" };
  if (rank === 2) return { icon: "🥈", color: "#C0C0C0", bg: "rgba(192,192,192,0.08)" };
  if (rank === 3) return { icon: "🥉", color: "#CD7F32", bg: "rgba(205,127,50,0.08)" };
  if (rank <= 10) return { icon: "🏅", color: "#818cf8", bg: "rgba(129,140,248,0.06)" };
  return { icon: "🎖️", color: "#34d399", bg: "rgba(52,211,153,0.05)" };
}

export default function ChampionshipPayouts() {
  const [tournament, setTournament]   = useState(null);
  const [winners, setWinners]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [announcing, setAnnouncing]   = useState(false);
  const [result, setResult]           = useState(null);
  const [customMsg, setCustomMsg]     = useState("");
  const [copiedId, setCopiedId]       = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/campaign/payout-preview");
      setTournament(data.tournament);
      setWinners(data.winners);
    } catch {
      toast.error("Failed to load championship data");
    } finally {
      setLoading(false);
    }
  };

  const copy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const handleDistribute = async () => {
    const missingWallets = winners.filter(w => getPrize(w.rank).gram > 0 && !w.gram_wallet_address);
    if (missingWallets.length > 0) {
      const names = missingWallets.map(w => `#${w.rank} ${w.username ? "@"+w.username : w.first_name}`).join(", ");
      if (!window.confirm(`⚠️ ${missingWallets.length} winners have no GRAM wallet saved:\n${names}\n\nTASKY will still be credited. GRAM for these users must be sent manually later. Continue?`)) return;
    }
    if (!window.confirm(`Distribute prizes to ${winners.length} championship winners?\n• TASKY balance credited automatically\n• GRAM wallets listed for manual send\n• Winner announcement posted to Tasky Payouts channel`)) return;
    setDistributing(true);
    setResult(null);
    try {
      const { data } = await api.post("/campaign/distribute-prizes", { customMessage: customMsg || null });
      setResult(data);
      toast.success(`Prizes distributed to ${data.taskyRewarded} users! Check GRAM list below.`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Distribution failed");
    } finally {
      setDistributing(false);
    }
  };

  const handleAnnounce = async () => {
    setAnnouncing(true);
    try {
      const { data } = await api.post("/campaign/announce-winners", { customMessage: customMsg || null });
      if (data.success) {
        toast.success("🏆 Championship results posted to Tasky Payouts channel!");
      } else {
        toast.error(data.error || "Announce failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Announce failed");
    } finally {
      setAnnouncing(false);
    }
  };

  const totalGram = winners.reduce((s, w) => s + getPrize(w.rank).gram, 0);
  const totalTasky = winners.reduce((s, w) => s + getPrize(w.rank).tasky, 0);

  return (
    <div className="min-h-screen bg-[#070a14] text-white p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
            <Trophy className="text-yellow-400" size={32} />
            Ad Championship — Prize Distribution
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {tournament ? (
              <span>
                <span className="text-yellow-400 font-semibold">{tournament.title}</span>
                {" • "}
                <span className={tournament.status === "ended_pending_admin_payout" ? "text-orange-400 font-bold" : "text-green-400"}>
                  {tournament.status === "ended_pending_admin_payout" ? "⏳ ENDED — AWAITING PAYOUT" : tournament.status}
                </span>
              </span>
            ) : "Loading tournament…"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={handleAnnounce} disabled={announcing || winners.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-500/20">
            {announcing ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
            Announce Winners
          </button>
          <button onClick={handleDistribute} disabled={distributing || winners.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 text-black text-sm font-black transition-all shadow-lg shadow-yellow-500/30">
            {distributing ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
            {distributing ? "Distributing…" : "Distribute All Prizes"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Winners", value: winners.length, icon: Crown, color: "text-yellow-400" },
          { label: "Total GRAM", value: totalGram.toFixed(2) + " GRAM", icon: Zap, color: "text-cyan-400" },
          { label: "Total TASKY", value: totalTasky.toLocaleString(), icon: Coins, color: "text-purple-400" },
          { label: "Missing Wallets", value: winners.filter(w => !w.gram_wallet_address).length, icon: Wallet, color: "text-orange-400" },
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
        {/* Winners Table */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center gap-2">
            <Trophy className="text-yellow-400" size={18} />
            <span className="font-bold text-white text-sm">Final Top 30 — Verified (bots excluded)</span>
            <span className="ml-auto text-xs text-slate-500">{loading ? "Loading…" : winners.length + " winners"}</span>
          </div>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="animate-spin text-indigo-400" size={36} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[11px] text-slate-500 uppercase border-b border-slate-800">
                    <th className="py-3 px-3 text-left">Rank</th>
                    <th className="py-3 px-3 text-left">User</th>
                    <th className="py-3 px-3 text-center">Ads</th>
                    <th className="py-3 px-3 text-right">GRAM</th>
                    <th className="py-3 px-3 text-right">TASKY</th>
                    <th className="py-3 px-3 text-left">GRAM Wallet</th>
                  </tr>
                </thead>
                <tbody>
                  {winners.map((w) => {
                    const meta = getRankMeta(w.rank);
                    const prize = getPrize(w.rank);
                    const hasWallet = !!w.gram_wallet_address;
                    return (
                      <tr key={w.telegram_id} style={{ background: meta.bg }}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="text-base">{meta.icon}</span>
                          <span className="ml-1.5 font-black text-xs" style={{ color: meta.color }}>#{w.rank}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-white">
                            {w.username ? "@" + w.username : w.first_name || "Unknown"}
                          </div>
                          <div className="text-slate-500 font-mono text-[10px]">{w.telegram_id}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-bold text-cyan-300">{w.ads_watched}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-black" style={{ color: meta.color }}>{prize.gram} GRAM</span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-bold text-purple-300">{prize.tasky.toLocaleString()}</span>
                        </td>
                        <td className="py-2.5 px-3 max-w-[160px]">
                          {hasWallet ? (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[10px] text-emerald-300 truncate max-w-[100px]">{w.gram_wallet_address}</span>
                              <button onClick={() => copy(w.gram_wallet_address, w.telegram_id)}
                                className="text-slate-500 hover:text-white flex-shrink-0 transition-colors">
                                {copiedId === w.telegram_id ? <CheckCircle size={12} className="text-green-400" /> : <Copy size={12} />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-orange-400 text-[11px] font-semibold">⚠️ No wallet</span>
                          )}
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
          {/* Prize Structure */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2">
              <Star className="text-yellow-400" size={16} />
              <span className="font-bold text-white text-sm">Prize Structure</span>
            </div>
            <div className="p-3 space-y-2">
              {PRIZE_STRUCTURE.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
                  <span className="text-sm font-semibold text-slate-300">{t.label}</span>
                  <div className="text-right">
                    <div className="text-xs font-black text-cyan-300">{t.gram} GRAM</div>
                    <div className="text-xs text-purple-300">+{t.tasky.toLocaleString()} TASKY</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GRAM Send List (for manual sends) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2">
              <Zap className="text-cyan-400" size={16} />
              <span className="font-bold text-white text-sm">GRAM Send List (Manual)</span>
            </div>
            <div className="p-3 space-y-1 max-h-64 overflow-y-auto">
              {winners.filter(w => w.gram_wallet_address && getPrize(w.rank).gram > 0).map(w => {
                const prize = getPrize(w.rank);
                return (
                  <div key={w.telegram_id} className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
                    <div>
                      <span className="text-xs font-bold text-yellow-400">#{w.rank}</span>
                      <span className="text-xs text-slate-300 ml-2">{w.username ? "@"+w.username : w.first_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-cyan-300">{prize.gram} GRAM</span>
                      <button onClick={() => copy(w.gram_wallet_address, "send_"+w.telegram_id)}
                        className="text-slate-500 hover:text-white transition-colors">
                        {copiedId === "send_"+w.telegram_id ? <CheckCircle size={11} className="text-green-400" /> : <Copy size={11} />}
                      </button>
                      <a href={`https://tonviewer.com/${w.gram_wallet_address}`} target="_blank" rel="noreferrer"
                        className="text-slate-500 hover:text-cyan-400 transition-colors">
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                );
              })}
              {winners.filter(w => !w.gram_wallet_address).length > 0 && (
                <div className="mt-2 pt-2 border-t border-orange-800/40">
                  <p className="text-orange-400 text-xs font-semibold mb-1">⚠️ No GRAM wallet — DM to collect:</p>
                  {winners.filter(w => !w.gram_wallet_address).map(w => (
                    <div key={w.telegram_id} className="text-xs text-slate-400 py-0.5">
                      #{w.rank} {w.username ? "@"+w.username : w.first_name} — {getPrize(w.rank).gram} GRAM
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Custom Message */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Megaphone className="text-indigo-400" size={16} />
              <span className="font-bold text-white text-sm">Custom Announcement Note</span>
            </div>
            <textarea rows={3} value={customMsg} onChange={e => setCustomMsg(e.target.value)}
              placeholder="e.g. Next season starts tomorrow! Stay active 🔥"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500 transition-colors" />
          </div>

          {/* Result */}
          {result && (
            <div className={"rounded-2xl p-4 border text-sm space-y-1.5 " + (result.error ? "border-red-700 bg-red-900/20" : "border-emerald-700 bg-emerald-900/20")}>
              <div className="flex items-center gap-2 font-bold mb-2">
                {result.error
                  ? <AlertTriangle size={16} className="text-red-400" />
                  : <CheckCircle size={16} className="text-emerald-400" />}
                <span className={result.error ? "text-red-400" : "text-emerald-400"}>
                  {result.error ? "Error" : "Distribution Complete!"}
                </span>
              </div>
              {result.taskyRewarded !== undefined && <p className="text-slate-300">✅ TASKY credited to <strong>{result.taskyRewarded}</strong> users</p>}
              {result.gramPendingCount !== undefined && <p className="text-orange-300">💎 <strong>{result.gramPendingCount}</strong> GRAM payments need manual send</p>}
              {result.channelPost && <p className="text-indigo-300">📣 Posted to Tasky Payouts channel</p>}
              {result.tournamentClosed && <p className="text-slate-400">🔒 Tournament marked as paid</p>}
              {result.error && <p className="text-red-300">{result.error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

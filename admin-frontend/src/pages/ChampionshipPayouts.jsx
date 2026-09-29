import React, { useEffect, useState } from "react";
import api from "../api";
import toast from "react-hot-toast";
import {
  Trophy, Loader2, RefreshCw, Gift, Megaphone, CheckCircle,
  AlertTriangle, Copy, ExternalLink, Coins, Zap, Star, Crown, Wallet,
  Check, ArrowUpRight, Send, ListChecks
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
  const [tournament, setTournament]       = useState(null);
  const [winners, setWinners]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [distributing, setDistributing]   = useState(false);
  const [announcing, setAnnouncing]       = useState(false);
  const [result, setResult]               = useState(null);
  const [customMsg, setCustomMsg]         = useState("");
  const [copiedId, setCopiedId]           = useState(null);
  const [paidMap, setPaidMap]             = useState({});
  const [filter, setFilter]               = useState("all"); // 'all' | 'needs_gram' | 'paid' | 'no_wallet'

  useEffect(() => {
    fetchData();
    try {
      const saved = localStorage.getItem("tasky_championship_paid_map");
      if (saved) setPaidMap(JSON.parse(saved));
    } catch {}
  }, []);

  const togglePaid = (telegram_id) => {
    setPaidMap(prev => {
      const next = { ...prev, [telegram_id]: !prev[telegram_id] };
      try { localStorage.setItem("tasky_championship_paid_map", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/campaign/payout-preview");
      setTournament(data.tournament);
      setWinners(data.winners || []);
    } catch {
      toast.error("Failed to load championship data");
    } finally {
      setLoading(false);
    }
  };

  const copy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const copyAllBatchList = () => {
    const list = winners
      .filter(w => w.gram_wallet_address && getPrize(w.rank).gram > 0)
      .map(w => `${w.gram_wallet_address},${getPrize(w.rank).gram},Tasky Championship #${w.rank} ${w.username ? "@"+w.username : w.first_name}`)
      .join("\n");
    if (!list) {
      toast.error("No valid wallets to export");
      return;
    }
    copy(list, "bulk_export");
    toast.success("Copied full CSV/Batch list to clipboard!");
  };

  const handleDistribute = async () => {
    const missingWallets = winners.filter(w => getPrize(w.rank).gram > 0 && !w.gram_wallet_address);
    if (missingWallets.length > 0) {
      const names = missingWallets.map(w => `#${w.rank} ${w.username ? "@"+w.username : w.first_name}`).join(", ");
      if (!window.confirm(`⚠️ ${missingWallets.length} winners have no GRAM wallet saved:\n${names}\n\nTASKY balance will be credited instantly. GRAM for these users must be sent manually later. Continue?`)) return;
    }
    if (!window.confirm(`🏆 Distribute Grand Finale Prizes to ${winners.length} championship winners?\n• TASKY balances credited automatically\n• High-impact VIP broadcast posted to @TaskyPayouts\n• You can pay GRAM to wallets from your external wallet below.`)) return;
    setDistributing(true);
    setResult(null);
    try {
      const { data } = await api.post("/campaign/distribute-prizes", { customMessage: customMsg || null });
      setResult(data);
      toast.success(`🎉 Prizes distributed! TASKY credited to ${data.taskyRewarded} users & Grand Finale posted to channel!`);
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
        toast.success("🏆 Championship VIP announcement posted to Tasky Payouts channel!");
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
  const missingWalletCount = winners.filter(w => !w.gram_wallet_address && getPrize(w.rank).gram > 0).length;
  const paidGramCount = winners.filter(w => paidMap[w.telegram_id]).length;

  const filteredWinners = winners.filter(w => {
    if (filter === "needs_gram") return w.gram_wallet_address && !paidMap[w.telegram_id];
    if (filter === "paid") return paidMap[w.telegram_id];
    if (filter === "no_wallet") return !w.gram_wallet_address;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#070a14] text-white p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
            <Trophy className="text-yellow-400" size={32} />
            Ad Championship — Prize Distribution
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm flex-wrap">
            <span className="text-orange-400 font-semibold flex items-center gap-1">
              🔥 {tournament?.title || "7-Day Ad Championship #0029"}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-black flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 text-xs uppercase">
              👑 Grand Finale Payouts Ready
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={handleAnnounce} disabled={announcing || winners.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-500/20">
            {announcing ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
            Announce Grand Finale
          </button>
          <button onClick={handleDistribute} disabled={distributing || winners.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 via-amber-400 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 text-black text-sm font-black transition-all shadow-xl shadow-yellow-500/30">
            {distributing ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
            {distributing ? "Distributing Prizes…" : "Distribute All Prizes"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Winners", value: winners.length, icon: Trophy, color: "text-yellow-400" },
          { label: "Total GRAM Pool", value: `${totalGram.toFixed(2)} GRAM`, icon: Zap, color: "text-cyan-400" },
          { label: "Total TASKY Pool", value: totalTasky.toLocaleString(), icon: Coins, color: "text-purple-400" },
          { label: "Paid / Missing", value: `${paidGramCount} Paid · ${missingWalletCount} Missing`, icon: Wallet, color: "text-emerald-400" },
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
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="text-yellow-400" size={18} />
              <span className="font-bold text-white text-sm">Top 30 Grand Finalists</span>
              <span className="text-xs text-slate-500 font-mono">({filteredWinners.length}/{winners.length})</span>
            </div>
            
            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
              {[
                { id: "all", label: "All (30)" },
                { id: "needs_gram", label: "Needs GRAM" },
                { id: "paid", label: `Paid (${paidGramCount})` },
                { id: "no_wallet", label: `No Wallet (${missingWalletCount})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${filter === tab.id ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
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
                    <th className="py-3 px-3 text-right">Prize</th>
                    <th className="py-3 px-3 text-left">External Wallet &amp; Pay</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWinners.map((w) => {
                    const meta = getRankMeta(w.rank);
                    const prize = getPrize(w.rank);
                    const hasWallet = !!w.gram_wallet_address;
                    const isPaid = !!paidMap[w.telegram_id];
                    const tonkeeperUrl = hasWallet ? `https://app.tonkeeper.com/transfer/${w.gram_wallet_address}?amount=${Math.round(prize.gram * 1e9)}&text=Tasky+Prize+Rank+${w.rank}` : null;
                    const tonUri = hasWallet ? `ton://transfer/${w.gram_wallet_address}?amount=${Math.round(prize.gram * 1e9)}&text=Tasky+Prize+Rank+${w.rank}` : null;

                    return (
                      <tr key={w.telegram_id} style={{ background: isPaid ? "rgba(16, 185, 129, 0.05)" : meta.bg }}
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
                          <div className="font-black" style={{ color: meta.color }}>{prize.gram} GRAM</div>
                          <div className="text-[10px] text-purple-300">+{prize.tasky.toLocaleString()} TASKY</div>
                        </td>
                        <td className="py-2.5 px-3">
                          {hasWallet ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-emerald-300 truncate max-w-[120px]">{w.gram_wallet_address}</span>
                                <button onClick={() => copy(w.gram_wallet_address, w.telegram_id)}
                                  title="Copy Wallet Address"
                                  className="text-slate-400 hover:text-white flex-shrink-0 transition-colors">
                                  {copiedId === w.telegram_id ? <CheckCircle size={13} className="text-green-400" /> : <Copy size={13} />}
                                </button>
                                <a href={`https://tonviewer.com/${w.gram_wallet_address}`} target="_blank" rel="noreferrer"
                                  title="View on Tonviewer"
                                  className="text-slate-400 hover:text-cyan-400 transition-colors">
                                  <ExternalLink size={13} />
                                </a>
                              </div>
                              
                              {/* Direct External Wallet Pay Buttons */}
                              <div className="flex items-center gap-1">
                                <a
                                  href={tonkeeperUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[10px] font-bold border border-sky-500/30 flex items-center gap-1 transition-all"
                                >
                                  <Send size={10} /> Tonkeeper
                                </a>
                                <a
                                  href={tonUri}
                                  className="px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[10px] font-bold border border-indigo-500/30 flex items-center gap-1 transition-all"
                                >
                                  <Wallet size={10} /> TON App
                                </a>
                              </div>
                            </div>
                          ) : (
                            <span className="text-orange-400 text-[11px] font-semibold flex items-center gap-1">
                              ⚠️ No wallet saved
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => togglePaid(w.telegram_id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 mx-auto transition-all ${
                              isPaid 
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" 
                                : "bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {isPaid ? <Check size={12} className="text-emerald-400" /> : null}
                            {isPaid ? "Paid" : "Mark Paid"}
                          </button>
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
          {/* External Wallet Manual Send Hub */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="text-cyan-400" size={16} />
                <span className="font-bold text-white text-sm">External Wallet Payout Hub</span>
              </div>
              <button
                onClick={copyAllBatchList}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center gap-1 transition-all"
              >
                <Copy size={11} /> Copy All (CSV)
              </button>
            </div>
            
            <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
              {winners.filter(w => w.gram_wallet_address && getPrize(w.rank).gram > 0).map(w => {
                const prize = getPrize(w.rank);
                const isPaid = !!paidMap[w.telegram_id];
                const tonkeeperUrl = `https://app.tonkeeper.com/transfer/${w.gram_wallet_address}?amount=${Math.round(prize.gram * 1e9)}&text=Tasky+Prize+Rank+${w.rank}`;

                return (
                  <div key={w.telegram_id} className={`flex items-center justify-between p-2 rounded-xl border transition-all ${isPaid ? "bg-emerald-950/20 border-emerald-900/40 opacity-70" : "bg-slate-950/60 border-slate-800"}`}>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-yellow-400">#{w.rank}</span>
                        <span className="text-xs font-semibold text-slate-200 truncate max-w-[90px]">{w.username ? "@"+w.username : w.first_name}</span>
                        {isPaid && <span className="text-[9px] bg-emerald-900/60 text-emerald-300 font-bold px-1 rounded">PAID</span>}
                      </div>
                      <div className="text-[10px] text-cyan-300 font-black">{prize.gram} GRAM</div>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => copy(w.gram_wallet_address, "send_"+w.telegram_id)}
                        title="Copy Address"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                        {copiedId === "send_"+w.telegram_id ? <CheckCircle size={13} className="text-green-400" /> : <Copy size={13} />}
                      </button>
                      <a
                        href={tonkeeperUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Pay directly with Tonkeeper"
                        className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Send size={11} /> Pay
                      </a>
                    </div>
                  </div>
                );
              })}

              {missingWalletCount > 0 && (
                <div className="mt-2 pt-2 border-t border-orange-800/40">
                  <p className="text-orange-400 text-xs font-semibold mb-1">⚠️ {missingWalletCount} winners with no wallet (DM to collect):</p>
                  {winners.filter(w => !w.gram_wallet_address).map(w => (
                    <div key={w.telegram_id} className="text-xs text-slate-400 py-0.5 flex justify-between">
                      <span>#{w.rank} {w.username ? "@"+w.username : w.first_name}</span>
                      <span className="text-orange-300 font-bold">{getPrize(w.rank).gram} GRAM</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Prize Structure */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2">
              <Star className="text-yellow-400" size={16} />
              <span className="font-bold text-white text-sm">Season Prize Structure</span>
            </div>
            <div className="p-3 space-y-1.5">
              {PRIZE_STRUCTURE.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50 border border-slate-800 text-xs">
                  <span className="font-semibold text-slate-300">{t.label}</span>
                  <div className="text-right">
                    <span className="font-black text-cyan-300 mr-2">{t.gram} GRAM</span>
                    <span className="text-purple-300 font-bold">+{t.tasky.toLocaleString()} TASKY</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Message */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Megaphone className="text-indigo-400" size={16} />
              <span className="font-bold text-white text-sm">Strategic Marketing Note</span>
            </div>
            <textarea rows={3} value={customMsg} onChange={e => setCustomMsg(e.target.value)}
              placeholder="e.g. Next season starts tomorrow with even bigger rewards! Stay active 🔥"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500 transition-colors" />
          </div>

          {/* Result Banner */}
          {result && (
            <div className={"rounded-2xl p-4 border text-sm space-y-1.5 " + (result.error ? "border-red-700 bg-red-900/20" : "border-emerald-700 bg-emerald-900/20")}>
              <div className="flex items-center gap-2 font-bold mb-2">
                {result.error
                  ? <AlertTriangle size={16} className="text-red-400" />
                  : <CheckCircle size={16} className="text-emerald-400" />}
                <span className={result.error ? "text-red-400" : "text-emerald-400"}>
                  {result.error ? "Error" : "Grand Finale Distributed!"}
                </span>
              </div>
              {result.taskyRewarded !== undefined && <p className="text-slate-300">✅ TASKY credited to <strong>{result.taskyRewarded}</strong> users</p>}
              {result.gramPendingCount !== undefined && <p className="text-orange-300">💎 <strong>{result.gramPendingCount}</strong> GRAM payments available in External Wallet Hub above</p>}
              {result.channelPost && <p className="text-indigo-300">📣 VIP Grand Finale Broadcast posted to @TaskyPayouts!</p>}
              {result.error && <p className="text-red-300">{result.error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

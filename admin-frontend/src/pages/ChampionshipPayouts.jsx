import React, { useEffect, useState } from "react";
import api from "../api";
import toast from "react-hot-toast";
import {
  Trophy, Loader2, RefreshCw, Gift, Megaphone, CheckCircle,
  AlertTriangle, Copy, ExternalLink, Coins, Zap, Star, Crown, Wallet,
  Check, ArrowUpRight, Send, ListChecks, ShieldCheck, X, PlusCircle, Users
} from "lucide-react";

const DEFAULT_PRIZE_STRUCTURE = [
  { rankMin: 1,  rankMax: 1,  gram: 1.50, tasky: 30000, label: "🥇 1st Place" },
  { rankMin: 2,  rankMax: 2,  gram: 0.75, tasky: 15000, label: "🥈 2nd Place" },
  { rankMin: 3,  rankMax: 3,  gram: 0.40, tasky: 8000,  label: "🥉 3rd Place" },
  { rankMin: 4,  rankMax: 10, gram: 0.15, tasky: 3000,  label: "🏅 Ranks 4–10" },
  { rankMin: 11, rankMax: 20, gram: 0.08, tasky: 1500,  label: "🎖️ Ranks 11–20" },
];

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
  const [prizeStructure, setPrizeStructure] = useState(DEFAULT_PRIZE_STRUCTURE);
  const [loading, setLoading]             = useState(true);
  const [distributing, setDistributing]   = useState(false);
  const [announcing, setAnnouncing]       = useState(false);
  const [creating, setCreating]           = useState(false);
  const [result, setResult]               = useState(null);
  const [customMsg, setCustomMsg]         = useState("");
  const [copiedId, setCopiedId]           = useState(null);
  const [filter, setFilter]               = useState("all");

  // Proof Modal state
  const [payoutModal, setPayoutModal]     = useState(null);
  const [txHashInput, setTxHashInput]     = useState("");
  const [notifyUser, setNotifyUser]       = useState(true);
  const [broadcastChan, setBroadcastChan] = useState(true);
  const [submittingProof, setSubmittingProof] = useState(false);

  const getPrize = (rank) => {
    const list = prizeStructure || DEFAULT_PRIZE_STRUCTURE;
    const tier = list.find(t => rank >= t.rankMin && rank <= t.rankMax);
    return tier || { gram: 0, tasky: 0, label: "—" };
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/campaign/payout-preview");
      setTournament(data.tournament);
      setWinners(data.winners || []);
      if (data.prize_structure) {
        setPrizeStructure(data.prize_structure);
      }
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
      .map(w => `${w.gram_wallet_address},${getPrize(w.rank).gram},Tasky Leaderboard Prize - Rank #${w.rank} (${w.username ? "@"+w.username : w.first_name})`)
      .join("\n");
    if (!list) {
      toast.error("No valid wallets to export");
      return;
    }
    copy(list, "bulk_export");
    toast.success("Copied full CSV/Batch list to clipboard!");
  };

  const handleStartReferralChampionship = async () => {
    if (!window.confirm("🚀 Start a NEW 20-Day Referral Championship (Top 20 Winners)?\n• Referrals start counting from NOW onwards only\n• Referral counts only when friend completes at least 1 task in mini app\n• Top 20 prize structure (1.50 GRAM 1st place)")) return;
    setCreating(true);
    try {
      const { data } = await api.post("/campaign/create-tournament", {
        title: `🚀 20-Day Referral Championship #${Date.now().toString().slice(-4)}`,
        duration_days: 20,
        tournament_type: "referral",
        winners_count: 20
      });
      toast.success("🎉 New 20-Day Referral Championship is now LIVE!");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create tournament");
    } finally {
      setCreating(false);
    }
  };

  const openPayoutModal = (winner) => {
    const prize = getPrize(winner.rank);
    setPayoutModal({
      tournament_id: tournament?.id || 1,
      telegram_id: winner.telegram_id,
      rank: winner.rank,
      gram_amount: prize.gram,
      wallet_address: winner.gram_wallet_address,
      username: winner.username,
      first_name: winner.first_name,
      existing_tx: winner.tx_hash || ""
    });
    setTxHashInput(winner.tx_hash || "");
    setNotifyUser(true);
    setBroadcastChan(true);
  };

  const handleSubmitProof = async () => {
    if (!txHashInput || !txHashInput.trim()) {
      toast.error("Please enter a valid Transaction Hash or Tonviewer link");
      return;
    }
    setSubmittingProof(true);
    try {
      const payload = {
        tournament_id: payoutModal.tournament_id,
        telegram_id: payoutModal.telegram_id,
        rank: payoutModal.rank,
        gram_amount: payoutModal.gram_amount,
        wallet_address: payoutModal.wallet_address,
        tx_hash: txHashInput.trim(),
        notify_user: notifyUser,
        broadcast_channel: broadcastChan
      };

      const { data } = await api.post("/campaign/submit-winner-payout", payload);
      toast.success(data.message || "Payout proof broadcasted to @TaskyPayouts!");
      setPayoutModal(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit payout proof");
    } finally {
      setSubmittingProof(false);
    }
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

  const isReferral = (tournament?.tournament_type === "referral" || tournament?.title?.toLowerCase()?.includes("referral")) && !tournament?.title?.toLowerCase()?.includes("ad") && (tournament?.tournament_type !== "ad");
  const maxWinners = tournament?.winners_count || (isReferral ? 20 : 30);

  const totalGram = winners.reduce((s, w) => s + getPrize(w.rank).gram, 0);
  const totalTasky = winners.reduce((s, w) => s + getPrize(w.rank).tasky, 0);
  const missingWalletCount = winners.filter(w => !w.gram_wallet_address && getPrize(w.rank).gram > 0).length;
  const paidGramCount = winners.filter(w => w.is_paid).length;

  const filteredWinners = winners.filter(w => {
    if (filter === "needs_gram") return w.gram_wallet_address && !w.is_paid;
    if (filter === "paid") return w.is_paid;
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
            {isReferral ? "Referral Championship" : "Ad Championship"} — Prize Hub
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm flex-wrap">
            <span className="text-orange-400 font-semibold flex items-center gap-1">
              🔥 {tournament?.title || "20-Day Referral Championship #0030"}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-cyan-400 font-black flex items-center gap-1 bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-500/30 text-xs uppercase">
              {isReferral ? "👥 1-Task Verified Referrals" : "📺 Sponsored Ads"}
            </span>
            <span className="text-emerald-400 font-black flex items-center gap-1 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30 text-xs uppercase">
              👑 Top {maxWinners} Finalists
            </span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchData}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          
          <button onClick={handleStartReferralChampionship} disabled={creating}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black transition-all shadow-md">
            {creating ? <Loader2 size={13} className="animate-spin" /> : <PlusCircle size={13} />}
            Start New 20-Day Season
          </button>

          <button onClick={handleAnnounce} disabled={announcing || winners.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/20">
            {announcing ? <Loader2 size={13} className="animate-spin" /> : <Megaphone size={13} />}
            Announce Winners
          </button>

          <button onClick={handleDistribute} disabled={distributing || winners.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 via-amber-400 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 text-black text-xs font-black transition-all shadow-xl shadow-yellow-500/30">
            {distributing ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
            {distributing ? "Distributing…" : "Distribute All Prizes"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Top Prize Ranks", value: `Top ${maxWinners} Winners`, icon: Trophy, color: "text-yellow-400" },
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
              <span className="font-bold text-white text-sm">Top {maxWinners} Leaderboard Finalists</span>
              <span className="text-xs text-slate-500 font-mono">({filteredWinners.length}/{winners.length})</span>
            </div>
            
            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
              {[
                { id: "all", label: `All (${winners.length})` },
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
          ) : winners.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs space-y-2">
              <Users size={32} className="mx-auto text-slate-600 mb-1" />
              <p className="font-bold text-slate-300">New 20-Day Referral Season Active!</p>
              <p>Referrals are now tracking in real-time. Invitees must complete 1 task to appear on the leaderboard.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[11px] text-slate-500 uppercase border-b border-slate-800">
                    <th className="py-3 px-3 text-left">Rank</th>
                    <th className="py-3 px-3 text-left">User</th>
                    <th className="py-3 px-3 text-center">{isReferral ? "Valid Refs (1+ Task)" : "Ads"}</th>
                    <th className="py-3 px-3 text-right">Prize</th>
                    <th className="py-3 px-3 text-left">Destination Wallet</th>
                    <th className="py-3 px-3 text-center">⚡ 1-Click Pay &amp; Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWinners.map((w) => {
                    const meta = getRankMeta(w.rank);
                    const prize = getPrize(w.rank);
                    const hasWallet = !!w.gram_wallet_address;
                    const memoText = `Tasky Leaderboard Prize - Rank #${w.rank}`;
                    const tonkeeperUrl = hasWallet ? `https://app.tonkeeper.com/transfer/${w.gram_wallet_address}?amount=${Math.round(prize.gram * 1e9)}&text=${encodeURIComponent(memoText)}` : null;
                    const explorerUrl = w.tx_hash ? (w.tx_hash.startsWith('http') ? w.tx_hash : `https://tonviewer.com/transaction/${w.tx_hash}`) : null;

                    return (
                      <tr key={w.telegram_id} style={{ background: w.is_paid ? "rgba(16, 185, 129, 0.05)" : meta.bg }}
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
                          <span className="font-bold text-cyan-300 text-sm">{w.score !== undefined ? w.score : w.ads_watched}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="font-black" style={{ color: meta.color }}>{prize.gram} GRAM</div>
                          <div className="text-[10px] text-purple-300">+{prize.tasky.toLocaleString()} TASKY</div>
                        </td>
                        <td className="py-2.5 px-3">
                          {hasWallet ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-emerald-300 truncate max-w-[130px]">{w.gram_wallet_address}</span>
                                <button onClick={() => copy(w.gram_wallet_address, w.telegram_id)}
                                  title="Copy Wallet Address"
                                  className="text-slate-400 hover:text-white flex-shrink-0 transition-colors">
                                  {copiedId === w.telegram_id ? <CheckCircle size={13} className="text-green-400" /> : <Copy size={13} />}
                                </button>
                                <a href={`https://tonviewer.com/${w.gram_wallet_address}`} target="_blank" rel="noreferrer"
                                  title="View Wallet on Tonviewer"
                                  className="text-slate-400 hover:text-cyan-400 transition-colors">
                                  <ExternalLink size={13} />
                                </a>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Memo: <span className="text-amber-300 font-medium">{memoText}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-orange-400 text-[11px] font-semibold flex items-center gap-1">
                              ⚠️ No wallet saved
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {w.is_paid ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 inline-flex items-center gap-1">
                                <CheckCircle size={12} /> Paid
                              </span>
                              {explorerUrl && (
                                <a href={explorerUrl} target="_blank" rel="noreferrer"
                                  className="text-[10px] text-cyan-400 hover:underline font-mono inline-flex items-center gap-0.5">
                                  View TX <ExternalLink size={9} />
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {hasWallet && (
                                <a
                                  href={tonkeeperUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all cursor-pointer"
                                >
                                  <Send size={12} /> ⚡ Pay Tonkeeper
                                </a>
                              )}
                              <button
                                onClick={() => openPayoutModal(w)}
                                disabled={!hasWallet}
                                className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-black shadow-md flex items-center gap-1 transition-all"
                              >
                                <ShieldCheck size={13} /> Submit Proof
                              </button>
                            </div>
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
          {/* External Wallet Manual Send Hub */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="text-cyan-400" size={16} />
                <span className="font-bold text-white text-sm">External Wallet Hub</span>
              </div>
              <button
                onClick={copyAllBatchList}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center gap-1 transition-all"
              >
                <Copy size={11} /> Copy All (CSV)
              </button>
            </div>
            
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              {winners.filter(w => w.gram_wallet_address && getPrize(w.rank).gram > 0).map(w => {
                const prize = getPrize(w.rank);
                const memoText = `Tasky Leaderboard Prize - Rank #${w.rank}`;
                const tonkeeperUrl = `https://app.tonkeeper.com/transfer/${w.gram_wallet_address}?amount=${Math.round(prize.gram * 1e9)}&text=${encodeURIComponent(memoText)}`;

                return (
                  <div key={w.telegram_id} className={`p-2.5 rounded-xl border transition-all ${w.is_paid ? "bg-emerald-950/20 border-emerald-900/40 opacity-75" : "bg-slate-950/60 border-slate-800"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-yellow-400">#{w.rank}</span>
                        <span className="text-xs font-semibold text-slate-200 truncate max-w-[100px]">{w.username ? "@"+w.username : w.first_name}</span>
                        {w.is_paid && <span className="text-[9px] bg-emerald-900/60 text-emerald-300 font-bold px-1 rounded">PAID</span>}
                      </div>
                      <div className="text-xs text-cyan-300 font-black">{prize.gram} GRAM</div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                      <button onClick={() => copy(w.gram_wallet_address, "send_"+w.telegram_id)}
                        title="Copy Address"
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1 transition-colors truncate max-w-[120px]">
                        {copiedId === "send_"+w.telegram_id ? <CheckCircle size={11} className="text-green-400" /> : <Copy size={11} />}
                        {w.gram_wallet_address.slice(0, 4)}...{w.gram_wallet_address.slice(-4)}
                      </button>
                      
                      <div className="flex items-center gap-1">
                        <a
                          href={tonkeeperUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Pay directly with Tonkeeper"
                          className="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-black text-xs font-black flex items-center gap-1 shadow-sm transition-all"
                        >
                          <Send size={11} /> Pay Tonkeeper
                        </a>
                        <button
                          onClick={() => openPayoutModal(w)}
                          title="Submit TX Proof to Channel"
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
                        >
                          <ShieldCheck size={14} />
                        </button>
                      </div>
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
              <span className="font-bold text-white text-sm">Season Prize Structure (Top {maxWinners})</span>
            </div>
            <div className="p-3 space-y-1.5">
              {(prizeStructure || DEFAULT_PRIZE_STRUCTURE).map((t, i) => (
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
              placeholder="e.g. 20-Day Referral season is now LIVE! Invite active users & claim Top 20 rewards! 🔥"
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

      {/* Payout Proof Submit Modal */}
      {payoutModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPayoutModal(null)}>
          <div className="bg-[#0f1424] border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                  <Trophy size={20} />
                </div>
                <div>
                  <h3 className="font-black text-white text-lg">Championship Payout &amp; Proof</h3>
                  <p className="text-xs text-slate-400">Pay via Tonkeeper and broadcast verified proof to @TaskyPayouts</p>
                </div>
              </div>
              <button onClick={() => setPayoutModal(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* 1-Click Pay Tonkeeper Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/80 via-blue-950/60 to-indigo-950/80 border border-sky-500/30 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-black text-sky-400 uppercase tracking-wide">Step 1: Send GRAM via Tonkeeper</span>
                  <div className="text-sm font-bold text-white mt-0.5">
                    Rank #{payoutModal.rank} · {payoutModal.username ? "@" + payoutModal.username : payoutModal.first_name}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-cyan-300">{payoutModal.gram_amount} GRAM</span>
                  <div className="text-[10px] text-emerald-400 font-bold">Leaderboard Prize</div>
                </div>
              </div>

              <div className="pt-2 border-t border-sky-800/40 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Wallet:</span>
                  <div className="flex items-center gap-1.5 font-mono text-emerald-300">
                    <span className="truncate max-w-[200px]">{payoutModal.wallet_address}</span>
                    <button onClick={() => copy(payoutModal.wallet_address, "modal_w")} className="text-slate-400 hover:text-white">
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Comment (Memo):</span>
                  <span className="text-amber-300 font-medium font-mono text-[11px]">
                    Tasky Leaderboard Prize - Rank #{payoutModal.rank}
                  </span>
                </div>
              </div>

              {/* Tonkeeper Direct Action */}
              <div className="pt-1 flex gap-2">
                <a
                  href={`https://app.tonkeeper.com/transfer/${payoutModal.wallet_address}?amount=${Math.round(payoutModal.gram_amount * 1e9)}&text=${encodeURIComponent(`Tasky Leaderboard Prize - Rank #${payoutModal.rank}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-sky-500/30 transition-all cursor-pointer"
                >
                  <Send size={13} /> ⚡ 1-Click Pay with Tonkeeper
                </a>
              </div>
            </div>

            {/* Step 2: TX Hash Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Zap size={14} className="text-cyan-400" />
                  Step 2: Enter Transaction Hash <span className="text-red-400">*</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">From Tonkeeper/Tonviewer</span>
              </label>
              <input
                type="text"
                value={txHashInput}
                onChange={e => setTxHashInput(e.target.value)}
                placeholder="e.g. 4dc180752b7186847e6b54... or https://tonviewer.com/transaction/..."
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none transition-all"
              />
            </div>

            {/* Broadcast Options */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={broadcastChan}
                  onChange={e => setBroadcastChan(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>📣 Broadcast verified payout proof card to <strong>@TaskyPayouts</strong></span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyUser}
                  onChange={e => setNotifyUser(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>📩 Send winner notification message in Telegram Bot</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setPayoutModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitProof}
                disabled={submittingProof || !txHashInput.trim()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-black text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                {submittingProof ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {submittingProof ? "Broadcasting…" : "Confirm & Post Proof"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

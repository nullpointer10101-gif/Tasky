import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Copy, Clock, History, Coins, ArrowUpRight, AlertTriangle } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function GramClaims() {
  const [claims, setClaims] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  const [selectedUserAds, setSelectedUserAds] = useState(null);
  const [adsList, setAdsList] = useState([]);
  const [loadingAds, setLoadingAds] = useState(false);

  const handleViewAds = async (telegram_id, username, first_name, isHistory = false, requested_at = null) => {
    setSelectedUserAds({ telegram_id, name: username ? `@${username}` : (first_name || 'User'), isHistory, requested_at });
    setLoadingAds(true);
    setAdsList([]);
    try {
      const { data } = await api.get(`/users/${telegram_id}/ad-views`, { params: { ad_type: 'gram_ad' } });
      setAdsList(data);
    } catch (e) {
      toast.error('Failed to load ad view list');
    } finally {
      setLoadingAds(false);
    }
  };

  useEffect(() => {
    fetchClaims(true);
    fetchHistory();
    const interval = setInterval(() => {
      if (activeTab === 'pending') fetchClaims(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchClaims = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get('/gram/claims/pending');
      setClaims(data);
    } catch (e) {
      if (showLoading) toast.error('Failed to load pending Gram claims');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/gram/claims/history');
      setHistory(data);
    } catch (e) {
      toast.error('Failed to load Gram claims history');
    }
  };

  const handleReview = async (id, action) => {
    let reason = '';
    let txHash = '';
    if (action === 'reject') {
      reason = prompt('Enter rejection reason:', "Kindly add | Tasky 🐾 to your Telegram profile name.");
      if (reason === null) return;
      if (!reason.trim()) {
        reason = "Kindly add | Tasky 🐾 to your Telegram profile name.";
      }
    } else if (action === 'approve') {
      txHash = prompt('Enter transaction hash or Tonviewer link (COMPULSORY):');
      if (txHash === null) return; // User cancelled
      if (!txHash.trim()) {
        toast.error('Transaction hash or Tonviewer link is compulsory to mark as Paid!');
        return;
      }
      txHash = txHash.trim();
    }
 
    setProcessingId(id);
    try {
      await api.post('/gram/claims/review', { claim_id: id, action, rejection_reason: reason, tx_hash: txHash });
      toast.success("Gram claim " + action + "d successfully");
      setClaims(claims.filter(c => c.claim_id !== id));
      fetchHistory();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to " + action + " Gram claim");
    } finally {
      setProcessingId(null);
    }
  };

  const handleWarn = async (c) => {
    const communityLink = 'https://t.me/TaskyOfficialCommunity';
    const name = c.username ? `@${c.username}` : (c.first_name || 'there');
    const message =
      `⚠️ <b>Warning — Proof Required</b>\n\n` +
      `Hi ${name},\n\n` +
      `We noticed that you claimed your <b>GRAM reward</b> but have <b>not shared proof</b> of your GRAM withdrawal in our community.\n\n` +
      `📌 <b>This is required to keep your claim valid.</b>\n\n` +
      `Please post a screenshot of your GRAM transaction in our official community group and tag it with <b>#GramProof</b> <b>#taskyproof</b>:\n` +
      `👉 <a href="${communityLink}">${communityLink}</a>\n\n` +
      `Failure to do so may result in your future claims being <b>rejected</b>.\n\n` +
      `— <i>Tasky Admin Team</i>`;

    try {
      await api.post(`/users/${c.telegram_id}/broadcast`, { message });
      toast.success(`⚠️ Warning sent to ${name}`);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to send warning');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Gram wallet address copied!');
  };

  if (loading && activeTab === 'pending') {
    return (
      <div className="p-4 md:p-10 h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse text-amber-400">
          <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin"></div>
          <p className="font-bold text-ink tracking-widest uppercase text-sm">Loading Gram Claims...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 pb-20 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-ink mb-2 tracking-tight flex items-center gap-2">
            <Coins className="text-amber-400" /> Gram Claims
          </h1>
          <p className="text-ink-soft text-sm md:text-base">Process daily 0.02 GRAM rewards for users who completed 60 ads. Send the GRAM manually, then mark as Paid.</p>
        </div>
        
        <div className="flex bg-surface-soft p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-colors ${
              activeTab === 'pending' ? 'bg-amber-500 text-black shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <Clock size={16} /> Pending
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-colors ${
              activeTab === 'history' ? 'bg-amber-500 text-black shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <History size={16} /> History
          </button>
        </div>
      </div>

      {activeTab === 'pending' ? (
        claims.length === 0 ? (
          <div className="bg-surface-soft p-12 rounded-3xl border border-border flex flex-col items-center justify-center shadow-sm">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-ink mb-1">All Caught Up!</h2>
            <p className="text-ink-soft text-sm">No pending Gram claims to process right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {claims.map((c) => (
              <div key={c.claim_id} className="bg-surface-soft border border-border rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-lg shadow-black/20 hover:border-amber-500/30 transition-colors">
                
                <div className="flex-1 w-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-black text-white text-lg tracking-tight">
                        {c.live_name || c.first_name || 'User'}
                      </span>
                      {(c.username || c.live_username) && (
                        <span className="bg-indigo-500/15 text-indigo-400 font-bold px-2 py-0.5 rounded-lg text-xs border border-indigo-500/30">
                          @{c.live_username || c.username}
                        </span>
                      )}
                      {c.has_suffix ? (
                        <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          🐾 Suffix Active
                        </span>
                      ) : (
                        <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          ⚠️ No Suffix
                        </span>
                      )}
                      <span className="text-ink-faint font-mono text-xs">(ID: {c.telegram_id})</span>
                      {c.is_flagged && (
                        <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          🚩 Flagged: {c.flag_reason}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-ink-faint uppercase font-bold tracking-wider shrink-0">{new Date(c.requested_at).toLocaleString()}</span>
                  </div>
                  
                  <div className="bg-[#0a0f1c] p-3 rounded-2xl border border-border/50 flex items-center justify-between group">
                    <code className="text-sm text-amber-400 font-mono truncate mr-4">{c.gram_wallet_address}</code>
                    <div className="flex items-center gap-2 shrink-0">
                      <a 
                        href={`ton://transfer/${c.gram_wallet_address}?amount=${Math.round(Number(c.amount) * 1000000000)}&text=${encodeURIComponent('Tasky Withdrawal 🎁')}`}
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl transition-all flex items-center gap-1 text-xs font-black"
                        title="Pay with Tonkeeper"
                      >
                        Pay <ArrowUpRight size={12} />
                      </a>
                      <button onClick={() => copyToClipboard(c.gram_wallet_address)} className="p-2 text-ink-soft hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all">
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>

                  {/* User Verification Metrics */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                    <div className="bg-[#0b1329]/30 p-2.5 rounded-xl border border-border/30">
                      <span className="text-ink-soft block text-[9px] uppercase font-bold tracking-wider mb-0.5">Joined Date</span>
                      <span className="text-ink font-semibold">{c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="bg-[#0b1329]/30 p-2.5 rounded-xl border border-border/30">
                      <span className="text-ink-soft block text-[9px] uppercase font-bold tracking-wider mb-0.5">Referrals (Valid/Total)</span>
                      <span className="text-ink font-semibold">{c.valid_referrals || 0} / {c.total_referrals || 0}</span>
                    </div>
                    <div 
                      onClick={() => handleViewAds(c.telegram_id, c.username, c.first_name, false, c.requested_at)}
                      className="bg-[#0b1329]/30 p-2.5 rounded-xl border border-border/30 cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/5 transition-all group"
                      title="Click to view detailed ad logs"
                    >
                      <span className="text-ink-soft group-hover:text-amber-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5 transition-colors">Today's Ads (24h)</span>
                      <span className="text-ink font-semibold flex items-center gap-1 group-hover:text-amber-400 transition-colors">
                        {c.today_gram_ads_watched || 0} ads <span className="text-[10px] text-ink-faint font-normal group-hover:text-amber-400/70">(Click to view)</span>
                      </span>
                    </div>
                    <div className="bg-[#0b1329]/30 p-2.5 rounded-xl border border-border/30">
                      <span className="text-ink-soft block text-[9px] uppercase font-bold tracking-wider mb-0.5">Claim Attempt</span>
                      <span className="text-ink font-semibold text-amber-400">#{c.claim_seq || 1} Claim</span>
                    </div>
                    <div className="bg-[#0b1329]/30 p-2.5 rounded-xl border border-border/30">
                      <span className="text-ink-soft block text-[9px] uppercase font-bold tracking-wider mb-0.5">Last Claim Time</span>
                      {c.last_claim_at ? (
                        <div className="space-y-0.5">
                          <span className="text-amber-300 font-semibold text-[10.5px] block leading-tight">
                            {new Date(c.last_claim_at).toLocaleDateString()} {new Date(c.last_claim_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-emerald-400 font-bold text-[11px]">1st Claim (None)</span>
                      )}
                    </div>
                    <div className="bg-[#0b1329]/30 p-2.5 rounded-xl border border-border/30 col-span-2 sm:col-span-1 lg:col-span-1">
                      <span className="text-ink-soft block text-[9px] uppercase font-bold tracking-wider mb-0.5">Approved Payouts</span>
                      <span className="text-ink font-semibold text-[10.5px]" title="USDT Swaps / GRAM Claims / GRAM Withdrawals">
                        {Number(c.approved_swaps_count || 0) + Number(c.approved_withdrawals_count || 0)} Swaps • {Number(c.approved_gram_claims_count || 0) + Number(c.approved_gram_withdrawals_count || 0)} Gram
                      </span>
                      <span className="text-ink-faint block text-[8px] uppercase font-bold tracking-wider mt-0.5">Lifetime: {c.total_ads_watched || 0} Ads</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between w-full md:w-auto md:gap-8 px-2 md:px-6 md:border-l border-border/50">
                  <div className="flex flex-col">
                    <p className="text-[10px] text-ink-soft font-bold uppercase tracking-wider mb-1">Reward</p>
                    <p className="text-2xl font-black text-amber-400">{c.amount} <span className="text-xs text-amber-400/50">GRAM</span></p>
                  </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto border-t md:border-t-0 md:border-l border-border/50 pt-5 md:pt-0 md:pl-6">
                  {/* Warn button */}
                  <button
                    onClick={() => handleWarn(c)}
                    title="Warn: Not sharing proof in community"
                    className="px-3 py-3 rounded-xl border border-amber-500/30 text-amber-400 font-bold text-sm hover:bg-amber-500/10 hover:border-amber-500/50 transition-colors flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <AlertTriangle size={16} />
                    <span className="hidden lg:inline text-xs">Warn</span>
                  </button>
                  {/* Reject button */}
                  <button
                    onClick={() => handleReview(c.claim_id, 'reject')}
                    disabled={processingId === c.claim_id}
                    className="flex-1 py-3 rounded-xl border border-rose-500/20 text-rose-400 font-bold text-sm hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors flex items-center justify-center disabled:opacity-50"
                    title="Reject Claim"
                  >
                    <XCircle size={18} />
                  </button>
                  <button
                    onClick={() => handleReview(c.claim_id, 'approve')}
                    disabled={processingId === c.claim_id}
                    className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-400 text-slate-900 font-black text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} /> Mark Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        history.length === 0 ? (
          <div className="bg-surface-soft p-12 rounded-3xl border border-border flex flex-col items-center justify-center shadow-sm">
            <h2 className="text-xl font-bold text-ink mb-1">No History Found</h2>
            <p className="text-ink-soft text-sm">Processed Gram claims will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((h) => (
              <div key={h.claim_id} className={`bg-surface-soft border rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-lg shadow-black/20 transition-colors ${h.status === 'approved' ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
                
                <div className="flex-1 w-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {h.status === 'approved' ? (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      ) : (
                        <XCircle size={18} className="text-rose-400" />
                      )}
                      <span className="font-black text-white text-lg tracking-tight">
                        {h.first_name || 'User'}
                      </span>
                      {h.username && (
                        <span className="bg-indigo-500/15 text-indigo-400 font-bold px-2 py-0.5 rounded-lg text-xs border border-indigo-500/30">
                          @{h.username}
                        </span>
                      )}
                      <span className="text-ink-faint font-mono text-xs">(ID: {h.telegram_id})</span>
                      {h.is_flagged && (
                        <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          🚩 Flagged: {h.flag_reason}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-ink-faint uppercase font-bold tracking-wider shrink-0">{new Date(h.requested_at).toLocaleString()}</span>
                  </div>
                  
                  <div className="bg-[#0a0f1c] p-2 px-3 rounded-xl border border-border/50">
                    <code className="text-xs text-ink-soft font-mono truncate">{h.gram_wallet_address}</code>
                  </div>

                  {/* User Verification Metrics */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                    <div className="bg-[#0b1329]/30 p-2.5 rounded-xl border border-border/30">
                      <span className="text-ink-soft block text-[9px] uppercase font-bold tracking-wider mb-0.5">Joined Date</span>
                      <span className="text-ink font-semibold">{h.created_at ? new Date(h.created_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="bg-[#0b1329]/30 p-2.5 rounded-xl border border-border/30">
                      <span className="text-ink-soft block text-[9px] uppercase font-bold tracking-wider mb-0.5">Referrals (Valid/Total)</span>
                      <span className="text-ink font-semibold">{h.valid_referrals || 0} / {h.total_referrals || 0}</span>
                    </div>
                    <div 
                      onClick={() => handleViewAds(h.telegram_id, h.username, h.first_name, true, h.requested_at)}
                      className="bg-[#0b1329]/30 p-2.5 rounded-xl border border-border/30 cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/5 transition-all group"
                      title="Click to view detailed ad logs"
                    >
                      <span className="text-ink-soft group-hover:text-amber-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5 transition-colors">Claim Ads (24h)</span>
                      <span className="text-ink font-semibold flex items-center gap-1 group-hover:text-amber-400 transition-colors">
                        {h.today_gram_ads_watched || 0} ads <span className="text-[10px] text-ink-faint font-normal group-hover:text-amber-400/70">(Click to view)</span>
                      </span>
                    </div>
                    <div className="bg-[#0b1329]/30 p-2.5 rounded-xl border border-border/30">
                      <span className="text-ink-soft block text-[9px] uppercase font-bold tracking-wider mb-0.5">Claim Attempt</span>
                      <span className="text-ink font-semibold text-amber-400">#{h.claim_seq || 1} Claim</span>
                    </div>
                    <div className="bg-[#0b1329]/30 p-2.5 rounded-xl border border-border/30">
                      <span className="text-ink-soft block text-[9px] uppercase font-bold tracking-wider mb-0.5">Prev Claim Time</span>
                      {h.last_claim_at ? (
                        <div className="space-y-0.5">
                          <span className="text-amber-300 font-semibold text-[10.5px] block leading-tight">
                            {new Date(h.last_claim_at).toLocaleDateString()} {new Date(h.last_claim_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-emerald-400 font-bold text-[11px]">1st Claim (None)</span>
                      )}
                    </div>
                    <div className="bg-[#0b1329]/30 p-2.5 rounded-xl border border-border/30 col-span-2 sm:col-span-1 lg:col-span-1">
                      <span className="text-ink-soft block text-[9px] uppercase font-bold tracking-wider mb-0.5">Approved Payouts</span>
                      <span className="text-ink font-semibold text-[10.5px]" title="USDT Swaps / GRAM Claims / GRAM Withdrawals">
                        {Number(h.approved_swaps_count || 0) + Number(h.approved_withdrawals_count || 0)} Swaps • {Number(h.approved_gram_claims_count || 0) + Number(h.approved_gram_withdrawals_count || 0)} Gram
                      </span>
                      <span className="text-ink-faint block text-[8px] uppercase font-bold tracking-wider mt-0.5">Lifetime: {h.total_ads_watched || 0} Ads</span>
                    </div>
                  </div>
                  {h.tx_hash && (
                    <div className="mt-2 text-xs font-medium text-emerald-400 flex items-center gap-1.5 pl-1">
                      <span>🔗 Proof:</span>
                      <a
                        href={h.tx_hash.trim().startsWith('http') ? h.tx_hash.trim() : `https://tonviewer.com/transaction/${h.tx_hash.trim()}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-bold hover:text-emerald-300 transition-colors"
                      >
                        View Transaction
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex justify-between w-full md:w-auto md:gap-8 px-2 md:px-6 md:border-l border-border/50">
                  <div className="flex flex-col text-right md:text-left">
                    <p className="text-[10px] text-ink-soft font-bold uppercase tracking-wider mb-1">Reward</p>
                    <p className="text-xl font-black text-ink">{h.amount} <span className="text-xs text-ink-soft">GRAM</span></p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto border-t md:border-t-0 md:border-l border-border/50 pt-5 md:pt-0 md:pl-6">
                  {/* Warn button — always visible in history */}
                  <button
                    onClick={() => handleWarn(h)}
                    title="Warn: Not sharing proof in community"
                    className="px-3 py-2.5 rounded-xl border border-amber-500/30 text-amber-400 font-bold text-xs hover:bg-amber-500/10 hover:border-amber-500/50 transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <AlertTriangle size={15} />
                    <span>Warn</span>
                  </button>
                  {/* Status badge */}
                  <div className="flex flex-col items-end justify-center">
                    {h.status === 'approved' ? (
                      <span className="bg-emerald-500/10 text-emerald-400 font-bold px-4 py-2 rounded-lg text-sm whitespace-nowrap">PAID</span>
                    ) : (
                      <div className="text-center">
                        <span className="bg-rose-500/10 text-rose-400 font-bold px-4 py-2 rounded-lg text-sm block mb-1">REJECTED</span>
                        {h.rejection_reason && <span className="text-[10px] text-rose-400/70 truncate block max-w-full" title={h.rejection_reason}>{h.rejection_reason}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {selectedUserAds && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-border w-full max-w-lg rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedUserAds(null)} 
              className="absolute top-4 right-4 text-ink-soft hover:text-rose-400 p-2 hover:bg-rose-500/10 rounded-xl transition-all"
              title="Close Dialog"
            >
              <XCircle size={20} />
            </button>
            
            <h3 className="text-xl font-black text-ink mb-1 flex items-center gap-2">
              <Coins className="text-amber-400" size={20} /> Gram Ads Logs
            </h3>
            <p className="text-xs text-ink-soft mb-4">
              Viewing ad view history for <span className="text-amber-400 font-bold">{selectedUserAds.name}</span>
            </p>
            
            <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-border/50">
              {loadingAds ? (
                <div className="py-12 flex flex-col items-center justify-center text-amber-500 gap-3">
                  <div className="w-8 h-8 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin"></div>
                  <span className="text-xs font-bold tracking-wider uppercase">Fetching ad views...</span>
                </div>
              ) : adsList.length === 0 ? (
                <div className="py-12 text-center text-ink-soft text-sm">
                  No Gram ads found in database logs.
                </div>
              ) : (
                <div className="divide-y divide-border/20 border-t border-b border-border/20">
                  {adsList.map((ad, idx) => {
                    const adTime = new Date(ad.created_at).getTime();
                    let inWindow = false;
                    if (selectedUserAds.isHistory && selectedUserAds.requested_at) {
                      const reqTime = new Date(selectedUserAds.requested_at).getTime();
                      inWindow = adTime >= (reqTime - 24 * 60 * 60 * 1000) && adTime <= reqTime;
                    } else {
                      const reqTime = selectedUserAds.requested_at ? new Date(selectedUserAds.requested_at).getTime() : Date.now();
                      inWindow = adTime >= (reqTime - 24 * 60 * 60 * 1000) && adTime <= reqTime;
                    }
                    
                    return (
                      <div key={ad.id} className="py-3 flex items-center justify-between text-xs hover:bg-[#0a0f1c]/30 px-2 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-ink-faint font-bold w-6">#{idx + 1}</span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-ink">{new Date(ad.created_at).toLocaleString()}</span>
                            <span className="text-[9px] text-ink-faint font-mono mt-0.5">ID: {ad.id}</span>
                          </div>
                        </div>
                        <div>
                          {inWindow ? (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                              Claim Window
                            </span>
                          ) : (
                            <span className="bg-slate-500/10 text-ink-faint border border-slate-500/10 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                              Outside Window
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setSelectedUserAds(null)}
                className="px-5 py-2.5 rounded-xl bg-surface-soft hover:bg-border text-ink font-bold text-sm transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

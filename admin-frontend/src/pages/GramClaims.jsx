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
      reason = prompt('Enter rejection reason:');
      if (reason === null) return;
    } else if (action === 'approve') {
      txHash = prompt('Enter transaction hash or Tonviewer link (optional):');
      if (txHash === null) txHash = '';
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
      `Please post a screenshot of your GRAM transaction in our official community group and tag it with <b>#GramProof</b>:\n` +
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
                    <h3 className="font-bold text-ink text-lg truncate pr-2">@{c.username || c.first_name} <span className="text-ink-faint font-normal text-sm ml-1">(ID: {c.telegram_id})</span></h3>
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
                    <div className="flex items-center gap-2">
                      {h.status === 'approved' ? (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      ) : (
                        <XCircle size={18} className="text-rose-400" />
                      )}
                      <h3 className="font-bold text-ink text-lg truncate pr-2">@{h.username || h.first_name}</h3>
                    </div>
                    <span className="text-[10px] text-ink-faint uppercase font-bold tracking-wider shrink-0">{new Date(h.requested_at).toLocaleString()}</span>
                  </div>
                  
                  <div className="bg-[#0a0f1c] p-2 px-3 rounded-xl border border-border/50">
                    <code className="text-xs text-ink-soft font-mono truncate">{h.gram_wallet_address}</code>
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
    </div>
  );
}

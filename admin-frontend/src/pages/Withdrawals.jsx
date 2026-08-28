import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Copy, Clock, History, Search, ArrowUpRight } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [tokenFilter, setTokenFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchWithdrawals(true);
    fetchHistory();
    const interval = setInterval(() => {
      if (activeTab === 'pending') fetchWithdrawals(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchWithdrawals = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get('/withdrawals/pending');
      setWithdrawals(data);
    } catch (e) {
      if (showLoading) toast.error('Failed to load pending withdrawals');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/withdrawals/history');
      setHistory(data);
    } catch (e) {
      toast.error('Failed to load withdrawal history');
    }
  };

  const handleReview = async (id, action) => {
    let reason = '';
    if (action === 'reject') {
      reason = prompt('Enter rejection reason (User will be refunded):');
      if (reason === null) return;
    }

    setProcessingId(id);
    try {
      await api.post('/withdrawals/review', { withdrawal_id: id, action, rejection_reason: reason });
      toast.success("Withdrawal " + action + "d successfully");
      setWithdrawals(withdrawals.filter(w => w.withdrawal_id !== id));
      fetchHistory();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to " + action + " withdrawal");
    } finally {
      setProcessingId(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Wallet address copied!');
  };

  if (loading && activeTab === 'pending') {
    return (
      <div className="p-4 md:p-10 h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse text-indigo-400">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
          <p className="font-bold text-ink tracking-widest uppercase text-sm">Loading Withdrawals...</p>
        </div>
      </div>
    );
  }

  const filteredWithdrawals = withdrawals.filter(w => {
    const matchesSearch = (w.username && w.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (w.first_name && w.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (w.telegram_id && w.telegram_id.toString().includes(searchTerm)) ||
                          (w.wallet_address && w.wallet_address.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesToken = tokenFilter === 'all' || (w.token || 'USDT').toUpperCase() === tokenFilter.toUpperCase();
    return matchesSearch && matchesToken;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.requested_at) - new Date(a.requested_at);
    if (sortBy === 'oldest') return new Date(a.requested_at) - new Date(b.requested_at);
    if (sortBy === 'amount') return Number(b.usdt_amount || 0) - Number(a.usdt_amount || 0);
    return 0;
  });

  const filteredHistory = history.filter(w => {
    const matchesSearch = (w.username && w.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (w.first_name && w.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (w.telegram_id && w.telegram_id.toString().includes(searchTerm)) ||
                          (w.wallet_address && w.wallet_address.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesToken = tokenFilter === 'all' || (w.token || 'USDT').toUpperCase() === tokenFilter.toUpperCase();
    return matchesSearch && matchesToken;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.requested_at) - new Date(a.requested_at);
    if (sortBy === 'oldest') return new Date(a.requested_at) - new Date(b.requested_at);
    if (sortBy === 'amount') return Number(b.usdt_amount || 0) - Number(a.usdt_amount || 0);
    return 0;
  });

  return (
    <div className="p-4 md:p-10 pb-20 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-ink mb-2 tracking-tight">Withdrawals</h1>
          <p className="text-ink-soft text-sm md:text-base">Process user payouts. Send the USDT manually, then mark as Paid.</p>
        </div>
        
        <div className="flex bg-surface-soft p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-colors ${
              activeTab === 'pending' ? 'bg-indigo-500 text-white shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <Clock size={16} /> Pending
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-colors ${
              activeTab === 'history' ? 'bg-indigo-500 text-white shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <History size={16} /> History
          </button>
        </div>
      </div>

      {/* Search & Filters Controls */}
      <div className="bg-surface-soft border border-border rounded-3xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-soft">
            <Search size={18} />
          </span>
          <input 
            type="text" 
            placeholder="Search by username, address, Telegram ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border hover:border-indigo-500/30 focus:border-indigo-500 rounded-2xl text-ink font-semibold text-sm outline-none transition-all placeholder:text-ink-soft"
          />
        </div>
        
        <div className="flex w-full md:w-auto items-center gap-3">
          <div className="relative flex-1 md:flex-none">
            <select
              value={tokenFilter}
              onChange={(e) => setTokenFilter(e.target.value)}
              className="w-full md:w-40 px-4 py-2.5 bg-surface border border-border hover:border-indigo-500/30 focus:border-indigo-500 rounded-2xl text-ink font-bold text-xs outline-none transition-all cursor-pointer"
            >
              <option value="all">All Tokens</option>
              <option value="USDT">USDT</option>
              <option value="TON">TON</option>
              <option value="GRAM">GRAM</option>
            </select>
          </div>
          
          <div className="relative flex-1 md:flex-none">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-40 px-4 py-2.5 bg-surface border border-border hover:border-indigo-500/30 focus:border-indigo-500 rounded-2xl text-ink font-bold text-xs outline-none transition-all cursor-pointer"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="amount">Sort: Amount (High)</option>
            </select>
          </div>
        </div>
      </div>

      {activeTab === 'pending' ? (
        filteredWithdrawals.length === 0 ? (
          <div className="bg-surface-soft p-12 rounded-3xl border border-border flex flex-col items-center justify-center shadow-sm">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-ink mb-1">No Payouts Found</h2>
            <p className="text-ink-soft text-sm">No pending withdrawals match your search/filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredWithdrawals.map((w) => (
              <div key={w.withdrawal_id} className="bg-surface-soft border border-border rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-lg shadow-black/20 hover:border-indigo-500/30 transition-colors">
                
                <div className="flex-1 w-full">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-ink text-lg truncate pr-2">@{w.username || w.first_name} <span className="text-ink-faint font-normal text-sm ml-1">(ID: {w.telegram_id})</span></h3>
                    <span className="text-[10px] text-ink-faint uppercase font-bold tracking-wider shrink-0">{new Date(w.requested_at).toLocaleString()}</span>
                  </div>
                  
                  <div className="bg-[#0a0f1c] p-3 rounded-2xl border border-border/50 flex items-center justify-between group">
                    <code className="text-sm text-indigo-400 font-mono truncate mr-4">{w.wallet_address}</code>
                    <div className="flex items-center gap-2 shrink-0">
                      <a 
                        href={`ton://transfer/${w.wallet_address}?amount=${Math.round(Number(w.usdt_amount) * 1000000000)}&text=${encodeURIComponent('Tasky Withdrawal 🎁')}`}
                        className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl transition-all flex items-center gap-1 text-xs font-black"
                        title="Pay with Tonkeeper"
                      >
                        Pay <ArrowUpRight size={12} />
                      </a>
                      <button onClick={() => copyToClipboard(w.wallet_address)} className="p-2 text-ink-soft hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all">
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between w-full md:w-auto md:gap-8 px-2 md:px-6 md:border-l border-border/50">
                  <div className="flex flex-col">
                    <p className="text-[10px] text-ink-soft font-bold uppercase tracking-wider mb-1">Deducted</p>
                    <p className="text-xl font-black text-rose-400">-{Number(w.tasky_amount).toLocaleString()} <span className="text-xs text-rose-400/50">TASKY</span></p>
                  </div>
                  <div className="flex flex-col text-right md:text-left">
                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">To Send (Net)</p>
                    <p className="text-2xl font-black text-emerald-400">{Number(w.usdt_amount).toFixed(4)} <span className="text-xs text-emerald-400/50">{w.token || 'USDT'}</span></p>
                  </div>
                </div>

                <div className="flex gap-3 w-full md:w-48 border-t md:border-t-0 md:border-l border-border/50 pt-5 md:pt-0 md:pl-6">
                  <button
                    onClick={() => handleReview(w.withdrawal_id, 'reject')}
                    disabled={processingId === w.withdrawal_id}
                    className="flex-1 py-3 rounded-xl border border-rose-500/20 text-rose-400 font-bold text-sm hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors flex items-center justify-center disabled:opacity-50"
                    title="Reject and Refund"
                  >
                    <XCircle size={18} />
                  </button>
                  <button
                    onClick={() => handleReview(w.withdrawal_id, 'approve')}
                    disabled={processingId === w.withdrawal_id}
                    className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-400 text-slate-900 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} /> Mark Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        filteredHistory.length === 0 ? (
          <div className="bg-surface-soft p-12 rounded-3xl border border-border flex flex-col items-center justify-center shadow-sm">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-ink mb-1">No History Found</h2>
            <p className="text-ink-soft text-sm">No processed withdrawals match your search/filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((w) => (
              <div key={w.withdrawal_id} className={`bg-surface-soft border rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-lg shadow-black/20 transition-colors ${w.status === 'done' ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
                
                <div className="flex-1 w-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {w.status === 'done' ? (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      ) : (
                        <XCircle size={18} className="text-rose-400" />
                      )}
                      <h3 className="font-bold text-ink text-lg truncate pr-2">@{w.username || w.first_name}</h3>
                    </div>
                    <span className="text-[10px] text-ink-faint uppercase font-bold tracking-wider shrink-0">{new Date(w.requested_at).toLocaleString()}</span>
                  </div>
                  
                  <div className="bg-[#0a0f1c] p-2 px-3 rounded-xl border border-border/50">
                    <code className="text-xs text-ink-soft font-mono truncate">{w.wallet_address}</code>
                  </div>
                </div>

                <div className="flex justify-between w-full md:w-auto md:gap-8 px-2 md:px-6 md:border-l border-border/50">
                  <div className="flex flex-col text-right md:text-left">
                    <p className="text-[10px] text-ink-soft font-bold uppercase tracking-wider mb-1">Requested</p>
                    <p className="text-xl font-black text-ink">{Number(w.usdt_amount).toFixed(4)} <span className="text-xs text-ink-soft">{w.token || 'USDT'}</span></p>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-center w-full md:w-48 border-t md:border-t-0 md:border-l border-border/50 pt-5 md:pt-0 md:pl-6">
                  {w.status === 'done' ? (
                    <span className="bg-emerald-500/10 text-emerald-400 font-bold px-4 py-2 rounded-lg text-sm w-full text-center">PAID</span>
                  ) : (
                    <div className="w-full text-center">
                      <span className="bg-rose-500/10 text-rose-400 font-bold px-4 py-2 rounded-lg text-sm block mb-1">REJECTED</span>
                      {w.rejection_reason && <span className="text-[10px] text-rose-400/70 truncate block max-w-full" title={w.rejection_reason}>{w.rejection_reason}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

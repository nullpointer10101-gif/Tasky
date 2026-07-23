import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Copy } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchWithdrawals(true);
    const interval = setInterval(() => fetchWithdrawals(false), 5000);
    return () => clearInterval(interval);
  }, []);

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

  if (loading) {
    return (
      <div className="p-4 md:p-10 h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse text-indigo-400">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
          <p className="font-bold text-ink tracking-widest uppercase text-sm">Loading Withdrawals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 pb-20 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-ink mb-2 tracking-tight">Withdrawals</h1>
        <p className="text-ink-soft text-sm md:text-base">Process user payouts. Send the USDT manually, then mark as Paid.</p>
      </div>

      {withdrawals.length === 0 ? (
        <div className="bg-surface-soft p-12 rounded-3xl border border-border flex flex-col items-center justify-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-bold text-ink mb-1">All Caught Up!</h2>
          <p className="text-ink-soft text-sm">No pending withdrawals to process right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {withdrawals.map((w) => (
            <div key={w.withdrawal_id} className="bg-surface-soft border border-border rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-lg shadow-black/20 hover:border-indigo-500/30 transition-colors">
              
              {/* User Info */}
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-ink text-lg truncate pr-2">@{w.username || w.first_name} <span className="text-ink-faint font-normal text-sm ml-1">(ID: {w.telegram_id})</span></h3>
                  <span className="text-[10px] text-ink-faint uppercase font-bold tracking-wider shrink-0">{new Date(w.requested_at).toLocaleString()}</span>
                </div>
                
                <div className="bg-[#0a0f1c] p-3 rounded-2xl border border-border/50 flex items-center justify-between group">
                  <code className="text-sm text-indigo-400 font-mono truncate mr-4">{w.wallet_address}</code>
                  <button onClick={() => copyToClipboard(w.wallet_address)} className="p-2 text-ink-soft hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all shrink-0">
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              {/* Amounts */}
              <div className="flex justify-between w-full md:w-auto md:gap-8 px-2 md:px-6 md:border-l border-border/50">
                <div className="flex flex-col">
                  <p className="text-[10px] text-ink-soft font-bold uppercase tracking-wider mb-1">Deducted</p>
                  <p className="text-xl font-black text-rose-400">-{Number(w.tasky_amount).toLocaleString()} <span className="text-xs text-rose-400/50">TASKY</span></p>
                </div>
                <div className="flex flex-col text-right md:text-left">
                  <p className="text-[10px] text-ink-soft font-bold uppercase tracking-wider mb-1">To Send (Net)</p>
                  <p className="text-2xl font-black text-emerald-400">{Number(w.usdt_amount).toFixed(4)} <span className="text-xs text-emerald-400/50">{w.token || 'USDT'}</span></p>
                </div>
              </div>

              {/* Actions */}
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
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Gem, RefreshCw, CheckCircle, XCircle, Clock, Wallet, User, AlertCircle, ArrowUpRight, Copy } from 'lucide-react';
import api from '../api';

function timeSince(dateStr) {
  if (!dateStr) return '—';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
}

export default function GramWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processing, setProcessing] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/gram-withdrawals');
      setWithdrawals(res.data || []);
    } catch (err) {
      console.error('Failed to fetch gram withdrawals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleApprove = async (id) => {
    let txHash = prompt('Enter transaction hash or Tonviewer link (optional):');
    if (txHash === null) txHash = '';

    setProcessing(id);
    try {
      await api.post(`/gram-withdrawals/${id}/approve`, { tx_hash: txHash });
      setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: 'approved', processed_at: new Date().toISOString(), tx_hash: txHash } : w));
    } catch (err) {
      alert('Failed to approve: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setProcessing(rejectModal.id);
    try {
      await api.post(`/gram-withdrawals/${rejectModal.id}/reject`, { rejection_reason: rejectReason });
      setWithdrawals(prev => prev.map(w => w.id === rejectModal.id ? { ...w, status: 'rejected', rejection_reason: rejectReason } : w));
      setRejectModal(null);
      setRejectReason('');
    } catch (err) {
      alert('Failed to reject: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(null);
    }
  };

  const filtered = withdrawals.filter(w => filter === 'all' ? true : w.status === filter);
  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
            <Gem size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">GRAM Withdrawals</h1>
            <p className="text-xs text-white/40">In-app GRAM currency withdrawal requests</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full">
              {pendingCount} Pending
            </span>
          )}
          <button
            onClick={fetchWithdrawals}
            className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5">
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${
              filter === f
                ? f === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : f === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : f === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-white/10 text-white border border-white/20'
                : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Withdrawals List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw size={24} className="animate-spin text-emerald-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-white/30 gap-2">
          <Gem size={32} />
          <p className="text-sm font-bold">No {filter} withdrawals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(w => {
            const displayName = w.username ? `@${w.username}` : (w.first_name || w.telegram_id);
            return (
              <div
                key={w.id}
                className={`rounded-2xl border p-4 ${
                  w.status === 'pending' ? 'bg-amber-500/5 border-amber-500/20' :
                  w.status === 'approved' ? 'bg-emerald-500/5 border-emerald-500/20' :
                  'bg-red-500/5 border-red-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left info */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                        <User size={13} className="text-white/50" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">{displayName}</p>
                        <p className="text-[10px] text-white/30 font-mono">{w.telegram_id}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <Gem size={13} className="text-emerald-400 shrink-0" />
                      <span className="text-base font-black text-emerald-300">{parseFloat(w.amount).toFixed(4)} GRAM</span>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Wallet size={11} className="text-white/30 shrink-0" />
                        <span className="text-[10px] font-mono text-white/30 truncate max-w-[200px]" title={w.wallet_address}>{w.wallet_address}</span>
                      </div>
                      
                      {w.status === 'pending' && (
                        <div className="flex items-center gap-1.5">
                          <a 
                            href={`ton://transfer/${w.wallet_address}?amount=${Math.round(Number(w.amount) * 1000000000)}&text=${encodeURIComponent('Tasky Withdrawal 🎁')}`}
                            className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-md transition-all flex items-center gap-1 text-[9px] font-black"
                            title="Pay with Tonkeeper"
                          >
                            Pay <ArrowUpRight size={10} />
                          </a>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(w.wallet_address);
                            }} 
                            className="p-1 text-white/30 hover:text-white hover:bg-white/5 rounded transition-all"
                            title="Copy Address"
                          >
                            <Copy size={10} />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] text-white/20">{timeSince(w.requested_at)}</p>

                    {w.status === 'rejected' && w.rejection_reason && (
                      <p className="text-[10px] text-red-400/70 mt-1">Reason: {w.rejection_reason}</p>
                    )}

                    {w.status === 'approved' && w.tx_hash && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-400">
                        <span>🔗 Proof:</span>
                        <a
                          href={w.tx_hash.trim().startsWith('http') ? w.tx_hash.trim() : `https://tonviewer.com/transaction/${w.tx_hash.trim()}`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline font-bold hover:text-emerald-300 transition-colors"
                        >
                          View Transaction
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Right actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {w.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleApprove(w.id)}
                          disabled={processing === w.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle size={13} />
                          Approve
                        </button>
                        <button
                          onClick={() => { setRejectModal(w); setRejectReason(''); }}
                          disabled={processing === w.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-black hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        >
                          <XCircle size={13} />
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className={`flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-lg ${
                        w.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {w.status === 'approved' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                        {w.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f0a1e] border border-red-500/30 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-red-400" />
              <h3 className="text-base font-black text-white">Reject Withdrawal</h3>
            </div>
            <p className="text-xs text-white/50">
              Rejecting will refund <span className="text-red-400 font-black">{parseFloat(rejectModal.amount).toFixed(4)} GRAM</span> back to user's in-app balance.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Rejection reason (optional)..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold placeholder-white/20 focus:outline-none focus:border-red-500/40 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/50 text-xs font-black hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing === rejectModal.id}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-black hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

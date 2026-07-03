import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Copy } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const { data } = await api.get('/withdrawals/pending');
      setWithdrawals(data);
    } catch (e) {
      toast.error('Failed to load pending withdrawals');
    } finally {
      setLoading(false);
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

  if (loading) return <div className="p-8 text-ink">Loading pending withdrawals...</div>;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-ink mb-2">Withdrawals</h1>
        <p className="text-ink-soft">Process user payouts. Send the USDT manually, then mark as Paid.</p>
      </div>

      {withdrawals.length === 0 ? (
        <div className="bg-surface-soft p-12 rounded-3xl border border-border text-center">
          <p className="text-ink-soft">No pending withdrawals! 🎉</p>
        </div>
      ) : (
        <div className="space-y-4">
          {withdrawals.map((w) => (
            <div key={w.withdrawal_id} className="bg-surface-soft border border-border rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
              
              {/* User Info */}
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-ink">@{w.username || w.first_name} <span className="text-ink-faint font-normal text-xs">(ID: {w.telegram_id})</span></h3>
                  <span className="text-[10px] text-ink-faint">{new Date(w.requested_at).toLocaleString()}</span>
                </div>
                
                <div className="bg-surface p-3 rounded-xl border border-border flex items-center justify-between group">
                  <code className="text-sm text-indigo-300 font-mono break-all">{w.wallet_address}</code>
                  <button onClick={() => copyToClipboard(w.wallet_address)} className="p-2 text-ink-soft hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              {/* Amounts */}
              <div className="flex gap-8 w-full md:w-auto px-4 md:border-l border-border">
                <div>
                  <p className="text-[10px] text-ink-faint font-bold uppercase tracking-wider mb-1">Deducted</p>
                  <p className="text-lg font-black text-red-400">-{Number(w.tasky_amount).toLocaleString()} <span className="text-xs">TASKY</span></p>
                </div>
                <div>
                  <p className="text-[10px] text-ink-faint font-bold uppercase tracking-wider mb-1">To Send (Net)</p>
                  <p className="text-xl font-black text-emerald-400">{Number(w.usdt_amount).toFixed(4)} <span className="text-xs">USDT</span></p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex md:flex-col gap-3 w-full md:w-40 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                <button
                  onClick={() => handleReview(w.withdrawal_id, 'approve')}
                  disabled={processingId === w.withdrawal_id}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} /> Paid
                </button>
                <button
                  onClick={() => handleReview(w.withdrawal_id, 'reject')}
                  disabled={processingId === w.withdrawal_id}
                  className="flex-1 py-2.5 rounded-xl border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle size={16} /> Reject
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

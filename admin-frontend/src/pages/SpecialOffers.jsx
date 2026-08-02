import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Gift, CheckCircle, XCircle, Clock, Users, Coins } from 'lucide-react';

const STATUS_COLORS = {
  pending: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  approved: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  rejected: 'text-red-400 bg-red-400/10 border-red-400/30',
};

const STATUS_ICONS = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

export default function SpecialOffers() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [rejecting, setRejecting] = useState(null); // claim id being rejected
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(null);

  const fetchClaims = async () => {
    try {
      const { data } = await api.get('/special-offers');
      setClaims(data);
    } catch (e) {
      toast.error('Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClaims(); }, []);

  const handleReview = async (claimId, action, reason = '') => {
    setProcessing(claimId);
    try {
      await api.post('/special-offers/review', { claim_id: claimId, action, rejection_reason: reason });
      toast.success(`Claim ${action}d successfully!`);
      setRejecting(null);
      setRejectReason('');
      fetchClaims();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Action failed');
    } finally {
      setProcessing(null);
    }
  };

  const filtered = filter === 'all' ? claims : claims.filter(c => c.status === filter);
  const counts = {
    all: claims.length,
    pending: claims.filter(c => c.status === 'pending').length,
    approved: claims.filter(c => c.status === 'approved').length,
    rejected: claims.filter(c => c.status === 'rejected').length,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-amber-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
          <Gift size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-ink">Special Offer Claims</h1>
          <p className="text-ink-soft text-sm">Invite 20 Friends → Get 20,000 TASKY</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', key: 'all', color: 'from-indigo-500 to-purple-500' },
          { label: 'Pending', key: 'pending', color: 'from-amber-500 to-orange-500' },
          { label: 'Approved', key: 'approved', color: 'from-emerald-500 to-teal-500' },
          { label: 'Rejected', key: 'rejected', color: 'from-red-500 to-pink-500' },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`rounded-2xl p-4 text-left border transition-all ${filter === s.key ? 'border-indigo-500/40 bg-indigo-500/10' : 'border-border bg-surface-soft hover:bg-surface'}`}>
            <div className={`text-2xl font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{counts[s.key]}</div>
            <div className="text-xs text-ink-soft font-semibold mt-0.5">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Claims list */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-ink-soft">Loading claims...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-ink-soft gap-3">
          <Gift size={36} className="opacity-30" />
          <p className="font-semibold">No {filter === 'all' ? '' : filter} claims yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(claim => {
            const StatusIcon = STATUS_ICONS[claim.status];
            return (
              <div key={claim.id} className="bg-surface-soft border border-border rounded-2xl p-5 transition-all hover:border-indigo-500/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-ink text-sm">
                        {claim.first_name || 'Unknown'}{claim.username ? ` @${claim.username}` : ''}
                      </span>
                      <span className="text-xs text-ink-soft">#{claim.telegram_id}</span>
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[claim.status]}`}>
                        <StatusIcon size={11} /> {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap text-xs text-ink-soft mt-2">
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        <span className="font-semibold text-ink">{claim.valid_referrals_at_claim}</span> valid refs at claim
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} className="text-indigo-400" />
                        <span className="font-semibold text-indigo-400">{claim.current_valid_referrals}</span> valid refs now
                      </span>
                      <span className="flex items-center gap-1">
                        <Coins size={12} className="text-amber-400" />
                        Balance: <span className="font-semibold text-amber-400">{Number(claim.balance || 0).toLocaleString()}</span> TASKY
                      </span>
                    </div>

                    <div className="text-xs text-ink-soft/60 mt-1.5">
                      Claimed: {new Date(claim.claimed_at).toLocaleString()}
                      {claim.reviewed_at && <span className="ml-3">Reviewed: {new Date(claim.reviewed_at).toLocaleString()}</span>}
                      {claim.rejection_reason && <span className="ml-3 text-red-400">Reason: {claim.rejection_reason}</span>}
                    </div>
                  </div>

                  {claim.status === 'pending' && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleReview(claim.id, 'approve')}
                        disabled={processing === claim.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white transition-all disabled:opacity-50 active:scale-95">
                        <CheckCircle size={13} /> Approve
                      </button>
                      {rejecting === claim.id ? (
                        <div className="flex flex-col gap-1.5">
                          <input
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Rejection reason..."
                            className="text-xs px-3 py-1.5 rounded-xl bg-surface border border-border text-ink placeholder:text-ink-soft/50 w-40 focus:outline-none focus:border-red-500/50"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleReview(claim.id, 'reject', rejectReason)}
                              disabled={processing === claim.id}
                              className="flex-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-400 text-white transition-all disabled:opacity-50">
                              Confirm
                            </button>
                            <button onClick={() => { setRejecting(null); setRejectReason(''); }}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-surface hover:bg-surface-soft text-ink-soft transition-all">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRejecting(claim.id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all active:scale-95">
                          <XCircle size={13} /> Reject
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

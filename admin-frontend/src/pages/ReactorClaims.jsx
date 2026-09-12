import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Zap, CheckCircle, XCircle, Clock, Users, Coins, Wallet, ExternalLink, ShieldAlert, Sparkles, Filter } from 'lucide-react';

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

export default function ReactorClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [processing, setProcessing] = useState(null);

  // Modals / forms
  const [approvingClaim, setApprovingClaim] = useState(null);
  const [txHashInput, setTxHashInput] = useState('');
  const [rejectingClaim, setRejectingClaim] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/reactor-claims');
      setClaims(data || []);
    } catch (e) {
      toast.error('Failed to load reactor claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleApprove = async (claimId) => {
    setProcessing(claimId);
    try {
      await api.post('/reactor-claims/review', {
        claim_id: claimId,
        action: 'approve',
        payout_tx_hash: txHashInput || 'PAID_MANUAL'
      });
      toast.success('Reactor claim approved and user notified!');
      setApprovingClaim(null);
      setTxHashInput('');
      fetchClaims();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to approve claim');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (claimId) => {
    setProcessing(claimId);
    try {
      await api.post('/reactor-claims/review', {
        claim_id: claimId,
        action: 'reject',
        rejection_reason: rejectReason || 'Incomplete ad verification'
      });
      toast.success('Reactor claim rejected.');
      setRejectingClaim(null);
      setRejectReason('');
      fetchClaims();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to reject claim');
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Zap size={24} className="text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-ink">Cyber Ad Reactor Claims</h1>
            <p className="text-ink-soft text-sm">Review USL ad overdrive claims & manual payouts</p>
          </div>
        </div>

        <button
          onClick={fetchClaims}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-soft border border-border text-ink hover:bg-surface transition-all"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Claims', key: 'all', color: 'from-cyan-500 to-blue-500' },
          { label: 'Pending Review', key: 'pending', color: 'from-amber-500 to-orange-500' },
          { label: 'Approved & Paid', key: 'approved', color: 'from-emerald-500 to-teal-500' },
          { label: 'Rejected', key: 'rejected', color: 'from-red-500 to-pink-500' },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`rounded-2xl p-4 text-left border transition-all ${
              filter === s.key ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-border bg-surface-soft hover:bg-surface'
            }`}
          >
            <div className={`text-2xl font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>
              {counts[s.key]}
            </div>
            <div className="text-xs text-ink-soft font-semibold mt-0.5">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Claims list */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-ink-soft">Loading reactor claims...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-ink-soft gap-3 bg-surface-soft border border-border rounded-2xl">
          <Zap size={36} className="opacity-30 text-cyan-400" />
          <p className="font-semibold">No {filter === 'all' ? '' : filter} reactor claims found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((claim) => {
            const StatusIcon = STATUS_ICONS[claim.status] || Clock;
            return (
              <div
                key={claim.id}
                className="bg-surface-soft border border-border rounded-2xl p-5 transition-all hover:border-cyan-500/30"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-0">
                    {/* User info & Status tag */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-bold text-ink text-sm">
                        {claim.first_name || 'Anonymous'}{claim.username ? ` (@${claim.username})` : ''}
                      </span>
                      <a
                        href={`https://t.me/${claim.username || ''}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-cyan-400 hover:underline font-mono"
                      >
                        #{claim.telegram_id}
                      </a>
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[claim.status]}`}>
                        <StatusIcon size={11} /> {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                      </span>
                      <span className="text-xs font-black px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        ⚡ Stage {claim.stage_reached}
                      </span>
                    </div>

                    {/* Reward Details & Ad Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-surface p-3 rounded-xl border border-border/60 text-xs my-2">
                      <div>
                        <span className="text-ink-soft block text-[10px] uppercase font-bold">Reward</span>
                        <span className="font-black text-amber-400 text-sm">
                          {claim.reward_usdt > 0 ? `${claim.reward_usdt} USDT + ` : ''}
                          {claim.reward_grams} GRAM
                        </span>
                        <span className="text-[11px] text-ink-soft block">+{Number(claim.reward_tasky).toLocaleString()} TASKY</span>
                      </div>

                      <div>
                        <span className="text-ink-soft block text-[10px] uppercase font-bold">USL Ads Watched</span>
                        <span className="font-bold text-cyan-400 text-sm">{claim.total_ads_watched} Ads</span>
                        <span className="text-[10px] text-ink-soft block">Verified: {claim.verified_reactor_ads || claim.total_ads_watched}</span>
                      </div>

                      <div>
                        <span className="text-ink-soft block text-[10px] uppercase font-bold">Wallet Address</span>
                        <span className="font-mono text-[11px] text-ink truncate block max-w-[180px]" title={claim.wallet_address}>
                          {claim.wallet_address || 'No wallet provided'}
                        </span>
                      </div>

                      <div>
                        <span className="text-ink-soft block text-[10px] uppercase font-bold">Claim Date</span>
                        <span className="text-[11px] text-ink block">
                          {new Date(claim.claimed_at).toLocaleDateString()} {new Date(claim.claimed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Additional meta */}
                    <div className="text-xs text-ink-soft/70 mt-2 flex items-center gap-3 flex-wrap">
                      {claim.payout_tx_hash && (
                        <span className="text-emerald-400 font-mono text-[11px]">
                          TX: {claim.payout_tx_hash}
                        </span>
                      )}
                      {claim.rejection_reason && (
                        <span className="text-red-400">Reason: {claim.rejection_reason}</span>
                      )}
                      {claim.reviewed_at && (
                        <span>Reviewed: {new Date(claim.reviewed_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions for Pending Claims */}
                  {claim.status === 'pending' && (
                    <div className="flex flex-col gap-2 shrink-0 self-center">
                      <button
                        onClick={() => setApprovingClaim(claim)}
                        disabled={processing === claim.id}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white transition-all disabled:opacity-50 shadow-md shadow-emerald-500/20 active:scale-95"
                      >
                        <CheckCircle size={14} /> Approve & Pay
                      </button>

                      <button
                        onClick={() => setRejectingClaim(claim)}
                        disabled={processing === claim.id}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all active:scale-95"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approve Modal with Optional TX Hash */}
      {approvingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface border border-emerald-500/30 rounded-3xl p-6 shadow-2xl text-ink">
            <h3 className="text-lg font-black text-ink mb-1 flex items-center gap-2">
              <CheckCircle className="text-emerald-400" /> Confirm Reactor Payout
            </h3>
            <p className="text-xs text-ink-soft mb-4">
              Approving this claim will credit the rewards to User #{approvingClaim.telegram_id} and send a Telegram notification.
            </p>

            <div className="p-3.5 rounded-2xl bg-surface-soft border border-border mb-4 text-xs space-y-1">
              <div><b>User:</b> #{approvingClaim.telegram_id} ({approvingClaim.first_name || 'User'})</div>
              <div><b>Stage:</b> {approvingClaim.stage_reached} ({approvingClaim.total_ads_watched} USL Ads)</div>
              <div><b>Reward:</b> <span className="text-amber-400 font-bold">{approvingClaim.reward_usdt > 0 ? `${approvingClaim.reward_usdt} USDT + ` : ''}{approvingClaim.reward_grams} GRAM + {Number(approvingClaim.reward_tasky).toLocaleString()} TASKY</span></div>
              <div className="font-mono text-[11px] text-cyan-400 break-all"><b>Wallet:</b> {approvingClaim.wallet_address}</div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-ink mb-1">
                Transaction Hash / Proof (Optional):
              </label>
              <input
                type="text"
                value={txHashInput}
                onChange={(e) => setTxHashInput(e.target.value)}
                placeholder="e.g. 0x... or tonviewer link or PAID_MANUAL"
                className="w-full px-3 py-2 rounded-xl bg-surface-soft border border-border text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setApprovingClaim(null); setTxHashInput(''); }}
                className="flex-1 py-2.5 rounded-xl bg-surface-soft text-ink-soft font-bold text-xs hover:bg-surface border border-border"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(approvingClaim.id)}
                disabled={processing === approvingClaim.id}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/25"
              >
                {processing === approvingClaim.id ? 'Approving...' : 'Confirm & Disburse'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal with Reason */}
      {rejectingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface border border-red-500/30 rounded-3xl p-6 shadow-2xl text-ink">
            <h3 className="text-lg font-black text-ink mb-1 flex items-center gap-2">
              <XCircle className="text-red-400" /> Reject Reactor Claim
            </h3>
            <p className="text-xs text-ink-soft mb-4">
              Enter a reason for rejecting User #{rejectingClaim.telegram_id}'s claim:
            </p>

            <div className="mb-5">
              <label className="block text-xs font-bold text-ink mb-1">
                Rejection Reason:
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Incomplete ad sessions / Invalid wallet"
                className="w-full px-3 py-2 rounded-xl bg-surface-soft border border-border text-xs text-ink focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setRejectingClaim(null); setRejectReason(''); }}
                className="flex-1 py-2.5 rounded-xl bg-surface-soft text-ink-soft font-bold text-xs hover:bg-surface border border-border"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectingClaim.id)}
                disabled={processing === rejectingClaim.id}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black text-xs flex items-center justify-center gap-1 shadow-lg shadow-red-500/25"
              >
                {processing === rejectingClaim.id ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

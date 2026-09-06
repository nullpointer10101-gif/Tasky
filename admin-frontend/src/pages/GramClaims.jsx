import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, Copy, Clock, History, Coins, ArrowUpRight, 
  AlertTriangle, ShieldCheck, ShieldAlert, Shield, Users, Radio, 
  Check, ExternalLink, Zap, Eye, Calendar, Sparkles, Filter
} from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import ApprovePayoutModal from '../components/ApprovePayoutModal';

export default function GramClaims() {
  const [claims, setClaims] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [filterTrust, setFilterTrust] = useState('all'); // 'all', 'verified', 'review', 'risk'

  const [selectedUserAds, setSelectedUserAds] = useState(null);
  const [adsList, setAdsList] = useState([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [auditItem, setAuditItem] = useState(null);

  const handleViewAds = async (telegram_id, username, first_name, isHistory = false, requested_at = null, fullClaim = null) => {
    setSelectedUserAds({ 
      telegram_id, 
      name: username ? `@${username}` : (first_name || 'User'), 
      isHistory, 
      requested_at,
      claim: fullClaim
    });
    setLoadingAds(true);
    setAdsList([]);
    try {
      const { data } = await api.get(`/users/${telegram_id}/ad-views`, { params: { ad_type: 'gram_all' } });
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

  const [approveModalItem, setApproveModalItem] = useState(null);

  const handleReview = async (id, action, targetClaim = null) => {
    let reason = '';
    if (action === 'reject') {
      const defaultReason = targetClaim?.risk_flags?.[0] 
        ? `Claim rejected: ${targetClaim.risk_flags[0]}. Please follow rules and try again.`
        : "Kindly add | Tasky 🐾 to your Telegram profile name and complete 60 ads.";
      reason = prompt('Enter rejection reason for user:', defaultReason);
      if (reason === null) return;
      if (!reason.trim()) reason = defaultReason;
    } else if (action === 'approve') {
      setApproveModalItem(targetClaim);
      return;
    }
 
    setProcessingId(id);
    try {
      await api.post('/gram/claims/review', { claim_id: id, action, rejection_reason: reason });
      toast.success("Gram claim " + action + "d successfully");
      setClaims(claims.filter(c => c.claim_id !== id));
      fetchHistory();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to " + action + " Gram claim");
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveConfirm = async (txHash) => {
    if (!approveModalItem) return;
    const id = approveModalItem.claim_id;
    setProcessingId(id);
    try {
      await api.post('/gram/claims/review', { claim_id: id, action, rejection_reason: '', tx_hash: txHash });
      toast.success("Gram claim marked as Paid successfully!");
      setClaims(prev => prev.filter(c => c.claim_id !== id));
      fetchHistory();
      setApproveModalItem(null);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to mark Gram claim as Paid");
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

  // Filter claims based on Trust filter
  const displayedClaims = claims.filter(c => {
    if (filterTrust === 'verified') return c.trust_verdict === 'VERIFIED_REAL';
    if (filterTrust === 'review') return c.trust_verdict === 'NEEDS_REVIEW';
    if (filterTrust === 'risk') return c.trust_verdict === 'HIGH_RISK';
    return true;
  });

  const verifiedCount = claims.filter(c => c.trust_verdict === 'VERIFIED_REAL').length;
  const reviewCount = claims.filter(c => c.trust_verdict === 'NEEDS_REVIEW').length;
  const riskCount = claims.filter(c => c.trust_verdict === 'HIGH_RISK').length;

  if (loading && activeTab === 'pending') {
    return (
      <div className="p-4 md:p-10 h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse text-amber-400">
          <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin"></div>
          <p className="font-bold text-ink tracking-widest uppercase text-sm">Loading Gram Claims with Deep Audit...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 pb-20 max-w-7xl mx-auto space-y-6">
      {/* ── TOP HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-ink mb-2 tracking-tight flex items-center gap-3">
            <Coins className="text-amber-400" size={32} /> Gram Daily Claims
          </h1>
          <p className="text-ink-soft text-sm md:text-base">
            Review and verify 0.02 GRAM rewards. Real-time anti-fraud detection, channel membership verification, and ad pacing analytics.
          </p>
        </div>
        
        <div className="flex bg-surface-soft p-1.5 rounded-2xl border border-border">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-colors ${
              activeTab === 'pending' ? 'bg-amber-500 text-black shadow-md' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <Clock size={16} /> Pending ({claims.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-colors ${
              activeTab === 'history' ? 'bg-amber-500 text-black shadow-md' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <History size={16} /> History ({history.length})
          </button>
        </div>
      </div>

      {/* ── TRUST FILTER TABS (Pending Tab Only) ── */}
      {activeTab === 'pending' && claims.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
          <span className="text-ink-soft flex items-center gap-1.5 mr-2">
            <Filter size={14} /> Filter:
          </span>
          <button
            onClick={() => setFilterTrust('all')}
            className={`px-3.5 py-1.5 rounded-xl border transition-all ${
              filterTrust === 'all'
                ? 'bg-white/10 text-white border-white/20 shadow-sm'
                : 'bg-surface-soft text-ink-soft border-border hover:text-ink'
            }`}
          >
            All Pending ({claims.length})
          </button>
          <button
            onClick={() => setFilterTrust('verified')}
            className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
              filterTrust === 'verified'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-surface-soft text-emerald-400/70 border-border hover:text-emerald-300'
            }`}
          >
            <ShieldCheck size={14} className="text-emerald-400" />
            Verified Real ({verifiedCount})
          </button>
          <button
            onClick={() => setFilterTrust('review')}
            className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
              filterTrust === 'review'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-surface-soft text-amber-400/70 border-border hover:text-amber-300'
            }`}
          >
            <AlertTriangle size={14} className="text-amber-400" />
            Needs Review ({reviewCount})
          </button>
          <button
            onClick={() => setFilterTrust('risk')}
            className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
              filterTrust === 'risk'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                : 'bg-surface-soft text-rose-400/70 border-border hover:text-rose-300'
            }`}
          >
            <ShieldAlert size={14} className="text-rose-400" />
            High Risk ({riskCount})
          </button>
        </div>
      )}

      {/* ── CLAIMS LIST ── */}
      {activeTab === 'pending' ? (
        displayedClaims.length === 0 ? (
          <div className="bg-surface-soft p-12 rounded-3xl border border-border flex flex-col items-center justify-center shadow-sm text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-ink mb-1">
              {filterTrust === 'all' ? 'All Caught Up!' : 'No Matching Claims Found'}
            </h2>
            <p className="text-ink-soft text-sm">
              {filterTrust === 'all' ? 'No pending Gram claims to process right now.' : `No claims match the "${filterTrust}" filter.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedClaims.map((c) => {
              const isVerified = c.trust_verdict === 'VERIFIED_REAL';
              const isRisk = c.trust_verdict === 'HIGH_RISK';
              const durationMins = parseFloat(c.watch_duration_mins || 0);
              const isFastScript = durationMins > 0 && durationMins < 3.0;

              return (
                <div 
                  key={c.claim_id} 
                  className={`bg-surface-soft border rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-xl transition-all ${
                    isRisk 
                      ? 'border-rose-500/40 bg-rose-950/10 shadow-rose-500/5' 
                      : isVerified
                      ? 'border-emerald-500/30 hover:border-emerald-500/50 shadow-emerald-500/5'
                      : 'border-amber-500/30 hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex-1 w-full space-y-3.5">
                    
                    {/* TOP BADGE ROW: Name, Username, Trust Badge, Channel Badges */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-black text-white text-lg tracking-tight">
                          {c.live_name || c.first_name || 'User'}
                        </span>

                        {(c.username || c.live_username) && (
                          <span className="bg-indigo-500/15 text-indigo-400 font-bold px-2.5 py-0.5 rounded-xl text-xs border border-indigo-500/30">
                            @{c.live_username || c.username}
                          </span>
                        )}

                        <span className="text-ink-faint font-mono text-xs">(ID: {c.telegram_id})</span>

                        {/* 🟢/🟡/🔴 OVERALL TRUST BADGE */}
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                          isVerified
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : isRisk
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {isVerified ? <ShieldCheck size={14} className="text-emerald-400" /> : isRisk ? <ShieldAlert size={14} className="text-rose-400" /> : <Shield size={14} className="text-amber-400" />}
                          {isVerified ? `Verified Real (${c.trust_score || 100}%)` : isRisk ? `High Risk (${c.trust_score || 30}%)` : `Review (${c.trust_score || 70}%)`}
                        </span>

                        {/* SUFFIX BADGE */}
                        {c.has_suffix ? (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10.5px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            🐾 Suffix: Active
                          </span>
                        ) : (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            ⚠️ Suffix: Missing
                          </span>
                        )}

                        {/* COMMUNITY MEMBER BADGE */}
                        {c.in_community ? (
                          <span className="bg-blue-500/10 text-blue-300 border border-blue-500/30 text-[10.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            👥 In Community
                          </span>
                        ) : (
                          <span className="bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[10.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            ❌ Not in Community
                          </span>
                        )}

                        {/* CHANNEL MEMBER BADGE */}
                        {c.in_channel ? (
                          <span className="bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[10.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            📢 In Channel
                          </span>
                        ) : (
                          <span className="bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[10.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            ❌ Not in Channel
                          </span>
                        )}
                      </div>

                      <span className="text-[10.5px] text-ink-faint font-mono uppercase font-bold shrink-0">
                        {new Date(c.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {new Date(c.requested_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {/* WALLET & QUICK PAY BAR */}
                    <div className="bg-[#0a0f1c] p-3 rounded-2xl border border-border/50 flex items-center justify-between group">
                      <code className="text-sm text-amber-400 font-mono truncate mr-4">{c.gram_wallet_address}</code>
                      <div className="flex items-center gap-2 shrink-0">
                        <a 
                          href={`ton://transfer/${c.gram_wallet_address}?amount=${Math.round(Number(c.amount) * 1000000000)}&text=${encodeURIComponent('Tasky Withdrawal 🎁')}`}
                          className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl transition-all flex items-center gap-1.5 text-xs font-black"
                          title="Open in Tonkeeper to pay"
                        >
                          Pay <ArrowUpRight size={13} />
                        </a>
                        <button onClick={() => copyToClipboard(c.gram_wallet_address)} className="p-2 text-ink-soft hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all">
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>

                    {/* ── DETAILED USER VERIFICATION METRICS (6 TILES) ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                      
                      {/* 1. Ad Progress & Breakdown */}
                      <div 
                        onClick={() => handleViewAds(c.telegram_id, c.username, c.first_name, false, c.requested_at, c)}
                        className="bg-[#0b1329]/50 p-2.5 rounded-2xl border border-indigo-500/20 hover:border-indigo-500/40 cursor-pointer transition-all group"
                      >
                        <span className="text-ink-soft group-hover:text-indigo-300 block text-[9px] uppercase font-bold tracking-wider mb-0.5">
                          Ads Completed (24h)
                        </span>
                        <p className="font-black text-white text-xs group-hover:text-indigo-300">
                          {c.today_gram_ads_watched || 0}/60 Ads
                        </p>
                        <p className="text-[10px] text-ink-soft font-mono mt-0.5">
                          <span className="text-indigo-400">G: {c.today_giga_ads || 0}</span> • <span className="text-amber-300">M: {c.today_monetag_ads || 0}</span>
                        </p>
                      </div>

                      {/* 2. Ad Watching Duration & Pace */}
                      <div className={`p-2.5 rounded-2xl border ${
                        isFastScript ? 'bg-rose-500/10 border-rose-500/30' : 'bg-[#0b1329]/50 border-border/30'
                      }`}>
                        <span className="text-ink-soft block text-[9px] uppercase font-bold tracking-wider mb-0.5">
                          Watch Time & Pace
                        </span>
                        <p className={`font-black text-xs ${isFastScript ? 'text-rose-400 animate-pulse' : 'text-emerald-300'}`}>
                          {durationMins > 0 ? `${durationMins} mins` : 'N/A'}
                        </p>
                        <p className="text-[10px] text-ink-soft mt-0.5">
                          {c.avg_interval_sec ? `${c.avg_interval_sec}s/ad` : (isFastScript ? '🚨 Too fast' : 'Normal')}
                        </p>
                      </div>

                      {/* 3. Account Age */}
                      <div className="bg-[#0b1329]/50 p-2.5 rounded-2xl border border-border/30">
                        <span className="text-ink-soft block text-[9px] uppercase font-bold tracking-wider mb-0.5">Joined Date</span>
                        <p className="text-ink font-semibold text-xs">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}
                        </p>
                        <p className="text-[10px] text-ink-soft mt-0.5">
                          {c.created_at ? `${Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000)} days ago` : ''}
                        </p>
                      </div>

                      {/* 4. App Engagement & Tasks Done */}
                      <div className="bg-[#0b1329]/50 p-2.5 rounded-2xl border border-border/30">
                        <span className="text-ink-soft block text-[9px] uppercase font-bold tracking-wider mb-0.5">App Tasks Done</span>
                        <p className="text-ink font-semibold text-xs">
                          {c.tasks_completed_count || 0} Tasks
                        </p>
                        <p className="text-[10px] text-ink-soft mt-0.5">
                          {parseInt(c.active_nfts_count || 0) > 0 ? '👑 NFT Holder' : 'Standard User'}
                        </p>
                      </div>

                      {/* 5. Claim Sequence & Prev Payouts */}
                      <div className="bg-[#0b1329]/50 p-2.5 rounded-2xl border border-border/30">
                        <span className="text-ink-soft block text-[9px] uppercase font-bold tracking-wider mb-0.5">Claim Sequence</span>
                        <p className="text-amber-400 font-black text-xs">
                          #{c.claim_seq || 1} Attempt
                        </p>
                        <p className="text-[10px] text-ink-soft mt-0.5">
                          {c.approved_gram_claims_count ? `${c.approved_gram_claims_count} Paid Before` : '1st Payout'}
                        </p>
                      </div>

                      {/* 6. Referrals */}
                      <div className="bg-[#0b1329]/50 p-2.5 rounded-2xl border border-border/30">
                        <span className="text-ink-soft block text-[9px] uppercase font-bold tracking-wider mb-0.5">Referrals</span>
                        <p className="text-ink font-semibold text-xs">
                          {c.valid_referrals || 0} / {c.total_referrals || 0} Valid
                        </p>
                        <p className="text-[10px] text-ink-soft mt-0.5">
                          Lifetime: {c.total_ads_watched || 0} Ads
                        </p>
                      </div>

                    </div>

                    {/* RISK / GOOD FLAGS CHIPS */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {c.risk_flags?.map((flag, fIdx) => (
                        <span key={fIdx} className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          ⚠️ {flag}
                        </span>
                      ))}
                      {c.good_flags?.slice(0, 3).map((good, gIdx) => (
                        <span key={gIdx} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20 flex items-center gap-1">
                          ✓ {good}
                        </span>
                      ))}
                    </div>

                  </div>

                  {/* REWARD AMOUNT & ACTION BUTTONS */}
                  <div className="flex flex-col items-end gap-3 shrink-0 w-full md:w-auto md:border-l border-border/50 md:pl-6 pt-4 md:pt-0">
                    <div className="text-right">
                      <p className="text-[10px] text-ink-soft font-black uppercase tracking-wider">Reward</p>
                      <p className="text-2xl font-black text-amber-400 font-mono">{c.amount} <span className="text-xs text-amber-400/50">GRAM</span></p>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                      {/* Deep Audit Button */}
                      <button
                        onClick={() => handleViewAds(c.telegram_id, c.username, c.first_name, false, c.requested_at, c)}
                        className="px-3 py-2.5 rounded-xl border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/15 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                        title="Open Deep Audit Log"
                      >
                        <Eye size={15} />
                        <span>Audit</span>
                      </button>

                      {/* Warn Button */}
                      <button
                        onClick={() => handleWarn(c)}
                        title="Send warning to user about sharing proof in community"
                        className="px-3 py-2.5 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/15 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                      >
                        <AlertTriangle size={15} />
                        <span>Warn</span>
                      </button>

                      {/* Reject Button */}
                      <button
                        onClick={() => handleReview(c.claim_id, 'reject', c)}
                        disabled={processingId === c.claim_id}
                        className="px-3.5 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/15 text-xs font-bold transition-all flex items-center justify-center shrink-0 disabled:opacity-50"
                        title="Reject Claim"
                      >
                        <XCircle size={16} />
                      </button>

                      {/* Mark Paid Button */}
                      <button
                        onClick={() => handleReview(c.claim_id, 'approve', c)}
                        disabled={processingId === c.claim_id}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 size={16} /> Mark Paid
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
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
                
                <div className="flex-1 w-full space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {h.status === 'approved' ? (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      ) : (
                        <XCircle size={18} className="text-rose-400" />
                      )}
                      <span className="font-black text-white text-lg tracking-tight">
                        {h.live_name || h.first_name || 'User'}
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

                  {/* Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                    <div className="bg-[#0b1329]/30 p-2 rounded-xl border border-border/30">
                      <span className="text-ink-soft block text-[9px] uppercase font-bold">Joined</span>
                      <span className="text-ink font-semibold">{h.created_at ? new Date(h.created_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="bg-[#0b1329]/30 p-2 rounded-xl border border-border/30">
                      <span className="text-ink-soft block text-[9px] uppercase font-bold">Claim Ads</span>
                      <span 
                        onClick={() => handleViewAds(h.telegram_id, h.username, h.first_name, true, h.requested_at, h)}
                        className="text-amber-400 font-bold cursor-pointer hover:underline"
                      >
                        {h.today_gram_ads_watched || 0} ads (View)
                      </span>
                    </div>
                    <div className="bg-[#0b1329]/30 p-2 rounded-xl border border-border/30">
                      <span className="text-ink-soft block text-[9px] uppercase font-bold">Watch Time</span>
                      <span className="text-ink font-semibold">{h.watch_duration_mins ? `${h.watch_duration_mins}m` : 'N/A'}</span>
                    </div>
                    <div className="bg-[#0b1329]/30 p-2 rounded-xl border border-border/30">
                      <span className="text-ink-soft block text-[9px] uppercase font-bold">App Tasks</span>
                      <span className="text-ink font-semibold">{h.tasks_completed_count || 0} Tasks</span>
                    </div>
                    <div className="bg-[#0b1329]/30 p-2 rounded-xl border border-border/30">
                      <span className="text-ink-soft block text-[9px] uppercase font-bold">Claim Seq</span>
                      <span className="text-amber-400 font-bold">#{h.claim_seq || 1}</span>
                    </div>
                    <div className="bg-[#0b1329]/30 p-2 rounded-xl border border-border/30">
                      <span className="text-ink-soft block text-[9px] uppercase font-bold">Referrals</span>
                      <span className="text-ink font-semibold">{h.valid_referrals || 0}/{h.total_referrals || 0}</span>
                    </div>
                  </div>

                  {h.tx_hash && (
                    <div className="text-xs font-medium text-emerald-400 flex items-center gap-1.5 pl-1">
                      <span>🔗 Payment Proof:</span>
                      <a
                        href={h.tx_hash.trim().startsWith('http') ? h.tx_hash.trim() : `https://tonviewer.com/transaction/${h.tx_hash.trim()}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-bold hover:text-emerald-300 transition-colors"
                      >
                        View On Tonviewer
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end justify-center shrink-0 md:border-l border-border/50 md:pl-6">
                  <p className="text-xl font-black text-ink font-mono">{h.amount} <span className="text-xs text-ink-soft">GRAM</span></p>
                  <div className="mt-2">
                    {h.status === 'approved' ? (
                      <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-black px-3.5 py-1.5 rounded-xl text-xs uppercase tracking-wider">PAID</span>
                    ) : (
                      <div className="text-right">
                        <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 font-black px-3.5 py-1.5 rounded-xl text-xs uppercase tracking-wider block mb-1">REJECTED</span>
                        {h.rejection_reason && <span className="text-[10px] text-rose-400/80 block max-w-xs truncate" title={h.rejection_reason}>{h.rejection_reason}</span>}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )
      )}

      {/* ── DEEP AUDIT & AD LOGS MODAL ── */}
      {selectedUserAds && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-border w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <button 
              onClick={() => setSelectedUserAds(null)} 
              className="absolute top-4 right-4 text-ink-soft hover:text-rose-400 p-2 hover:bg-rose-500/10 rounded-xl transition-all"
              title="Close Dialog"
            >
              <XCircle size={22} />
            </button>
            
            <h3 className="text-xl font-black text-ink mb-1 flex items-center gap-2.5">
              <ShieldCheck className="text-emerald-400" size={24} /> User Verification & Ad Logs
            </h3>
            <p className="text-xs text-ink-soft mb-4">
              Detailed audit trail for <span className="text-amber-400 font-bold">{selectedUserAds.name}</span> (ID: {selectedUserAds.telegram_id})
            </p>

            {/* AUDIT SUMMARY CHIP MATRIX */}
            {selectedUserAds.claim && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-3 rounded-2xl bg-surface-soft border border-border/50 text-xs">
                <div className="p-2 rounded-xl bg-black/30">
                  <span className="text-ink-soft block text-[9px] uppercase font-bold">Suffix Check</span>
                  <span className={`font-black ${selectedUserAds.claim.has_suffix ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {selectedUserAds.claim.has_suffix ? '✓ Active' : '✗ Missing'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-black/30">
                  <span className="text-ink-soft block text-[9px] uppercase font-bold">Community Group</span>
                  <span className={`font-black ${selectedUserAds.claim.in_community ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedUserAds.claim.in_community ? '✓ Member' : '✗ Not Joined'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-black/30">
                  <span className="text-ink-soft block text-[9px] uppercase font-bold">Official Channel</span>
                  <span className={`font-black ${selectedUserAds.claim.in_channel ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedUserAds.claim.in_channel ? '✓ Member' : '✗ Not Joined'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-black/30">
                  <span className="text-ink-soft block text-[9px] uppercase font-bold">Watching Pace</span>
                  <span className={`font-black ${parseFloat(selectedUserAds.claim.watch_duration_mins || 0) < 3.0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selectedUserAds.claim.watch_duration_mins ? `${selectedUserAds.claim.watch_duration_mins}m` : 'Normal'}
                  </span>
                </div>
              </div>
            )}

            {/* Provider Breakdown Summary */}
            {!loadingAds && adsList.length > 0 && (
              <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-surface-soft border border-border/50 text-xs font-bold">
                <span className="text-ink-soft">Total Ads Logged: <span className="text-white font-black">{adsList.length}</span></span>
                <span className="text-ink-faint">•</span>
                <span className="text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20">
                  🟣 GigaPub: {adsList.filter(a => a.ad_type !== 'gram_monetag').length}
                </span>
                <span className="text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                  🟡 Monetag: {adsList.filter(a => a.ad_type === 'gram_monetag').length}
                </span>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-border/50">
              {loadingAds ? (
                <div className="py-16 flex flex-col items-center justify-center text-amber-500 gap-3">
                  <div className="w-8 h-8 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin"></div>
                  <span className="text-xs font-bold tracking-wider uppercase">Auditing ad view logs...</span>
                </div>
              ) : adsList.length === 0 ? (
                <div className="py-16 text-center text-ink-soft text-sm">
                  No Gram ads found in database logs.
                </div>
              ) : (
                <div className="divide-y divide-border/20 border-t border-b border-border/20">
                  {adsList.map((ad, idx) => {
                    const adTime = new Date(ad.created_at).getTime();
                    let inWindow = false;
                    const reqTime = selectedUserAds.requested_at ? new Date(selectedUserAds.requested_at).getTime() : Date.now();
                    inWindow = adTime >= (reqTime - 24 * 60 * 60 * 1000) && adTime <= reqTime;
                    
                    const isMonetag = ad.ad_type === 'gram_monetag';

                    // Compute interval to previous ad
                    let intervalSec = null;
                    if (idx > 0 && adsList[idx - 1]) {
                      const prevTime = new Date(adsList[idx - 1].created_at).getTime();
                      intervalSec = Math.abs(Math.round((prevTime - adTime) / 1000));
                    }

                    return (
                      <div key={ad.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-[#0a0f1c]/50 px-2.5 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-ink-faint font-mono font-bold w-6">#{idx + 1}</span>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{new Date(ad.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                              <span className="text-[10px] text-ink-faint font-mono">{new Date(ad.created_at).toLocaleDateString()}</span>
                              <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                                isMonetag ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              }`}>
                                {isMonetag ? 'Monetag' : 'GigaPub'}
                              </span>
                            </div>
                            {intervalSec !== null && (
                              <span className={`text-[10px] font-mono mt-0.5 ${intervalSec < 3 ? 'text-rose-400 font-bold' : 'text-ink-soft'}`}>
                                Interval: +{intervalSec}s {intervalSec < 3 ? '🚨 (Fast)' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          {inWindow ? (
                            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full">
                              Claim Window
                            </span>
                          ) : (
                            <span className="bg-slate-500/10 text-ink-faint border border-slate-500/10 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full">
                              Prior History
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center">
              <span className="text-xs text-ink-soft">
                Audit Status: <span className="text-emerald-400 font-bold">100% Real-Time Synchronized</span>
              </span>
              <button 
                onClick={() => setSelectedUserAds(null)}
                className="px-6 py-2 rounded-xl bg-surface-soft hover:bg-border text-ink font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      <ApprovePayoutModal
        isOpen={!!approveModalItem}
        onClose={() => setApproveModalItem(null)}
        onConfirm={handleApproveConfirm}
        walletAddress={approveModalItem?.gram_wallet_address || ''}
        amount={approveModalItem?.amount || '0.02'}
        token="GRAM"
        userName={approveModalItem?.username ? `@${approveModalItem.username}` : (approveModalItem?.first_name || 'User')}
        isProcessing={!!processingId}
      />
    </div>
  );
}


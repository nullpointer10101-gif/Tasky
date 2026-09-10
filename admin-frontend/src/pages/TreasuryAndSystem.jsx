import React, { useState, useEffect } from 'react';
import {
  Wallet, Activity, RefreshCw, ExternalLink, Check, Copy, AlertTriangle,
  Server, Database, Cpu, Radio, ShieldCheck, ArrowDownLeft, ArrowUpRight,
  Clock, CheckCircle, XCircle, Search, Filter, Layers, Zap, Gem, Coins,
  Bot, Tv, BarChart3, ChevronRight
} from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function TreasuryAndSystem() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all', 'payouts', 'deposits'
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get('/treasury-status');
      if (res.data && res.data.success) {
        setData(res.data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Error fetching treasury status:', err);
      toast.error('Failed to load treasury & system status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 20000);
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName}!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const treasury = data?.treasuryWallet || {};
  const system = data?.systemInfo || {};
  const totals = data?.totals || {};
  const db = data?.databaseStatus || {};
  const tonRpc = data?.tonRpcStatus || {};
  const transactions = data?.transactions || [];

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'payouts' && !tx.category?.includes('payout')) return false;
    if (filterType === 'deposits' && tx.category !== 'deposit') return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const matchUser = (tx.username || '').toLowerCase().includes(term);
    const matchName = (tx.first_name || '').toLowerCase().includes(term);
    const matchId = String(tx.telegram_id || '').includes(term);
    const matchHash = (tx.tx_hash || '').toLowerCase().includes(term);
    const matchWallet = (tx.wallet_address || '').toLowerCase().includes(term);
    return matchUser || matchName || matchId || matchHash || matchWallet;
  });

  const heapPercentage = system.memory?.heapTotalMB && system.memory?.heapUsedMB
    ? Math.min(100, Math.round((parseFloat(system.memory.heapUsedMB) / parseFloat(system.memory.heapTotalMB)) * 100))
    : 0;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Wallet size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                Treasury & System Health
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Live on-chain treasury balances, recent blockchain/app transactions, server metrics & service status
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden md:inline">
            Updated: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-cyan-400' : 'text-cyan-400'} />
            {loading ? 'Refreshing...' : 'Refresh Status'}
          </button>
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Treasury TON Balance */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 relative overflow-hidden shadow-xl shadow-cyan-500/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Treasury Balance</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${treasury.lowBalanceWarning ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'}`}>
              {treasury.lowBalanceWarning ? '⚠️ Top-up Needed' : '🟢 Ready'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tracking-tight">
              {treasury.balanceTon !== undefined ? Number(treasury.balanceTon).toFixed(4) : '0.0000'}
            </span>
            <span className="text-sm font-extrabold text-cyan-400">TON</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            <Zap size={12} className="text-amber-400" />
            Auto-Payouts active for ≤ 0.03 TON
          </p>
        </div>

        {/* Circulating / Deposited GRAM */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden shadow-xl shadow-emerald-500/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total GRAM Deposited</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {totals.count_deposits || 0} Deposits
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 tracking-tight">
              +{Number(totals.total_gram_deposited || 0).toFixed(3)}
            </span>
            <span className="text-sm font-extrabold text-emerald-400">GRAM</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            <ArrowDownLeft size={12} className="text-emerald-400" />
            Direct user on-chain deposits
          </p>
        </div>

        {/* Total GRAM Payouts Distributed */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-purple-500/30 rounded-2xl p-5 relative overflow-hidden shadow-xl shadow-purple-500/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">GRAM Paid Out</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30">
              {totals.count_gram_paid || 0} Paid
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-300 tracking-tight">
              {Number(totals.total_gram_paid || 0).toFixed(3)}
            </span>
            <span className="text-sm font-extrabold text-purple-400">GRAM</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            <ArrowUpRight size={12} className="text-purple-400" />
            {totals.pending_gram_payouts || 0} pending review
          </p>
        </div>

        {/* Server Health Status */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-indigo-500/30 rounded-2xl p-5 relative overflow-hidden shadow-xl shadow-indigo-500/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Server Uptime</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Render Online
            </span>
          </div>
          <div className="text-xl font-black text-white tracking-tight truncate">
            {system.uptimeFormatted || 'Running'}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            <Cpu size={12} className="text-indigo-400" />
            RAM: {system.memory?.rssMB || '0'} MB (Heap: {system.memory?.heapUsedMB || '0'} MB)
          </p>
        </div>
      </div>

      {/* Treasury Wallet Address Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 text-[11px] font-black uppercase tracking-wider border border-indigo-500/30 flex items-center gap-1.5">
                <ShieldCheck size={14} /> Treasury Wallet Address
              </span>
              {treasury.configured && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  TON V4 Contract
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm sm:text-base md:text-lg font-black text-white select-all break-all">
                {treasury.addressFriendly || 'UQ... (Set in TREASURY_MNEMONIC)'}
              </span>
              {treasury.addressFriendly && (
                <button
                  onClick={() => copyToClipboard(treasury.addressFriendly, 'Treasury Address')}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Copy Friendly Address"
                >
                  {copiedField === 'Treasury Address' ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                </button>
              )}
            </div>

            {treasury.addressRaw && (
              <p className="font-mono text-xs text-slate-400 select-all truncate max-w-2xl">
                Raw: {treasury.addressRaw}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {treasury.addressFriendly && (
              <>
                <a
                  href={treasury.explorerTonviewer || `https://tonviewer.com/${treasury.addressFriendly}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white rounded-xl text-xs font-bold border border-indigo-500/40 transition-all shadow-md"
                >
                  <ExternalLink size={14} /> View on Tonviewer
                </a>
                <a
                  href={treasury.explorerTonscan || `https://tonscan.org/address/${treasury.addressFriendly}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-all shadow-md"
                >
                  <ExternalLink size={14} /> Tonscan
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* System Status & Health Metrics Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <Server className="text-indigo-400" size={20} /> System Components Health
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Database */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Database size={14} className="text-blue-400" /> PostgreSQL DB
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${db.connected ? 'bg-emerald-400 shadow-lg shadow-emerald-500/50' : 'bg-red-400'}`}></span>
            </div>
            <p className="text-lg font-black text-white">
              {db.connected ? 'Connected' : 'Disconnected'}
            </p>
            <p className="text-xs text-slate-400">
              Ping Latency: <span className="text-emerald-400 font-bold">{db.pingMs >= 0 ? `${db.pingMs} ms` : 'Error'}</span>
            </p>
          </div>

          {/* TON RPC Node */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Radio size={14} className="text-cyan-400" /> TON RPC Network
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${tonRpc.connected ? 'bg-emerald-400 shadow-lg shadow-emerald-500/50' : 'bg-amber-400'}`}></span>
            </div>
            <p className="text-lg font-black text-white">
              {tonRpc.connected ? 'Mainnet Operational' : 'Checking RPC'}
            </p>
            <p className="text-xs text-slate-400 truncate">
              Latency: <span className="text-cyan-400 font-bold">{tonRpc.latencyMs || 0} ms</span> (Seqno: {tonRpc.latestSeqno || 'Live'})
            </p>
          </div>

          {/* Telegram Bot */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Bot size={14} className="text-indigo-400" /> Telegram Bot
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/50"></span>
            </div>
            <p className="text-lg font-black text-white">
              @TaskyAppbot
            </p>
            <p className="text-xs text-slate-400">
              Proof Channel: <span className="text-indigo-400 font-bold">Connected</span>
            </p>
          </div>

          {/* Ad Providers */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Tv size={14} className="text-pink-400" /> Ad Providers
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/50"></span>
            </div>
            <p className="text-lg font-black text-white">
              GigaPub + Adexium
            </p>
            <p className="text-xs text-slate-400">
              Failover: <span className="text-emerald-400 font-bold">100% Active</span>
            </p>
          </div>
        </div>
      </div>

      {/* Previous Transactions Section */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Activity className="text-cyan-400" size={20} /> Previous Transactions & Activity
            </h2>
            <p className="text-xs text-slate-400">
              Real-time feed of recent on-chain deposits, outgoing payouts, and task transactions
            </p>
          </div>

          {/* Filter Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Filter buttons */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterType === 'all' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                All ({transactions.length})
              </button>
              <button
                onClick={() => setFilterType('payouts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterType === 'payouts' ? 'bg-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Payouts
              </button>
              <button
                onClick={() => setFilterType('deposits')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterType === 'deposits' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Deposits
              </button>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search user, ID, or tx hash..."
                className="pl-8 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-full sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-3">Type</th>
                <th className="pb-3 px-3">User</th>
                <th className="pb-3 px-3">Amount</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Transaction / Wallet</th>
                <th className="pb-3 px-3 text-right">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No transactions found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredTransactions.slice(0, 50).map((tx, idx) => {
                  const isDeposit = tx.category === 'deposit';
                  const isGramPayout = tx.category === 'gram_payout';
                  const isDone = tx.status === 'approved' || tx.status === 'done' || tx.status === 'completed';
                  const isPending = tx.status === 'pending';

                  return (
                    <tr key={tx.id ? `${tx.category}-${tx.id}` : idx} className="hover:bg-slate-800/30 transition-colors">
                      {/* Type Badge */}
                      <td className="py-3 px-3">
                        {isDeposit ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                            <ArrowDownLeft size={12} /> Deposit
                          </span>
                        ) : isGramPayout ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-purple-500/15 text-purple-300 border border-purple-500/20">
                            <ArrowUpRight size={12} /> GRAM Payout
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-blue-500/15 text-blue-300 border border-blue-500/20">
                            <Coins size={12} /> TASKY Payout
                          </span>
                        )}
                      </td>

                      {/* User Info */}
                      <td className="py-3 px-3">
                        <div>
                          <p className="font-bold text-white truncate max-w-[150px]">
                            {tx.first_name || 'User'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {tx.username ? `@${tx.username}` : `ID: ${tx.telegram_id}`}
                          </p>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3">
                        <span className={`font-black text-sm ${isDeposit ? 'text-emerald-400' : 'text-purple-300'}`}>
                          {isDeposit ? '+' : '-'}{Number(tx.amount || 0).toFixed(3)} {tx.currency || 'GRAM'}
                        </span>
                        {tx.is_auto_payout && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/30">
                            ⚡ Auto
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isDone
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isPending
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {isDone ? <CheckCircle size={10} /> : isPending ? <Clock size={10} /> : <XCircle size={10} />}
                          {tx.status || 'Processed'}
                        </span>
                      </td>

                      {/* Tx Hash / Explorer */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                        {tx.tx_hash ? (
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[120px]">{tx.tx_hash}</span>
                            <button
                              onClick={() => copyToClipboard(tx.tx_hash, 'TX Hash')}
                              className="text-slate-400 hover:text-white"
                              title="Copy Hash"
                            >
                              <Copy size={12} />
                            </button>
                            <a
                              href={`https://tonviewer.com/transaction/${tx.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300"
                              title="View on Tonviewer"
                            >
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        ) : tx.wallet_address ? (
                          <span className="truncate max-w-[130px] block" title={tx.wallet_address}>
                            {tx.wallet_address.slice(0, 6)}...{tx.wallet_address.slice(-4)}
                          </span>
                        ) : (
                          <span className="text-slate-500">Internal Claim</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-right text-slate-400 text-[11px] whitespace-nowrap">
                        {tx.created_at ? new Date(tx.created_at).toLocaleString() : 'Recent'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

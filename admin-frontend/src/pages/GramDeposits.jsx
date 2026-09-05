import React, { useState, useEffect } from 'react';
import { ArrowDownLeft, Users, RefreshCw, CheckCircle, ExternalLink, ShieldCheck, Eye, X, Coins, Gem, ArrowUpRight } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function GramDeposits() {
  const [data, setData] = useState({ stats: {}, depositors: [], deposits: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepositor, setSelectedDepositor] = useState(null);

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gram-deposits');
      if (res.data && res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching GRAM deposits:', err);
      toast.error('Failed to load GRAM deposits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, []);

  const depositorsList = data.depositors && data.depositors.length > 0 ? data.depositors : [];

  const filteredDepositors = depositorsList.filter(d => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const matchName = (d.first_name || '').toLowerCase().includes(term);
    const matchUser = (d.username || '').toLowerCase().includes(term);
    const matchId = (d.telegram_id || '').toString().includes(term);
    const matchTx = (d.deposits || []).some(dep => (dep.tx_hash || '').toLowerCase().includes(term));
    return matchName || matchUser || matchId || matchTx;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <ArrowDownLeft className="text-emerald-400" /> Direct GRAM / TON Deposits
          </h1>
          <p className="text-sm text-slate-400">View grouped user deposit accounts, total deposited amounts, and deposit transaction histories</p>
        </div>
        <button
          onClick={fetchDeposits}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all self-start sm:self-auto shadow-md"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Deposits
        </button>
      </div>

      {/* Overview Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-emerald-500/5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
            <ArrowDownLeft size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold truncate">Total GRAM Deposited</p>
            <p className="text-2xl font-black text-emerald-400 truncate">+{Number(data.stats.total_gram_deposited || 0).toFixed(3)} GRAM</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-blue-500/5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold truncate">Total Verified Deposits</p>
            <p className="text-2xl font-black text-white truncate">{data.stats.total_deposits || 0}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-purple-500/5">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold shrink-0">
            <Users size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold truncate">Unique Depositor Accounts</p>
            <p className="text-2xl font-black text-purple-300 truncate">{data.stats.total_depositors || 0}</p>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search by User Name, Username, Telegram ID, or Transaction Hash..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <div className="text-xs font-mono text-slate-400 whitespace-nowrap bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/50">
          {filteredDepositors.length} Unique Account(s)
        </div>
      </div>

      {/* Grouped Depositors Table (No Duplicate Accounts!) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="animate-spin text-emerald-400" size={24} />
            <span>Loading Depositor Accounts...</span>
          </div>
        ) : filteredDepositors.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No verified depositor accounts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 uppercase tracking-wider text-[10px] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Account / User</th>
                  <th className="p-3.5">Total Deposited</th>
                  <th className="p-3.5">Deposit Count</th>
                  <th className="p-3.5">Available GRAM</th>
                  <th className="p-3.5">Latest Tx Hash</th>
                  <th className="p-3.5">Auto Verified</th>
                  <th className="p-3.5">Latest Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredDepositors.map((d) => (
                  <tr
                    key={d.telegram_id}
                    onClick={() => setSelectedDepositor(d)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="p-3.5 font-bold text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-md">
                          {(d.first_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-extrabold group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                            {d.first_name || 'User'}
                          </div>
                          <div className="text-[10px] text-purple-400 font-mono">
                            @{d.username || d.telegram_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-black text-emerald-400 text-sm">
                      +{Number(d.total_deposited_gram || 0).toFixed(3)} GRAM
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-black">
                        {d.deposit_count} Deposit{d.deposit_count > 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="p-3.5 font-black text-cyan-400 text-xs">
                      +{Number(d.gram_balance || 0).toFixed(3)} GRAM
                    </td>
                    <td className="p-3.5 font-mono text-[11px]">
                      {d.latest_tx_hash ? (
                        <a
                          href={`https://tonviewer.com/transaction/${d.latest_tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-400 hover:underline flex items-center gap-1 max-w-[140px] truncate"
                        >
                          <span className="truncate">{d.latest_tx_hash}</span>
                          <ExternalLink size={12} className="shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </td>
                    <td className="p-3.5 font-bold text-slate-300">
                      {d.auto_verified ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle size={14} /> On-Chain Auto
                        </span>
                      ) : (
                        <span className="text-slate-400">Manual</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-300 font-medium text-xs whitespace-nowrap">
                      {new Date(d.latest_deposit_at).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {d.status || 'APPROVED'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDepositor(d);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl text-xs font-bold border border-emerald-500/30 transition-all shadow-sm"
                      >
                        <Eye size={13} /> View Deposits
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Depositor Detail Modal */}
      {selectedDepositor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-lg shadow-lg">
                  {(selectedDepositor.first_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    {selectedDepositor.first_name || 'User'}
                    {selectedDepositor.username && (
                      <span className="text-xs font-bold text-purple-400 font-mono bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                        @{selectedDepositor.username}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Telegram ID: <span className="text-slate-200 font-bold">{selectedDepositor.telegram_id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDepositor(null)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Financial Metrics Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/60 border border-emerald-500/30 p-4 rounded-2xl text-center">
                  <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider">Total Deposited</p>
                  <p className="text-xl font-black text-emerald-400 mt-1">+{Number(selectedDepositor.total_deposited_gram || 0).toFixed(3)} GRAM</p>
                </div>
                <div className="bg-slate-800/60 border border-purple-500/30 p-4 rounded-2xl text-center">
                  <p className="text-[10px] font-bold text-purple-400/80 uppercase tracking-wider">Deposit Count</p>
                  <p className="text-xl font-black text-purple-300 mt-1">{selectedDepositor.deposit_count} Transaction(s)</p>
                </div>
                <div className="bg-slate-800/60 border border-cyan-500/30 p-4 rounded-2xl text-center">
                  <p className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-wider">Current Account Balance</p>
                  <p className="text-xl font-black text-cyan-400 mt-1">+{Number(selectedDepositor.gram_balance || 0).toFixed(3)} GRAM</p>
                </div>
              </div>

              {/* Transactions Table */}
              <div>
                <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
                  <ArrowDownLeft size={16} className="text-emerald-400" /> Individual Deposit Transactions
                </h3>
                <div className="bg-slate-800/40 rounded-2xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800 uppercase tracking-wider text-[10px] text-slate-400 border-b border-slate-700">
                      <tr>
                        <th className="p-3">Date & Time</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Auto Verified</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Tx Hash</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(selectedDepositor.deposits || []).map((d) => (
                        <tr key={d.id} className="hover:bg-slate-800/50">
                          <td className="p-3 text-slate-300">
                            {new Date(d.created_at).toLocaleString()}
                          </td>
                          <td className="p-3 font-black text-emerald-400 text-sm">
                            +{Number(d.amount_gram || 0).toFixed(3)} GRAM
                          </td>
                          <td className="p-3 font-bold">
                            {d.auto_verified ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle size={13} /> On-Chain Auto
                              </span>
                            ) : (
                              <span className="text-slate-400">Manual</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                              {d.status || 'approved'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-purple-400">
                            {d.tx_hash ? (
                              <a
                                href={`https://tonviewer.com/transaction/${d.tx_hash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline flex items-center gap-1 justify-end text-[11px] text-blue-400"
                              >
                                {d.tx_hash.slice(0, 6)}...{d.tx_hash.slice(-6)} <ArrowUpRight size={11} />
                              </a>
                            ) : (
                              <span className="text-slate-500">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

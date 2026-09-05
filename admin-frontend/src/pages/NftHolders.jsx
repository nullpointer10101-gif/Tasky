import React, { useState, useEffect } from 'react';
import { Sparkles, Users, RefreshCw, Zap, Rocket, CheckCircle, Clock, Gem, Coins, Flame, Eye, X, ArrowUpRight, ShieldCheck, Wallet, ChevronRight, Layers, CreditCard } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function NftHolders() {
  const [data, setData] = useState({ stats: {}, users: [], holders: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState('miners'); // 'miners' | 'deposits'

  const fetchHolders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/nft-holders');
      if (res.data && res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching NFT holders:', err);
      toast.error('Failed to load NFT holders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolders();
  }, []);

  // Filter users by search term (User Name, Username, Telegram ID, or NFT card names owned)
  const usersList = data.users && data.users.length > 0 ? data.users : [];

  const filteredUsers = usersList.filter(u => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const matchName = (u.first_name || '').toLowerCase().includes(term);
    const matchUser = (u.username || '').toLowerCase().includes(term);
    const matchId = (u.telegram_id || '').toString().includes(term);
    const matchNft = (u.miners || []).some(m => (m.nft_name || '').toLowerCase().includes(term));
    return matchName || matchUser || matchId || matchNft;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Sparkles className="text-purple-400" /> NFT Miners & Holders
          </h1>
          <p className="text-sm text-slate-400">View grouped NFT accounts, total deposits, active daily returns, and individual account details</p>
        </div>
        <button
          onClick={fetchHolders}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all self-start sm:self-auto shadow-md"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Data
        </button>
      </div>

      {/* Global Overview Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg shadow-cyan-500/5">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold shrink-0">
            <Coins size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold truncate">Exact Available User GRAM</p>
            <p className="text-xl font-black text-cyan-400 truncate">+{Number(data.stats.total_gram_balance || 0).toFixed(3)} GRAM</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg shadow-emerald-500/5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
            <Gem size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold truncate">Total GRAM Deposited</p>
            <p className="text-xl font-black text-emerald-400 truncate">+{Number(data.stats.total_gram_deposited || 0).toFixed(3)} GRAM</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-purple-500/40 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg shadow-purple-500/5">
          <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold shrink-0">
            <Zap size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold truncate">Total Yield Distributed</p>
            <p className="text-xl font-black text-purple-400 truncate">+{Number(data.stats.total_yield_distributed || 0).toFixed(3)} GRAM</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg shadow-amber-500/5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shrink-0">
            <Rocket size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold truncate">Total Miners Sold</p>
            <p className="text-xl font-black text-amber-400 truncate">{data.stats.total_miners_sold || 0}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg shadow-indigo-500/5">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold shrink-0">
            <Users size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold truncate">Unique NFT Accounts</p>
            <p className="text-xl font-black text-white truncate">{data.stats.total_unique_holders || 0}</p>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-auto flex-1">
          <input
            type="text"
            placeholder="Search by User Name, Username, Telegram ID, or NFT Card..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <div className="text-xs font-mono text-slate-400 whitespace-nowrap bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/50">
          {filteredUsers.length} Unique Account(s)
        </div>
      </div>

      {/* Grouped User Table (No Duplicate Accounts!) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="animate-spin text-purple-400" size={24} />
            <span>Loading NFT Holders & Accounts...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No matching user accounts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 uppercase tracking-wider text-[10px] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Account / User</th>
                  <th className="p-3.5">Available GRAM</th>
                  <th className="p-3.5">Total Deposited</th>
                  <th className="p-3.5">Total Withdrawn</th>
                  <th className="p-3.5">Miners Owned</th>
                  <th className="p-3.5">Total Daily Return</th>
                  <th className="p-3.5">Total Yield Earned</th>
                  <th className="p-3.5">Max Withdraw Limit</th>
                  <th className="p-3.5">Purchased Date</th>
                  <th className="p-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredUsers.map((u) => {
                  const megaCount = u.miners.filter(m => m.price_gram >= 5.0).length;
                  const turboCount = u.miners.filter(m => m.price_gram >= 1.0 && m.price_gram < 5.0).length;
                  const miniCount = u.miners.filter(m => m.price_gram < 1.0).length;
                  const purchaseDate = u.latest_purchased_at || u.miners?.[0]?.purchased_at;

                  return (
                    <tr
                      key={u.telegram_id}
                      onClick={() => { setSelectedUser(u); setActiveTab('miners'); }}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      <td className="p-3.5 font-bold text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-md">
                            {(u.first_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-white font-extrabold group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                              {u.first_name || 'User'}
                            </div>
                            <div className="text-[10px] text-purple-400 font-mono">
                              @{u.username || u.telegram_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-black text-cyan-400 text-sm">
                        +{Number(u.gram_balance || 0).toFixed(3)} GRAM
                      </td>
                      <td className="p-3.5 font-black text-emerald-400">
                        +{Number(u.total_deposited_gram || 0).toFixed(3)} GRAM
                      </td>
                      <td className="p-3.5 font-black text-rose-400">
                        +{Number(u.total_withdrawn_gram || 0).toFixed(3)} GRAM
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-black">
                            {u.miners_count} Miner{u.miners_count > 1 ? 's' : ''}
                          </span>
                          {megaCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[10px] font-bold flex items-center gap-0.5">
                              <Flame size={10} /> {megaCount}x Mega
                            </span>
                          )}
                          {turboCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-0.5">
                              <Rocket size={10} /> {turboCount}x Turbo
                            </span>
                          )}
                          {miniCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold flex items-center gap-0.5">
                              <Zap size={10} /> {miniCount}x Mini
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 font-black text-emerald-400 text-xs">
                        +{Number(u.total_daily_yield || 0).toFixed(2)} GRAM/day
                      </td>
                      <td className="p-3.5 font-black text-purple-300 text-xs">
                        +{Number(u.total_earned_gram || 0).toFixed(3)} GRAM
                      </td>
                      <td className="p-3.5 font-black text-amber-300 font-mono text-xs">
                        {Number(u.max_withdrawal_limit || 0.02).toFixed(2)} GRAM/d
                      </td>
                      <td className="p-3.5 text-slate-300 font-medium text-xs whitespace-nowrap">
                        {purchaseDate ? new Date(purchaseDate).toLocaleString() : 'N/A'}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(u);
                            setActiveTab('miners');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white rounded-xl text-xs font-bold border border-purple-500/30 transition-all shadow-sm"
                        >
                          <Eye size={13} /> View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-cyan-500 flex items-center justify-center text-white font-black text-lg shadow-lg">
                  {(selectedUser.first_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    {selectedUser.first_name || 'User'}
                    {selectedUser.username && (
                      <span className="text-xs font-bold text-purple-400 font-mono bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                        @{selectedUser.username}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Telegram ID: <span className="text-slate-200 font-bold">{selectedUser.telegram_id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Financial Metrics Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                <div className="bg-slate-800/60 border border-cyan-500/30 p-3 rounded-2xl">
                  <p className="text-[9px] font-bold text-cyan-400/80 uppercase tracking-wider">Available Balance</p>
                  <p className="text-base font-black text-cyan-400 mt-1">+{Number(selectedUser.gram_balance || 0).toFixed(3)} GRAM</p>
                </div>
                <div className="bg-slate-800/60 border border-emerald-500/30 p-3 rounded-2xl">
                  <p className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-wider">Total Deposited</p>
                  <p className="text-base font-black text-emerald-400 mt-1">+{Number(selectedUser.total_deposited_gram || 0).toFixed(3)} GRAM</p>
                </div>
                <div className="bg-slate-800/60 border border-rose-500/30 p-3 rounded-2xl">
                  <p className="text-[9px] font-bold text-rose-400/80 uppercase tracking-wider">Total Withdrawn</p>
                  <p className="text-base font-black text-rose-400 mt-1">+{Number(selectedUser.total_withdrawn_gram || 0).toFixed(3)} GRAM</p>
                </div>
                <div className="bg-slate-800/60 border border-orange-500/30 p-3 rounded-2xl">
                  <p className="text-[9px] font-bold text-orange-400/80 uppercase tracking-wider">Spent on Miners</p>
                  <p className="text-base font-black text-orange-400 mt-1">{Number(selectedUser.total_spent_gram || 0).toFixed(2)} GRAM</p>
                </div>
                <div className="bg-slate-800/60 border border-purple-500/30 p-3 rounded-2xl">
                  <p className="text-[9px] font-bold text-purple-400/80 uppercase tracking-wider">Daily Return</p>
                  <p className="text-base font-black text-purple-300 mt-1">+{Number(selectedUser.total_daily_yield || 0).toFixed(2)} GRAM/d</p>
                </div>
                <div className="bg-slate-800/60 border border-amber-500/30 p-3 rounded-2xl col-span-2 sm:col-span-1">
                  <p className="text-[9px] font-bold text-amber-400/80 uppercase tracking-wider">Max Daily Limit</p>
                  <p className="text-base font-black text-amber-300 mt-1">{Number(selectedUser.max_withdrawal_limit || 0.02).toFixed(2)} GRAM/d</p>
                </div>
              </div>

              {/* Tabs Switcher */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
                <button
                  onClick={() => setActiveTab('miners')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'miners'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers size={14} /> Owned NFT Miners ({selectedUser.miners?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('deposits')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'deposits'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard size={14} /> Deposit History ({selectedUser.deposits?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('withdrawals')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'withdrawals'
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowUpRight size={14} /> Gram Withdrawals ({selectedUser.withdrawals?.length || 0})
                </button>
              </div>

              {/* Tab 1: Owned Miners List */}
              {activeTab === 'miners' && (
                <div>
                  {(!selectedUser.miners || selectedUser.miners.length === 0) ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-800">
                      No NFT miners owned by this account.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedUser.miners.map((m, idx) => {
                        const isMega = m.price_gram >= 5.0;
                        const isTurbo = m.price_gram >= 1.0 && m.price_gram < 5.0;
                        const claimsDone = m.claims_done || 0;
                        const durationDays = m.duration_days || 10;
                        const isComplete = claimsDone >= durationDays || m.is_completed;
                        const progressPercent = Math.min(100, Math.round((claimsDone / durationDays) * 100));

                        return (
                          <div
                            key={m.instance_id || idx}
                            className={`p-4 rounded-2xl border transition-all ${
                              isMega
                                ? 'bg-gradient-to-br from-orange-950/40 via-slate-900 to-slate-900 border-orange-500/50 shadow-lg shadow-orange-950/20'
                                : isTurbo
                                ? 'bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border-amber-500/40 shadow-lg shadow-purple-950/20'
                                : 'bg-slate-800/40 border-slate-700/60'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                                  isMega ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : isTurbo ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                                }`}>
                                  {isMega ? <Flame size={16} /> : isTurbo ? <Rocket size={16} /> : <Zap size={16} />}
                                </div>
                                <div>
                                  <h4 className="text-sm font-black text-white">{m.nft_name}</h4>
                                  <p className="text-[10px] text-slate-400">
                                    Purchased: {new Date(m.purchased_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                isComplete ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              }`}>
                                {isComplete ? 'COMPLETED' : 'ACTIVE MINING'}
                              </span>
                            </div>

                            {/* Stats breakdown */}
                            <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-white/5 mb-3 text-center">
                              <div>
                                <p className="text-[9px] text-slate-400 uppercase font-bold">Price Paid</p>
                                <p className="text-xs font-black text-amber-300 mt-0.5">{m.price_gram} GRAM</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-slate-400 uppercase font-bold">Daily Yield</p>
                                <p className="text-xs font-black text-emerald-400 mt-0.5">+{m.daily_yield_gram} GRAM</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-slate-400 uppercase font-bold">Total Earned</p>
                                <p className="text-xs font-black text-purple-300 mt-0.5">+{Number(m.total_earned_gram || 0).toFixed(3)} GRAM</p>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div>
                              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                                <span>Mining Progress</span>
                                <span className="text-purple-300 font-mono">{claimsDone} / {durationDays} Days ({progressPercent}%)</span>
                              </div>
                              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                                <div
                                  className="bg-gradient-to-r from-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Deposit History List */}
              {activeTab === 'deposits' && (
                <div>
                  {(!selectedUser.deposits || selectedUser.deposits.length === 0) ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-800">
                      No GRAM deposit transactions recorded for this account.
                    </div>
                  ) : (
                    <div className="bg-slate-800/40 rounded-2xl border border-slate-800 overflow-hidden">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-800 uppercase tracking-wider text-[10px] text-slate-400 border-b border-slate-700">
                          <tr>
                            <th className="p-3">Deposit Date</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Tx Hash</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {selectedUser.deposits.map((d, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/50">
                              <td className="p-3 text-slate-300">
                                {new Date(d.created_at).toLocaleString()}
                              </td>
                              <td className="p-3 font-black text-emerald-400">
                                +{Number(d.amount_gram || 0).toFixed(3)} GRAM
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                  d.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                }`}>
                                  {d.status || 'approved'}
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono text-purple-400">
                                {d.tx_hash ? (
                                  <a
                                    href={`https://tonviewer.com/transaction/${d.tx_hash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:underline flex items-center gap-1 justify-end text-[11px]"
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
                  )}
                </div>
              )}

              {/* Tab 3: Withdrawal History List */}
              {activeTab === 'withdrawals' && (
                <div>
                  {(!selectedUser.withdrawals || selectedUser.withdrawals.length === 0) ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-800">
                      No GRAM withdrawal requests recorded for this account.
                    </div>
                  ) : (
                    <div className="bg-slate-800/40 rounded-2xl border border-slate-800 overflow-hidden">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-800 uppercase tracking-wider text-[10px] text-slate-400 border-b border-slate-700">
                          <tr>
                            <th className="p-3">Requested Date</th>
                            <th className="p-3">Withdrawn Amount</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Tx Hash / Wallet</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {selectedUser.withdrawals.map((w, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/50">
                              <td className="p-3 text-slate-300">
                                {new Date(w.requested_at).toLocaleString()}
                              </td>
                              <td className="p-3 font-black text-rose-400">
                                +{Number(w.amount_gram || 0).toFixed(3)} GRAM
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                  w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                }`}>
                                  {w.status || 'approved'}
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono text-purple-400">
                                {w.tx_hash ? (
                                  <a
                                    href={`https://tonviewer.com/transaction/${w.tx_hash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:underline flex items-center gap-1 justify-end text-[11px] text-blue-400"
                                  >
                                    {w.tx_hash.slice(0, 6)}...{w.tx_hash.slice(-6)} <ArrowUpRight size={11} />
                                  </a>
                                ) : w.wallet_address ? (
                                  <span className="text-slate-400 text-[10px]">{w.wallet_address.slice(0, 6)}...{w.wallet_address.slice(-6)}</span>
                                ) : (
                                  <span className="text-slate-500">N/A</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

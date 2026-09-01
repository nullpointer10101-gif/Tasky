import React, { useState, useEffect } from 'react';
import { ArrowDownLeft, Users, RefreshCw, CheckCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function GramDeposits() {
  const [data, setData] = useState({ stats: {}, deposits: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredDeposits = data.deposits.filter(d =>
    (d.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.telegram_id || '').toString().includes(searchTerm) ||
    (d.tx_hash || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <ArrowDownLeft className="text-emerald-400" /> Direct GRAM / TON Deposits
          </h1>
          <p className="text-sm text-slate-400">View automatically verified user GRAM/TON deposits from the TON Blockchain</p>
        </div>
        <button
          onClick={fetchDeposits}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Deposits
        </button>
      </div>

      {/* Overview Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <ArrowDownLeft size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total GRAM Deposited</p>
            <p className="text-2xl font-black text-emerald-400">+{Number(data.stats.total_gram_deposited || 0).toFixed(3)} GRAM</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Verified Deposits</p>
            <p className="text-2xl font-black text-white">{data.stats.total_deposits || 0}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Unique Depositors</p>
            <p className="text-2xl font-black text-purple-300">{data.stats.total_depositors || 0}</p>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search by User Name, Username, Telegram ID, or Transaction Hash..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <div className="text-xs font-mono text-slate-400 whitespace-nowrap">
          {filteredDeposits.length} Deposit(s)
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="animate-spin text-emerald-400" size={24} />
            <span>Loading Deposits...</span>
          </div>
        ) : filteredDeposits.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No verified deposits found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 uppercase tracking-wider text-[10px] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Transaction Hash</th>
                  <th className="p-3.5">Auto Verified</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredDeposits.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 font-bold text-white">
                      <div>{d.first_name || 'User'}</div>
                      <div className="text-[10px] text-purple-400 font-mono">@{d.username || d.telegram_id}</div>
                    </td>
                    <td className="p-3.5 font-black text-emerald-400 text-sm">
                      +{Number(d.amount_gram || 0).toFixed(3)} GRAM
                    </td>
                    <td className="p-3.5 font-mono text-[11px]">
                      {d.tx_hash ? (
                        <a
                          href={`https://tonviewer.com/transaction/${d.tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline flex items-center gap-1 max-w-[180px] truncate"
                        >
                          <span className="truncate">{d.tx_hash}</span>
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
                    <td className="p-3.5 text-slate-400">
                      {new Date(d.created_at).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {d.status || 'approved'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

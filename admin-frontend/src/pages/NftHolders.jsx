import React, { useState, useEffect } from 'react';
import { Sparkles, Users, RefreshCw, Zap, Rocket, CheckCircle, Clock } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function NftHolders() {
  const [data, setData] = useState({ stats: {}, holders: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredHolders = data.holders.filter(h =>
    (h.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.telegram_id || '').toString().includes(searchTerm) ||
    (h.nft_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Sparkles className="text-purple-400" /> NFT Miners & Holders
          </h1>
          <p className="text-sm text-slate-400">View active NFT miner card holders and daily return stats</p>
        </div>
        <button
          onClick={fetchHolders}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Data
        </button>
      </div>

      {/* Overview Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Unique NFT Holders</p>
            <p className="text-2xl font-black text-white">{data.stats.total_unique_holders || 0}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <Rocket size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Miners Sold</p>
            <p className="text-2xl font-black text-amber-400">{data.stats.total_miners_sold || 0}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <Zap size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Yield Distributed</p>
            <p className="text-2xl font-black text-emerald-400">+{Number(data.stats.total_yield_distributed || 0).toFixed(3)} GRAM</p>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search by User Name, Username, Telegram ID, or NFT Name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
        />
        <div className="text-xs font-mono text-slate-400 whitespace-nowrap">
          {filteredHolders.length} Result(s)
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="animate-spin text-purple-400" size={24} />
            <span>Loading NFT Holders...</span>
          </div>
        ) : filteredHolders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No NFT card holders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 uppercase tracking-wider text-[10px] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">NFT Miner Card</th>
                  <th className="p-3.5">Price</th>
                  <th className="p-3.5">Daily Return</th>
                  <th className="p-3.5">Progress</th>
                  <th className="p-3.5">Total Earned</th>
                  <th className="p-3.5">Purchased Date</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredHolders.map((h) => {
                  const claimsDone = h.claims_done || 0;
                  const durationDays = h.duration_days || 10;
                  const isComplete = claimsDone >= durationDays || h.is_completed;

                  return (
                    <tr key={h.instance_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 font-bold text-white">
                        <div>{h.first_name || 'User'}</div>
                        <div className="text-[10px] text-purple-400 font-mono">@{h.username || h.telegram_id}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          {h.price_gram >= 1 ? <Rocket size={14} className="text-amber-400" /> : <Zap size={14} className="text-purple-400" />}
                          {h.nft_name}
                        </span>
                      </td>
                      <td className="p-3.5 font-black text-amber-400">{h.price_gram} GRAM</td>
                      <td className="p-3.5 font-black text-emerald-400">+{h.daily_yield_gram} GRAM/day</td>
                      <td className="p-3.5 font-mono text-purple-300 font-bold">
                        {claimsDone} / {durationDays} Days
                      </td>
                      <td className="p-3.5 font-black text-emerald-400">
                        +{Number(h.total_earned_gram || 0).toFixed(3)} GRAM
                      </td>
                      <td className="p-3.5 text-slate-400">
                        {new Date(h.purchased_at).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isComplete
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {isComplete ? '10/10 Complete' : 'Active Mining'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

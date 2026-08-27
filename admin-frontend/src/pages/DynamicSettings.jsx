import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Save, Settings, DollarSign, Users, Tv } from 'lucide-react';

export default function DynamicSettings() {
  const [config, setConfig] = useState({
    withdrawal: { 
      min_withdrawal_tasky: 0, 
      fee_percent: 0, 
      usdt_rate: 0,
      adsgram_block_id: '8223',
      adsgram_ratio: 50,
      gigapub_ratio: 50
    },
    referral: { reward_per_referral: 0, tasks_required_for_valid: 0, spin_reward_per_referral: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await api.get('/config');
      setConfig({
        withdrawal: { ...config.withdrawal, ...data.withdrawal },
        referral: { ...config.referral, ...data.referral }
      });
    } catch (e) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/config', config);
      toast.success('Global settings updated instantly!');
    } catch (e) {
      toast.error('Failed to save settings');
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-10 h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse text-indigo-400">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
          <p className="font-bold text-ink tracking-widest uppercase text-sm">Loading Config...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 pb-20 max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-ink mb-2 tracking-tight">Dynamic Config</h1>
        <p className="text-ink-soft text-sm md:text-base">Changes made here instantly apply to all users in the Mini App without redeploying.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Withdrawal Settings */}
        <div className="bg-surface-soft p-6 md:p-8 rounded-3xl border border-border/80 shadow-xl shadow-black/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none transition-opacity group-hover:bg-emerald-500/10"></div>
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <DollarSign size={24} />
            </div>
            <h2 className="text-2xl font-black text-ink tracking-tight">Withdrawal Engine</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Min. TASKY to Withdraw</label>
              <input
                type="number"
                value={config.withdrawal.min_withdrawal_tasky}
                onChange={e => setConfig({ ...config, withdrawal: { ...config.withdrawal, min_withdrawal_tasky: Number(e.target.value) } })}
                className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3.5 text-emerald-400 font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Platform Fee (%)</label>
              <input
                type="number"
                value={config.withdrawal.fee_percent}
                onChange={e => setConfig({ ...config, withdrawal: { ...config.withdrawal, fee_percent: Number(e.target.value) } })}
                className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3.5 text-rose-400 font-bold focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">USDT Exchange Rate</label>
              <input
                type="number"
                step="0.00001"
                value={config.withdrawal.usdt_rate}
                onChange={e => setConfig({ ...config, withdrawal: { ...config.withdrawal, usdt_rate: Number(e.target.value) } })}
                className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3.5 text-indigo-400 font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        {/* Referral Settings */}
        <div className="bg-surface-soft p-6 md:p-8 rounded-3xl border border-border/80 shadow-xl shadow-black/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none transition-opacity group-hover:bg-indigo-500/10"></div>
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Users size={24} />
            </div>
            <h2 className="text-2xl font-black text-ink tracking-tight">Referral Matrix</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Reward per Valid Invite</label>
              <input
                type="number"
                value={config.referral.reward_per_referral}
                onChange={e => setConfig({ ...config, referral: { ...config.referral, reward_per_referral: Number(e.target.value) } })}
                className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3.5 text-emerald-400 font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Tasks Reqd. for Validity</label>
              <input
                type="number"
                value={config.referral.tasks_required_for_valid}
                onChange={e => setConfig({ ...config, referral: { ...config.referral, tasks_required_for_valid: Number(e.target.value) } })}
                className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3.5 text-amber-400 font-bold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Spin Reward per Invite</label>
              <input
                type="number"
                value={config.referral.spin_reward_per_referral}
                onChange={e => setConfig({ ...config, referral: { ...config.referral, spin_reward_per_referral: Number(e.target.value) } })}
                className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3.5 text-purple-400 font-bold focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        {/* Ad Network Routing */}
        <div className="bg-surface-soft p-6 md:p-8 rounded-3xl border border-border/80 shadow-xl shadow-black/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none transition-opacity group-hover:bg-indigo-500/10"></div>
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Tv size={24} />
            </div>
            <h2 className="text-2xl font-black text-ink tracking-tight">Ad Network Routing (Traffic Split)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">AdsGram Block ID</label>
              <input
                type="text"
                value={config.withdrawal.adsgram_block_id || ''}
                onChange={e => setConfig({ ...config, withdrawal: { ...config.withdrawal, adsgram_block_id: e.target.value } })}
                className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3.5 text-indigo-400 font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">AdsGram Share (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={config.withdrawal.adsgram_ratio !== undefined ? config.withdrawal.adsgram_ratio : 50}
                onChange={e => {
                  const val = Math.min(100, Math.max(0, Number(e.target.value)));
                  setConfig({ 
                    ...config, 
                    withdrawal: { 
                      ...config.withdrawal, 
                      adsgram_ratio: val,
                      gigapub_ratio: 100 - val 
                    } 
                  });
                }}
                className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3.5 text-emerald-400 font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">GigaPub Share (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={config.withdrawal.gigapub_ratio !== undefined ? config.withdrawal.gigapub_ratio : 50}
                onChange={e => {
                  const val = Math.min(100, Math.max(0, Number(e.target.value)));
                  setConfig({ 
                    ...config, 
                    withdrawal: { 
                      ...config.withdrawal, 
                      gigapub_ratio: val,
                      adsgram_ratio: 100 - val
                    } 
                  });
                }}
                className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3.5 text-amber-400 font-bold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none"
              />
            </div>
          </div>
          <p className="text-xs text-ink-faint mt-3 pl-1">
            Specify the traffic split percentage between AdsGram and GigaPub. The sum of both shares will always equal 100%.
          </p>
        </div>

        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            className="w-full md:w-auto bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-black py-4 px-10 rounded-2xl transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 text-lg"
          >
            <Settings size={20} />
            Commit Configuration
          </button>
        </div>
      </form>
    </div>
  );
}

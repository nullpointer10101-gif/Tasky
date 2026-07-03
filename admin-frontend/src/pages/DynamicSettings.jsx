import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

export default function DynamicSettings() {
  const [config, setConfig] = useState({
    withdrawal: { min_withdrawal_tasky: 0, fee_percent: 0, usdt_rate: 0 },
    referral: { reward_per_referral: 0, tasks_required_for_valid: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await api.get('/config');
      setConfig({
        withdrawal: data.withdrawal || config.withdrawal,
        referral: data.referral || config.referral
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

  if (loading) return <div className="p-8 text-ink">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-ink mb-2">Dynamic Settings</h1>
        <p className="text-ink-soft">Changes made here instantly apply to all users in the Mini App.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Withdrawal Settings */}
        <div className="bg-surface-soft p-6 rounded-3xl border border-border">
          <h2 className="text-xl font-bold text-ink mb-6">Withdrawal Rules</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-ink-soft mb-2">Min. TASKY to Withdraw</label>
              <input
                type="number"
                value={config.withdrawal.min_withdrawal_tasky}
                onChange={e => setConfig({ ...config, withdrawal: { ...config.withdrawal, min_withdrawal_tasky: Number(e.target.value) } })}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-ink focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-soft mb-2">Platform Fee (%)</label>
              <input
                type="number"
                value={config.withdrawal.fee_percent}
                onChange={e => setConfig({ ...config, withdrawal: { ...config.withdrawal, fee_percent: Number(e.target.value) } })}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-ink focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-soft mb-2">USDT Exchange Rate</label>
              <input
                type="number"
                step="0.00001"
                value={config.withdrawal.usdt_rate}
                onChange={e => setConfig({ ...config, withdrawal: { ...config.withdrawal, usdt_rate: Number(e.target.value) } })}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-ink focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Referral Settings */}
        <div className="bg-surface-soft p-6 rounded-3xl border border-border">
          <h2 className="text-xl font-bold text-ink mb-6">Referral Rules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-ink-soft mb-2">Reward per Valid Invite (TASKY)</label>
              <input
                type="number"
                value={config.referral.reward_per_referral}
                onChange={e => setConfig({ ...config, referral: { ...config.referral, reward_per_referral: Number(e.target.value) } })}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-ink focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-soft mb-2">Tasks Required for Valid Invite</label>
              <input
                type="number"
                value={config.referral.tasks_required_for_valid}
                onChange={e => setConfig({ ...config, referral: { ...config.referral, tasks_required_for_valid: Number(e.target.value) } })}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-ink focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl transition-colors">
          Save All Settings
        </button>
      </form>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Gift, Plus, Trash2, Power, AlertCircle } from 'lucide-react';

export default function PromoCodes() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [processing, setProcessing] = useState(null);

  const [newPromo, setNewPromo] = useState({
    code: '',
    reward_amount: 1000,
    reward_gram: 0,
    max_uses: 100,
    expires_at: '',
    require_ref: false
  });

  const fetchPromos = async () => {
    try {
      const { data } = await api.get('/promos');
      setPromos(data);
    } catch (e) {
      toast.error('Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPromos(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newPromo.code) {
      toast.error('Promo code is required');
      return;
    }
    if (newPromo.reward_amount < 0 || newPromo.reward_gram < 0) {
      toast.error('Rewards cannot be negative');
      return;
    }
    if (newPromo.reward_amount === 0 && newPromo.reward_gram === 0) {
      toast.error('At least one reward (TASKY or GRAM) must be greater than 0');
      return;
    }
    if (newPromo.max_uses <= 0) {
      toast.error('Max uses must be greater than 0');
      return;
    }
    
    const payload = {
      ...newPromo,
      expires_at: newPromo.expires_at || null
    };

    setProcessing('create');
    try {
      await api.post('/promos', payload);
      toast.success('Promo code created successfully!');
      setShowCreateModal(false);
      setNewPromo({ code: '', reward_amount: 1000, reward_gram: 0, max_uses: 100, expires_at: '', require_ref: false });
      fetchPromos();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create promo code');
    } finally {
      setProcessing(null);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    setProcessing(`toggle-${id}`);
    try {
      await api.put(`/promos/${id}`, { is_active: !currentStatus });
      toast.success(`Promo code ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchPromos();
    } catch (e) {
      toast.error('Failed to update status');
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this promo code? All user claims for this code will also be deleted!')) return;
    setProcessing(`delete-${id}`);
    try {
      await api.delete(`/promos/${id}`);
      toast.success('Promo code deleted');
      fetchPromos();
    } catch (e) {
      toast.error('Failed to delete promo code');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Gift size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-ink">Bounty Codes</h1>
            <p className="text-ink-soft text-sm">Manage promo codes and their redemptions</p>
          </div>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20"
        >
          <Plus size={18} />
          Create Code
        </button>
      </div>

      {/* Promos List */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-ink-soft">Loading codes...</div>
      ) : promos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-ink-soft gap-3 bg-surface-soft rounded-3xl border border-border">
          <Gift size={36} className="opacity-30" />
          <p className="font-semibold">No promo codes created yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promos.map(promo => (
            <div key={promo.id} className="bg-surface-soft rounded-2xl border border-border p-5 relative overflow-hidden group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="bg-indigo-500/10 text-indigo-500 font-black px-3 py-1 rounded-lg tracking-widest text-lg border border-indigo-500/20">
                      {promo.code}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${promo.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {promo.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                
                <div className="space-y-1 mb-4">
                  <p className="text-sm text-ink-soft flex items-center justify-between">
                    <span>Reward:</span> 
                    <span className="font-bold text-ink">
                      {Number(promo.reward_amount).toLocaleString()} TASKY
                      {parseFloat(promo.reward_gram || 0) > 0 && ` + ${promo.reward_gram} GRAM`}
                    </span>
                  </p>
                  <p className="text-sm text-ink-soft flex items-center justify-between">
                    <span>Uses:</span> 
                    <span className={`font-bold ${promo.current_uses >= promo.max_uses ? 'text-amber-500' : 'text-ink'}`}>
                      {promo.current_uses} / {promo.max_uses}
                    </span>
                  </p>
                  <p className="text-sm text-ink-soft flex items-center justify-between">
                    <span>Requires Referral:</span> 
                    <span className={`font-bold ${promo.require_ref ? 'text-indigo-400' : 'text-ink-soft'}`}>
                      {promo.require_ref ? 'Yes (1 New)' : 'No'}
                    </span>
                  </p>
                  {promo.expires_at && (
                    <p className="text-sm text-ink-soft flex items-center justify-between">
                      <span>Expires:</span> <span className="font-medium text-ink">{new Date(promo.expires_at).toLocaleDateString()}</span>
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-4 border-t border-border/50">
                <button
                  onClick={() => handleToggleStatus(promo.id, promo.is_active)}
                  disabled={processing === `toggle-${promo.id}`}
                  className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-xl text-sm font-bold transition-colors ${promo.is_active ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}
                >
                  <Power size={16} />
                  {promo.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(promo.id)}
                  disabled={processing === `delete-${promo.id}`}
                  className="px-3 py-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-3xl border border-border overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-black text-ink">Create New Code</h2>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1.5 uppercase tracking-wider">Promo Code</label>
                <input 
                  type="text" 
                  value={newPromo.code}
                  onChange={e => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})}
                  className="w-full bg-surface-soft border border-border rounded-xl px-4 py-3 text-ink font-black tracking-wider focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g. SUMMER2026"
                  required
                />
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink-soft mb-1.5 uppercase tracking-wider">TASKY</label>
                  <input 
                    type="number"
                    min="0"
                    value={newPromo.reward_amount}
                    onChange={e => setNewPromo({...newPromo, reward_amount: Number(e.target.value)})}
                    className="w-full bg-surface-soft border border-border rounded-xl px-3 py-2.5 text-ink font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-soft mb-1.5 uppercase tracking-wider">GRAM</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={newPromo.reward_gram}
                    onChange={e => setNewPromo({...newPromo, reward_gram: Number(e.target.value)})}
                    className="w-full bg-surface-soft border border-border rounded-xl px-3 py-2.5 text-ink font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-soft mb-1.5 uppercase tracking-wider">Max Uses</label>
                  <input 
                    type="number" 
                    value={newPromo.max_uses}
                    onChange={e => setNewPromo({...newPromo, max_uses: Number(e.target.value)})}
                    className="w-full bg-surface-soft border border-border rounded-xl px-3 py-2.5 text-ink font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1.5 uppercase tracking-wider">Expiration Date (Optional)</label>
                <input 
                  type="datetime-local" 
                  value={newPromo.expires_at}
                  onChange={e => setNewPromo({...newPromo, expires_at: e.target.value})}
                  className="w-full bg-surface-soft border border-border rounded-xl px-4 py-3 text-ink font-medium focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 py-2">
                <input 
                  type="checkbox" 
                  id="require_ref"
                  checked={newPromo.require_ref}
                  onChange={e => setNewPromo({...newPromo, require_ref: e.target.checked})}
                  className="w-4 h-4 bg-surface-soft border border-border rounded focus:ring-indigo-500 text-indigo-600 focus:outline-none"
                />
                <label htmlFor="require_ref" className="text-sm font-bold text-ink cursor-pointer select-none">
                  Requires 1 New Referral (invited after code creation)
                </label>
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl flex gap-3 text-sm text-indigo-400 font-medium">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>New promo codes are active immediately upon creation.</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-surface-soft hover:bg-border text-ink rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={processing === 'create'}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {processing === 'create' ? 'Creating...' : 'Create Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

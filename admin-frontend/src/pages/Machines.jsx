import React, { useState, useEffect } from 'react';
import { PlusSquare, Trash2, Edit, Save, X, Cpu, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

export default function Machines() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMachine, setEditingMachine] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    rarity: 'common',
    min_holding: 0,
    speed_bonus_percent: 0,
    icon_key: 'starter_rig',
    reveal_at_holding: 0,
    sort_order: 10
  });

  const fetchMachines = async () => {
    try {
      const res = await api.get('/machines');
      setMachines(res.data);
    } catch (e) {
      toast.error('Failed to load machines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const handleEdit = (m) => {
    setEditingMachine(m.id);
    setFormData(m);
    setIsAdding(false);
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingMachine(null);
    setFormData({
      name: '',
      rarity: 'common',
      min_holding: 0,
      speed_bonus_percent: 0,
      icon_key: 'starter_rig',
      reveal_at_holding: 0,
      sort_order: 10
    });
  };

  const handleCancel = () => {
    setEditingMachine(null);
    setIsAdding(false);
  };

  const handleSave = async () => {
    try {
      if (isAdding) {
        await api.post('/machines', formData);
        toast.success('Machine created');
      } else {
        await api.put(`/machines/${editingMachine}`, formData);
        toast.success('Machine updated');
      }
      setEditingMachine(null);
      setIsAdding(false);
      fetchMachines();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Save failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this machine? This removes it for all users too.')) return;
    try {
      await api.delete(`/machines/${id}`);
      toast.success('Machine deleted');
      fetchMachines();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-10 h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse text-indigo-400">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
          <p className="font-bold text-ink tracking-widest uppercase text-sm">Loading Machines...</p>
        </div>
      </div>
    );
  }

  const rarityColors = {
    common: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    rare: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    epic: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    legendary: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };

  return (
    <div className="p-4 md:p-10 pb-20 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-ink mb-2 tracking-tight">Machine Arsenal</h1>
          <p className="text-ink-soft text-sm md:text-base">Configure mining rigs, rarities, and required balances.</p>
        </div>
        {!isAdding && !editingMachine && (
          <button
            onClick={handleAdd}
            className="w-full md:w-auto bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all"
          >
            <PlusSquare size={18} />
            Create Machine
          </button>
        )}
      </div>

      {(isAdding || editingMachine) && (
        <div className="bg-surface-soft border border-border rounded-3xl p-6 md:p-8 shadow-xl shadow-black/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <h2 className="text-2xl font-black text-ink mb-8 relative z-10">{isAdding ? 'Deploy New Machine' : 'Reconfigure Machine'}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Machine Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3 text-ink focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Rarity Class</label>
              <select
                value={formData.rarity}
                onChange={e => setFormData({ ...formData, rarity: e.target.value })}
                className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3 text-ink focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none appearance-none"
              >
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Min Holding required (TASKY)</label>
              <input
                type="number"
                value={formData.min_holding}
                onChange={e => setFormData({ ...formData, min_holding: Number(e.target.value) })}
                className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3 text-emerald-400 font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Reveal Threshold (TASKY)</label>
              <input
                type="number"
                value={formData.reveal_at_holding}
                onChange={e => setFormData({ ...formData, reveal_at_holding: Number(e.target.value) })}
                className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3 text-amber-400 font-bold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Speed Bonus (%)</label>
              <input
                type="number"
                value={formData.speed_bonus_percent}
                onChange={e => setFormData({ ...formData, speed_bonus_percent: Number(e.target.value) })}
                className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3 text-indigo-400 font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Icon Identifier</label>
              <input
                type="text"
                value={formData.icon_key}
                onChange={e => setFormData({ ...formData, icon_key: e.target.value })}
                className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3 text-ink focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Sort Order</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={e => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3 text-ink focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end mt-8 pt-6 border-t border-border/50 relative z-10">
            <button
              onClick={handleCancel}
              className="px-6 py-3 rounded-xl border border-border text-ink hover:bg-surface transition-colors font-bold flex items-center justify-center gap-2"
            >
              <X size={18} /> Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-500/25"
            >
              <Save size={18} /> Save Config
            </button>
          </div>
        </div>
      )}

      {!isAdding && !editingMachine && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {machines.map((m) => (
            <div key={m.id} className="bg-surface-soft border border-border/80 rounded-3xl p-6 flex flex-col shadow-lg shadow-black/20 hover:border-indigo-500/30 transition-colors group">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${rarityColors[m.rarity] || rarityColors.common}`}>
                    <Cpu size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-ink text-lg leading-tight">{m.name}</h3>
                    <span className={`text-[10px] uppercase font-black tracking-widest ${rarityColors[m.rarity]?.split(' ')[0] || 'text-slate-400'}`}>
                      {m.rarity}
                    </span>
                  </div>
                </div>
                <span className="bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-lg text-xs font-bold border border-indigo-500/20">
                  +{m.speed_bonus_percent}%
                </span>
              </div>

              <div className="bg-[#0a0f1c] rounded-2xl p-4 border border-border/50 space-y-3 mb-6 flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-ink-soft font-bold uppercase tracking-wider">Unlocks At</span>
                  <span className="text-amber-400 font-black">{Number(m.reveal_at_holding).toLocaleString()} TASKY</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-ink-soft font-bold uppercase tracking-wider">Requires</span>
                  <span className="text-emerald-400 font-black">{Number(m.min_holding).toLocaleString()} TASKY</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-ink-soft font-bold uppercase tracking-wider">Sort Index</span>
                  <span className="text-ink font-mono">{m.sort_order}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-border/50">
                <button
                  onClick={() => handleEdit(m)}
                  className="flex-1 py-3 rounded-xl bg-surface border border-border text-ink hover:border-indigo-500/50 hover:text-indigo-400 transition-colors font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Edit size={16} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="px-4 py-3 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors font-bold flex items-center justify-center"
                  title="Delete Machine"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { PlusSquare, Trash2, Edit, Save, X, Cpu } from 'lucide-react';
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

  if (loading) return <div className="p-8 text-ink">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-ink mb-1">Machines Management</h1>
          <p className="text-sm text-ink-soft">Configure Rig machines, rarities, and requirements.</p>
        </div>
        <button
          onClick={handleAdd}
          className="bg-brand text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-brand-hover"
        >
          <PlusSquare size={18} /> Add Machine
        </button>
      </div>

      {(isAdding || editingMachine) && (
        <div className="bg-surface-soft p-6 rounded-2xl border border-border">
          <h2 className="text-lg font-bold text-ink mb-4">{isAdding ? 'New Machine' : 'Edit Machine'}</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">Name</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">Rarity</label>
              <select 
                value={formData.rarity} 
                onChange={(e) => setFormData({...formData, rarity: e.target.value})} 
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-ink"
              >
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">Min Holding required (TASKY)</label>
              <input 
                type="number" 
                value={formData.min_holding} 
                onChange={(e) => setFormData({...formData, min_holding: Number(e.target.value)})} 
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">Speed Bonus (%)</label>
              <input 
                type="number" 
                value={formData.speed_bonus_percent} 
                onChange={(e) => setFormData({...formData, speed_bonus_percent: Number(e.target.value)})} 
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">Reveal Threshold (TASKY)</label>
              <input 
                type="number" 
                value={formData.reveal_at_holding} 
                onChange={(e) => setFormData({...formData, reveal_at_holding: Number(e.target.value)})} 
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">Sort Order</label>
              <input 
                type="number" 
                value={formData.sort_order} 
                onChange={(e) => setFormData({...formData, sort_order: Number(e.target.value)})} 
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">Icon Key</label>
              <input 
                type="text" 
                value={formData.icon_key} 
                onChange={(e) => setFormData({...formData, icon_key: e.target.value})} 
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-ink"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="bg-success text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
              <Save size={16} /> Save
            </button>
            <button onClick={handleCancel} className="bg-surface border border-border text-ink px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
              <X size={16} /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface-soft border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface text-ink-soft text-xs uppercase font-bold border-b border-border">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Machine</th>
              <th className="px-4 py-3">Rarity</th>
              <th className="px-4 py-3">Req Holding</th>
              <th className="px-4 py-3">Bonus</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {machines.map(m => (
              <tr key={m.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-ink-soft">{m.sort_order}</td>
                <td className="px-4 py-3 font-bold text-ink flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-ink-soft">
                    <Cpu size={16} />
                  </div>
                  {m.name}
                </td>
                <td className="px-4 py-3 text-ink-soft uppercase text-xs">{m.rarity}</td>
                <td className="px-4 py-3 text-ink">{Number(m.min_holding).toLocaleString()} TASKY</td>
                <td className="px-4 py-3 text-success font-bold">+{m.speed_bonus_percent}%</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => handleEdit(m)} className="p-2 bg-surface hover:bg-brand/10 text-brand rounded-lg transition-colors inline-block">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="p-2 bg-surface hover:bg-red-500/10 text-red-400 rounded-lg transition-colors inline-block">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {machines.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-8 text-ink-soft">No machines found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

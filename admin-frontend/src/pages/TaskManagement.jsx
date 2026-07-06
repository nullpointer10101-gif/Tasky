import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

export default function TaskManagement() {
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'live'
  const [liveTasks, setLiveTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    type: 'social',
    reward_tasky: 500,
    action_url: '',
    verification_type: 'proof_screenshot',
    icon: 'Default',
    telegram_chat_id: ''
  });
  const [loading, setLoading] = useState(false);

  const fetchLiveTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await api.get('/tasks/live');
      setLiveTasks(res.data);
    } catch (e) {
      toast.error('Failed to fetch live tasks');
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'live') {
      fetchLiveTasks();
    }
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/tasks/create', formData);
      toast.success('Task created successfully!');
      setFormData({ ...formData, title: '', subtitle: '', action_url: '', telegram_chat_id: '' });
    } catch (e) {
      toast.error('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Task deleted successfully');
      fetchLiveTasks();
    } catch (e) {
      toast.error('Failed to delete task');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-ink mb-2">Manage Tasks</h1>
          <p className="text-ink-soft">Create new tasks or manage existing live tasks.</p>
        </div>
        <div className="flex bg-surface-soft p-1 rounded-full border border-border">
          <button 
            onClick={() => setActiveTab('create')}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'create' ? 'bg-indigo-500 text-white shadow-md' : 'text-ink-soft hover:text-ink'}`}
          >
            Create Task
          </button>
          <button 
            onClick={() => setActiveTab('live')}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'live' ? 'bg-indigo-500 text-white shadow-md' : 'text-ink-soft hover:text-ink'}`}
          >
            Live Tasks
          </button>
        </div>
      </div>

      {activeTab === 'create' && (
        <div className="bg-surface-soft p-6 rounded-3xl border border-border">
          <h2 className="text-xl font-bold text-ink mb-6">Create New Task</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-ink-soft mb-2">Task Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-ink focus:border-indigo-500"
                  placeholder="e.g. Follow us on X"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-ink-soft mb-2">Subtitle (Optional)</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-ink focus:border-indigo-500"
                  placeholder="e.g. Stay updated with news"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-ink-soft mb-2">Task Category (Type)</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-ink focus:border-indigo-500"
                >
                  <option className="bg-slate-900 text-white" value="social">One-Time (Social) Task</option>
                  <option className="bg-slate-900 text-white" value="bounty">Creator Bounties (Video/Post)</option>
                  <option className="bg-slate-900 text-white" value="daily">Daily Task</option>
                  <option className="bg-slate-900 text-white" value="weekly">Weekly Task</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-ink-soft mb-2">Reward (TASKY)</label>
                <input
                  type="number"
                  required
                  value={formData.reward_tasky}
                  onChange={e => setFormData({ ...formData, reward_tasky: Number(e.target.value) })}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-ink focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-ink-soft mb-2">Verification Type</label>
                <select
                  value={formData.verification_type}
                  onChange={e => setFormData({ ...formData, verification_type: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-ink focus:border-indigo-500"
                >
                  <option className="bg-slate-900 text-white" value="proof_screenshot">Screenshot Upload</option>
                  <option className="bg-slate-900 text-white" value="none">Auto-Approve (Click only)</option>
                  <option className="bg-slate-900 text-white" value="auto_telegram">Auto-Verify (Telegram Bot Check)</option>
                  <option className="bg-slate-900 text-white" value="proof_url">URL Upload</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-ink-soft mb-2">Platform / Icon</label>
                <select
                  value={formData.icon}
                  onChange={e => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-ink focus:border-indigo-500"
                >
                  <option className="bg-slate-900 text-white" value="Default">🌐 Default (Tasky Logo)</option>
                  <option className="bg-slate-900 text-white" value="Twitter">🐦 X / Twitter</option>
                  <option className="bg-slate-900 text-white" value="Telegram">✈️ Telegram</option>
                  <option className="bg-slate-900 text-white" value="Youtube">📺 YouTube</option>
                  <option className="bg-slate-900 text-white" value="Globe">🌍 Web / Website</option>
                  <option className="bg-slate-900 text-white" value="Repeat">🔄 Daily / Repeatable</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-ink-soft mb-2">Action URL (Link to X, Telegram, etc.)</label>
                <input
                  type="url"
                  required
                  value={formData.action_url}
                  onChange={e => setFormData({ ...formData, action_url: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-ink focus:border-indigo-500"
                  placeholder="https://..."
                />
              </div>
              {formData.verification_type === 'auto_telegram' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-ink-soft mb-2">Telegram Chat ID (for Auto-Verify)</label>
                  <input
                    type="text"
                    value={formData.telegram_chat_id}
                    onChange={e => setFormData({ ...formData, telegram_chat_id: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-ink focus:border-indigo-500"
                    placeholder="e.g. @mychannel or -10012345678"
                  />
                  <p className="text-xs text-ink-faint mt-1">Make sure your bot is an admin in this channel/group.</p>
                </div>
              )}
            </div>
            <button
              disabled={loading}
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating Task...' : 'Create Task'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'live' && (
        <div className="bg-surface-soft p-6 rounded-3xl border border-border">
          <h2 className="text-xl font-bold text-ink mb-6">Live Tasks</h2>
          {loadingTasks ? (
            <p className="text-ink-soft">Loading tasks...</p>
          ) : liveTasks.length === 0 ? (
            <p className="text-ink-soft text-center py-8">No live tasks available.</p>
          ) : (
            <div className="space-y-4">
              {liveTasks.map(task => (
                <div key={task.id} className="bg-surface p-4 rounded-2xl border border-border flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-ink">{task.title}</h3>
                    <p className="text-sm text-ink-soft">{task.subtitle}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md">{task.type.toUpperCase()}</span>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">{task.reward_tasky} TASKY</span>
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md">{task.verification_type}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

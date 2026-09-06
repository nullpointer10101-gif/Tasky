import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { PlusSquare, ListTodo, Trash2, ArrowRight } from 'lucide-react';

export default function TaskManagement() {
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'live'
  const [liveTasks, setLiveTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    type: 'social',
    reward_tasky: 500,
    reward_gram: 0,
    action_url: '',
    verification_type: 'proof_screenshot',
    icon: 'Default',
    category: 'internal',
    telegram_chat_id: '',
    x_subtype: '',
    target_audience: 'all', // 'all' | 'new_users' | 'specific_users'
    target_user_ids: '',
    new_user_days: 7
  });
  const [loading, setLoading] = useState(false);

  const handleTypeChange = (val) => {
    let iconVal = formData.icon;
    if (val === 'twitter') iconVal = 'Twitter';
    else if (val === 'youtube') iconVal = 'Youtube';
    else if (val === 'telegram_join') iconVal = 'Telegram';
    
    setFormData({
      ...formData,
      type: val,
      icon: iconVal,
      x_subtype: val === 'twitter' ? 'follow' : ''
    });
  };

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
      setFormData({ 
        ...formData, 
        title: '', 
        subtitle: '', 
        action_url: '', 
        telegram_chat_id: '', 
        category: 'internal', 
        reward_tasky: 500, 
        reward_gram: 0, 
        x_subtype: '',
        target_audience: 'all',
        target_user_ids: '',
        new_user_days: 7
      });
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
    <div className="p-4 md:p-10 pb-20 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-ink mb-2 tracking-tight">Manage Tasks</h1>
          <p className="text-ink-soft text-sm md:text-base">Create new tasks or manage existing live campaigns.</p>
        </div>
        <div className="flex w-full md:w-auto bg-[#0a0f1c] p-1.5 rounded-2xl border border-border/50">
          <button 
            onClick={() => setActiveTab('create')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'create' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-ink-soft hover:text-ink hover:bg-white/5'}`}
          >
            <PlusSquare size={16} /> Create Task
          </button>
          <button 
            onClick={() => setActiveTab('live')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'live' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-ink-soft hover:text-ink hover:bg-white/5'}`}
          >
            <ListTodo size={16} /> Live Tasks
          </button>
        </div>
      </div>

      {activeTab === 'create' && (
        <div className="bg-surface-soft p-6 md:p-8 rounded-3xl border border-border shadow-xl shadow-black/20 max-w-4xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <h2 className="text-2xl font-black text-ink mb-8 tracking-tight relative z-10">Configure New Task</h2>
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Follow us on Twitter"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3.5 text-ink focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Subtitle</label>
                <input
                  type="text"
                  placeholder="e.g. Retweet our pinned post"
                  value={formData.subtitle}
                  onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3.5 text-ink focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Category Type</label>
                <select
                  value={formData.type}
                  onChange={e => handleTypeChange(e.target.value)}
                  className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3.5 text-ink focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none appearance-none"
                >
                  <option value="social">Social Media</option>
                  <option value="twitter">X (Twitter)</option>
                  <option value="youtube">YouTube</option>
                  <option value="partner">Partner / App</option>
                  <option value="telegram_join">Telegram Join</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Placement Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3.5 text-ink focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none appearance-none"
                >
                  <option value="internal">Tasky Missions (Internal)</option>
                  <option value="partner">Partner Promos (External)</option>
                </select>
              </div>
              
              {formData.type === 'twitter' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">X Subtype (Action)</label>
                  <select
                    value={formData.x_subtype}
                    onChange={e => setFormData({ ...formData, x_subtype: e.target.value })}
                    className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3.5 text-ink focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none appearance-none"
                  >
                    <option value="follow">Follow Target Profile</option>
                    <option value="like">Like Target Tweet</option>
                    <option value="repost">Repost/Retweet Target Tweet</option>
                  </select>
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Reward (TASKY)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.reward_tasky}
                  onChange={e => setFormData({ ...formData, reward_tasky: Number(e.target.value) })}
                  className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3.5 text-emerald-400 font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Reward (GRAM)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.reward_gram}
                  onChange={e => setFormData({ ...formData, reward_gram: Number(e.target.value) })}
                  className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3.5 text-blue-400 font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Action URL</label>
                <input
                  type="text"
                  placeholder="https://x.com/yourpage"
                  value={formData.action_url}
                  onChange={e => setFormData({ ...formData, action_url: e.target.value })}
                  className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3.5 text-indigo-400 font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Verification Method</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { id: 'auto_click', label: 'Auto (Click Only)' },
                    { id: 'proof_screenshot', label: 'Manual (Screenshot)' },
                    { id: 'proof_url', label: 'Manual (URL/Link)' },
                    { id: 'proof_username', label: 'Manual (Username)' },
                    { id: 'telegram_api', label: 'API (Telegram Channel)' },
                    { id: 'timer_10s', label: 'Timer (10s Countdown)' }
                  ].map(method => (
                    <div 
                      key={method.id} 
                      onClick={() => setFormData({ ...formData, verification_type: method.id })}
                      className={`cursor-pointer p-4 rounded-2xl border transition-all ${formData.verification_type === method.id ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 font-bold shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-[#0a0f1c] border-border/50 text-ink-soft hover:bg-white/5'}`}
                    >
                      <p className="text-sm text-center">{method.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {formData.verification_type === 'telegram_api' && (
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">Telegram Chat ID (Starts with -100...)</label>
                  <input
                    type="text"
                    required
                    placeholder="-100123456789"
                    value={formData.telegram_chat_id}
                    onChange={e => setFormData({ ...formData, telegram_chat_id: e.target.value })}
                    className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl px-5 py-3.5 text-amber-400 font-medium focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none"
                  />
                  <p className="text-xs text-ink-faint px-1">Ensure the bot is an admin in this channel.</p>
                </div>
              )}

              {/* Audience Targeting Configuration */}
              <div className="space-y-3 md:col-span-2 bg-[#060b16] p-5 rounded-2xl border border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-ink-soft uppercase tracking-wider pl-1">
                    Audience Targeting (Who Can View & Complete)
                  </label>
                  <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 w-fit">
                    {formData.target_audience === 'all' && '👥 Visible to All Members'}
                    {formData.target_audience === 'new_users' && `🐣 New Users Only (≤${formData.new_user_days}d old)`}
                    {formData.target_audience === 'specific_users' && '🎯 Specific Accounts Only'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { id: 'all', label: 'All Users (Default)', desc: 'Visible to every active member in the app' },
                    { id: 'new_users', label: 'New Users Only', desc: 'Target only freshly registered accounts' },
                    { id: 'specific_users', label: 'Specific Person / IDs', desc: 'Target specific Telegram IDs or usernames' }
                  ].map(aud => (
                    <div
                      key={aud.id}
                      onClick={() => setFormData({ ...formData, target_audience: aud.id })}
                      className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                        formData.target_audience === aud.id
                          ? 'bg-indigo-500/15 border-indigo-500 text-white font-bold shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                          : 'bg-[#0a0f1c] border-border/50 text-ink-soft hover:bg-white/5'
                      }`}
                    >
                      <p className="text-sm font-bold text-ink mb-1">{aud.label}</p>
                      <p className="text-[11px] text-ink-soft font-normal">{aud.desc}</p>
                    </div>
                  ))}
                </div>

                {formData.target_audience === 'new_users' && (
                  <div className="mt-4 p-4 bg-[#0a0f1c] rounded-xl border border-border/50 space-y-2">
                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      New User Threshold (Max Account Age in Days)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={formData.new_user_days}
                        onChange={e => setFormData({ ...formData, new_user_days: Number(e.target.value) })}
                        className="w-32 bg-[#060b16] border border-border/60 rounded-xl px-4 py-2.5 text-amber-400 font-bold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                      <span className="text-xs text-ink-soft">
                        Only users registered in the last <strong>{formData.new_user_days} days</strong> will see this task.
                      </span>
                    </div>
                  </div>
                )}

                {formData.target_audience === 'specific_users' && (
                  <div className="mt-4 p-4 bg-[#0a0f1c] rounded-xl border border-border/50 space-y-2">
                    <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      Target Telegram IDs or Usernames (Comma-separated)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 8823265955, 12345678, @username1, @crypto_user"
                      value={formData.target_user_ids}
                      onChange={e => setFormData({ ...formData, target_user_ids: e.target.value })}
                      className="w-full bg-[#060b16] border border-border/60 rounded-xl px-4 py-2.5 text-indigo-300 font-mono text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <p className="text-xs text-ink-faint">
                      Only users matching these Telegram User IDs or @usernames will see and be able to complete this task.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-4 border-t border-border/50">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-black text-lg shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-70 flex justify-center items-center gap-2"
              >
                {loading ? 'Creating...' : 'Deploy Task Campaign'} <ArrowRight size={20} />
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'live' && (
        <div className="space-y-4">
          {loadingTasks ? (
            <div className="p-8 text-center text-indigo-400 animate-pulse font-bold">Loading campaigns...</div>
          ) : liveTasks.length === 0 ? (
            <div className="bg-surface-soft p-12 rounded-3xl border border-border flex flex-col items-center justify-center">
              <ListTodo size={48} className="text-ink-faint mb-4" />
              <h2 className="text-xl font-bold text-ink mb-1">No Active Tasks</h2>
              <p className="text-ink-soft text-sm">Create a task to engage your community.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {liveTasks.map(task => (
                <div key={task.id} className="bg-surface-soft border border-border/80 rounded-3xl p-5 md:p-6 flex flex-col gap-4 shadow-lg shadow-black/20 hover:border-indigo-500/30 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-bold text-ink text-lg leading-tight mb-1">{task.title}</h3>
                      <p className="text-ink-soft text-sm">{task.subtitle}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {task.reward_tasky > 0 && (
                        <span className="bg-emerald-500/10 text-emerald-400 font-bold px-3 py-1 rounded-xl text-xs border border-emerald-500/20 whitespace-nowrap">
                          +{task.reward_tasky} TASKY
                        </span>
                      )}
                      {Number(task.reward_gram || 0) > 0 && (
                        <span className="bg-blue-500/10 text-blue-400 font-bold px-3 py-1 rounded-xl text-xs border border-blue-500/20 whitespace-nowrap">
                          +{task.reward_gram} GRAM 💎
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-[#0a0f1c] p-3 rounded-2xl border border-border/50 text-xs text-ink-soft space-y-2">
                    <div className="flex justify-between">
                      <span className="uppercase font-bold tracking-wider text-ink-faint text-[10px]">Type</span>
                      <span className="text-indigo-400 font-medium">{task.type} {task.x_subtype ? `(${task.x_subtype})` : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="uppercase font-bold tracking-wider text-ink-faint text-[10px]">Audience</span>
                      <span className="text-emerald-400 font-medium">
                        {task.target_audience === 'new_users' 
                          ? `🐣 New Users (≤${task.new_user_days || 7}d)` 
                          : task.target_audience === 'specific_users' 
                          ? `🎯 Specific (${(task.target_user_ids || '').split(',').filter(Boolean).length} targets)` 
                          : '👥 All Users'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="uppercase font-bold tracking-wider text-ink-faint text-[10px]">Verification</span>
                      <span className="text-amber-400 font-medium">{task.verification_type}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="uppercase font-bold tracking-wider text-ink-faint text-[10px] mb-1">Action URL</span>
                      <span className="text-indigo-300 font-mono truncate">{task.action_url || 'N/A'}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="mt-2 flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-rose-500/20 text-rose-400 font-bold text-sm hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors"
                  >
                    <Trash2 size={16} /> Terminate Campaign
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

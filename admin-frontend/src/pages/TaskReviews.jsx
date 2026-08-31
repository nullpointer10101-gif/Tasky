import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ExternalLink, Search, Zap, Filter, Video, Twitter, Send, Layers } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function TaskReviews() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchTasks(true);
    const interval = setInterval(() => fetchTasks(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get('/tasks/pending');
      setTasks(data);
    } catch (e) {
      if (showLoading) toast.error('Failed to load pending tasks');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleReview = async (id, action) => {
    let reason = '';
    if (action === 'reject') {
      reason = prompt('Enter rejection reason:');
      if (reason === null) return; // cancelled
    }

    setProcessingId(id);
    try {
      await api.post('/tasks/review', { user_task_id: id, action, rejection_reason: reason });
      toast.success(`Task ${action}d successfully`);
      setTasks(prev => prev.filter(t => t.user_task_id !== id));
    } catch (e) {
      toast.error(e.response?.data?.error || `Failed to ${action} task`);
    } finally {
      setProcessingId(null);
    }
  };

  // Review ALL tasks (with optional exclude_youtube flag)
  const handleReviewAll = async (action, excludeYouTube = false) => {
    let reason = '';
    const label = excludeYouTube ? 'ALL non-YouTube tasks' : 'ALL pending tasks';
    
    if (action === 'reject') {
      reason = prompt(`Enter rejection reason for ${label}:`);
      if (reason === null) return;
    } else {
      if (!window.confirm(`Are you sure you want to approve ${label}?`)) return;
    }

    setProcessingId(excludeYouTube ? 'all-no-yt' : 'all');
    try {
      const { data } = await api.post('/tasks/review-all', { 
        action, 
        rejection_reason: reason,
        exclude_youtube: excludeYouTube 
      });
      toast.success(data?.message || `Tasks ${action}d successfully`);
      if (excludeYouTube) {
        setTasks(prev => prev.filter(t => t.task_type === 'youtube'));
      } else {
        setTasks([]);
      }
    } catch (e) {
      toast.error(e.response?.data?.error || `Failed to ${action} tasks`);
    } finally {
      setProcessingId(null);
    }
  };

  // Review ALL tasks for a specific user profile (with optional exclude_youtube flag)
  const handleReviewUser = async (telegramId, action, excludeYouTube = true, username = '') => {
    let reason = '';
    const nameLabel = username ? `@${username}` : `User ${telegramId}`;
    const scopeLabel = excludeYouTube ? 'all tasks EXCEPT YouTube' : 'ALL tasks';

    if (action === 'reject') {
      reason = prompt(`Enter rejection reason for ${nameLabel} (${scopeLabel}):`);
      if (reason === null) return;
    } else {
      if (!window.confirm(`Approve ${scopeLabel} submitted by ${nameLabel}?`)) return;
    }

    setProcessingId(`user-${telegramId}`);
    try {
      const { data } = await api.post('/tasks/review-user', {
        telegram_id: telegramId,
        action,
        rejection_reason: reason,
        exclude_youtube: excludeYouTube
      });
      toast.success(data?.message || `${action}d profile tasks successfully`);
      
      // Remove reviewed tasks from local state
      setTasks(prev => prev.filter(t => {
        if (t.telegram_id.toString() !== telegramId.toString()) return true;
        if (excludeYouTube && t.task_type === 'youtube') return true;
        return false;
      }));
    } catch (e) {
      toast.error(e.response?.data?.error || `Failed to ${action} user tasks`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-10 h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse text-indigo-400">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
          <p className="font-bold text-ink tracking-widest uppercase text-sm">Loading Reviews...</p>
        </div>
      </div>
    );
  }

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = (t.title && t.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (t.username && t.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (t.first_name && t.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (t.telegram_id && t.telegram_id.toString().includes(searchTerm)) ||
                          (t.proof_screenshot_url && t.proof_screenshot_url.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    
    let matchesType = true;
    if (typeFilter === 'twitter') matchesType = t.task_type === 'twitter' || t.verification_type === 'proof_username';
    else if (typeFilter === 'youtube') matchesType = t.task_type === 'youtube';
    else if (typeFilter === 'telegram') matchesType = t.task_type === 'telegram';
    else if (typeFilter === 'other') matchesType = !['twitter', 'youtube', 'telegram'].includes(t.task_type);

    return matchesSearch && matchesCategory && matchesType;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.submitted_at) - new Date(a.submitted_at);
    if (sortBy === 'oldest') return new Date(a.submitted_at) - new Date(b.submitted_at);
    if (sortBy === 'reward') return Number(b.reward_tasky || 0) - Number(a.reward_tasky || 0);
    return 0;
  });

  const nonYtCount = tasks.filter(t => t.task_type !== 'youtube').length;
  const ytCount = tasks.filter(t => t.task_type === 'youtube').length;

  return (
    <div className="p-4 md:p-10 pb-20 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-ink mb-2 tracking-tight">Task Reviews</h1>
          <p className="text-ink-soft text-sm md:text-base">
            Review user submitted proofs ({tasks.length} pending: <strong className="text-indigo-400">{nonYtCount} Social/X</strong>, <strong className="text-red-400">{ytCount} YouTube</strong>).
          </p>
        </div>
        {tasks.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleReviewAll('reject', false)}
              disabled={processingId !== null}
              className="py-2.5 px-4 rounded-xl border border-red-500/20 text-red-400 font-bold text-xs hover:bg-red-500/10 hover:border-red-500/30 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <XCircle size={15} /> Reject All
            </button>
            
            {nonYtCount > 0 && (
              <button
                onClick={() => handleReviewAll('approve', true)}
                disabled={processingId !== null}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-xs transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                title="Approve all Twitter/Social tasks while keeping YouTube tasks for manual screenshot check"
              >
                <Zap size={15} className="animate-pulse" /> Approve All (Skip YouTube) ({nonYtCount})
              </button>
            )}

            <button
              onClick={() => handleReviewAll('approve', false)}
              disabled={processingId !== null}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 text-slate-900 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 size={15} /> Approve All ({tasks.length})
            </button>
          </div>
        )}
      </div>

      {/* Search & Filters Controls */}
      <div className="bg-surface-soft border border-border rounded-3xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-soft">
            <Search size={18} />
          </span>
          <input 
            type="text" 
            placeholder="Search by username, Telegram ID, task title..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border hover:border-indigo-500/30 focus:border-indigo-500 rounded-2xl text-ink font-semibold text-sm outline-none transition-all placeholder:text-ink-soft"
          />
        </div>
        
        <div className="flex flex-wrap w-full md:w-auto items-center gap-3">
          {/* Type Filter */}
          <div className="relative flex-1 md:flex-none">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full md:w-36 px-3.5 py-2.5 bg-surface border border-border hover:border-indigo-500/30 focus:border-indigo-500 rounded-2xl text-ink font-bold text-xs outline-none transition-all cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="twitter">Twitter / X</option>
              <option value="youtube">YouTube (Proofs)</option>
              <option value="telegram">Telegram</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="relative flex-1 md:flex-none">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full md:w-36 px-3.5 py-2.5 bg-surface border border-border hover:border-indigo-500/30 focus:border-indigo-500 rounded-2xl text-ink font-bold text-xs outline-none transition-all cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="internal">Internal</option>
              <option value="partner">Partner</option>
              <option value="social">Social</option>
            </select>
          </div>
          
          {/* Sort Filter */}
          <div className="relative flex-1 md:flex-none">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-36 px-3.5 py-2.5 bg-surface border border-border hover:border-indigo-500/30 focus:border-indigo-500 rounded-2xl text-ink font-bold text-xs outline-none transition-all cursor-pointer"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="reward">Sort: Reward (High)</option>
            </select>
          </div>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="bg-surface-soft p-12 rounded-3xl border border-border flex flex-col items-center justify-center shadow-sm">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-bold text-ink mb-1">No Reviews Found</h2>
          <p className="text-ink-soft text-sm">No pending tasks match your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {filteredTasks.map((task) => {
            // Count total pending tasks for this profile
            const userPending = tasks.filter(t => t.telegram_id === task.telegram_id);
            const userNonYt = userPending.filter(t => t.task_type !== 'youtube');
            const hasMultiple = userPending.length > 1;

            return (
              <div key={task.user_task_id} className="bg-surface-soft border border-border rounded-3xl overflow-hidden flex flex-col shadow-lg shadow-black/20 hover:border-indigo-500/30 transition-colors group">
                {/* Proof Area */}
                <div className="h-48 bg-[#0a0f1c] relative flex flex-col items-center justify-center border-b border-border/50">
                  {/* Task Type Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    {task.task_type === 'youtube' ? (
                      <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Video size={11} /> YouTube
                      </span>
                    ) : task.task_type === 'twitter' || task.verification_type === 'proof_username' ? (
                      <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Twitter size={11} /> X / Twitter
                      </span>
                    ) : (
                      <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Send size={11} /> Telegram
                      </span>
                    )}
                  </div>

                  {task.verification_type === 'proof_url' || task.verification_type === 'proof_username' ? (
                    <div className="p-6 text-center break-all w-full flex flex-col items-center justify-center h-full bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
                      <p className="text-ink-soft mb-2 uppercase text-[10px] font-black tracking-widest">{task.verification_type === 'proof_username' ? 'Username Submitted' : 'URL Submitted'}</p>
                      <a 
                        href={task.verification_type === 'proof_url' ? task.proof_screenshot_url : `https://x.com/${task.proof_screenshot_url?.replace('@', '')}`}
                        target="_blank" 
                        rel="noreferrer"
                        className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors text-base max-w-full truncate px-4 py-2 bg-indigo-500/10 rounded-xl"
                      >
                        {task.proof_screenshot_url}
                      </a>
                    </div>
                  ) : task.proof_screenshot_url ? (
                    <>
                      <img 
                        src={task.proof_screenshot_url.startsWith('http') ? task.proof_screenshot_url : "http://localhost:3000" + task.proof_screenshot_url} 
                        alt="Proof" 
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      />
                      <a 
                        href={task.proof_screenshot_url.startsWith('http') ? task.proof_screenshot_url : "http://localhost:3000" + task.proof_screenshot_url}
                        target="_blank" 
                        rel="noreferrer"
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2"
                      >
                        View Full Image <ExternalLink size={16} />
                      </a>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-ink-faint text-sm font-medium">No Proof Submitted</div>
                  )}
                </div>

                {/* Task Details */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="mb-3">
                    <h3 className="font-bold text-ink text-lg mb-1 leading-tight">{task.title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="bg-indigo-500/10 text-indigo-400 font-bold px-2.5 py-1 rounded-lg text-xs">+{task.reward_tasky} TASKY</span>
                      {parseFloat(task.reward_gram || 0) > 0 && (
                        <span className="bg-amber-500/10 text-amber-400 font-bold px-2.5 py-1 rounded-lg text-xs">+{task.reward_gram} GRAM</span>
                      )}
                      <span className="bg-surface text-ink-soft font-medium px-2.5 py-1 rounded-lg text-xs truncate max-w-[140px]">@{task.username || task.first_name}</span>
                    </div>
                    <p className="text-[10px] text-ink-faint mt-2.5 uppercase font-bold tracking-wider">Submitted: {new Date(task.submitted_at).toLocaleString()}</p>
                  </div>

                  {/* Profile Bulk Action (when user has multiple tasks or non-YT tasks) */}
                  <div className="mt-auto pt-3 border-t border-border/50 flex flex-col gap-2">
                    {hasMultiple && (
                      <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-2xl p-2.5 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[11px] text-ink-soft font-medium">
                          <span>Profile has <strong className="text-white">{userPending.length} tasks</strong> pending</span>
                          {userPending.length !== userNonYt.length && (
                            <span className="text-red-400 font-bold text-[10px]">({userPending.length - userNonYt.length} YouTube)</span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReviewUser(task.telegram_id, 'approve', true, task.username || task.first_name)}
                            disabled={processingId === `user-${task.telegram_id}` || userNonYt.length === 0}
                            className="flex-1 py-2 px-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-[11px] font-black tracking-tight transition-all flex items-center justify-center gap-1 shadow-sm disabled:opacity-40"
                            title="Approve all tasks for this profile except YouTube tasks"
                          >
                            <Zap size={12} /> Accept All Profile (No YT) {userNonYt.length > 0 && `(${userNonYt.length})`}
                          </button>
                          
                          <button
                            onClick={() => handleReviewUser(task.telegram_id, 'reject', false, task.username || task.first_name)}
                            disabled={processingId === `user-${task.telegram_id}`}
                            className="py-2 px-2 rounded-xl border border-red-500/20 hover:bg-red-500/10 text-red-400 text-[11px] font-bold transition-all disabled:opacity-40"
                            title="Reject all tasks for this profile"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Single Task Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReview(task.user_task_id, 'reject')}
                        disabled={processingId === task.user_task_id || processingId === `user-${task.telegram_id}`}
                        className="flex-1 py-2.5 rounded-xl border border-red-500/20 text-red-400 font-bold text-xs hover:bg-red-500/10 hover:border-red-500/30 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                      <button
                        onClick={() => handleReview(task.user_task_id, 'approve')}
                        disabled={processingId === task.user_task_id || processingId === `user-${task.telegram_id}`}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 text-slate-900 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} /> Approve
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

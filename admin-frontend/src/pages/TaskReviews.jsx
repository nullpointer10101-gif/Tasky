import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ExternalLink, Search, SlidersHorizontal } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function TaskReviews() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
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
      setTasks(tasks.filter(t => t.user_task_id !== id));
    } catch (e) {
      toast.error(e.response?.data?.error || `Failed to ${action} task`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReviewAll = async (action) => {
    let reason = '';
    if (action === 'reject') {
      reason = prompt('Enter rejection reason for ALL tasks:');
      if (reason === null) return;
    } else {
      if (!window.confirm('Are you sure you want to approve ALL pending tasks?')) return;
    }

    setProcessingId('all');
    try {
      await api.post('/tasks/review-all', { action, rejection_reason: reason });
      toast.success(`All tasks ${action}d successfully`);
      setTasks([]);
    } catch (e) {
      toast.error(e.response?.data?.error || `Failed to ${action} all tasks`);
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
                          (t.telegram_id && t.telegram_id.toString().includes(searchTerm));
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.submitted_at) - new Date(a.submitted_at);
    if (sortBy === 'oldest') return new Date(a.submitted_at) - new Date(b.submitted_at);
    if (sortBy === 'reward') return Number(b.reward_tasky || 0) - Number(a.reward_tasky || 0);
    return 0;
  });

  return (
    <div className="p-4 md:p-10 pb-20 max-w-7xl mx-auto">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-ink mb-2 tracking-tight">Task Reviews</h1>
          <p className="text-ink-soft text-sm md:text-base">Review user submitted proofs and approve rewards.</p>
        </div>
        {tasks.length > 0 && (
          <div className="flex gap-3">
            <button
              onClick={() => handleReviewAll('reject')}
              disabled={processingId === 'all'}
              className="py-2.5 px-5 rounded-xl border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/10 hover:border-red-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <XCircle size={18} /> Reject All
            </button>
            <button
              onClick={() => handleReviewAll('approve')}
              disabled={processingId === 'all'}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-400 text-slate-900 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 size={18} /> Approve All
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
        
        <div className="flex w-full md:w-auto items-center gap-3">
          <div className="relative flex-1 md:flex-none">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full md:w-40 px-4 py-2.5 bg-surface border border-border hover:border-indigo-500/30 focus:border-indigo-500 rounded-2xl text-ink font-bold text-xs outline-none transition-all cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="internal">Internal Tasks</option>
              <option value="partner">Partner Tasks</option>
              <option value="social">Social Tasks</option>
            </select>
          </div>
          
          <div className="relative flex-1 md:flex-none">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-40 px-4 py-2.5 bg-surface border border-border hover:border-indigo-500/30 focus:border-indigo-500 rounded-2xl text-ink font-bold text-xs outline-none transition-all cursor-pointer"
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
          {filteredTasks.map((task) => (
            <div key={task.user_task_id} className="bg-surface-soft border border-border rounded-3xl overflow-hidden flex flex-col shadow-lg shadow-black/20 hover:border-indigo-500/30 transition-colors group">
              {/* Proof Area */}
              <div className="h-48 bg-[#0a0f1c] relative flex flex-col items-center justify-center border-b border-border/50">
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
                <div className="mb-4">
                  <h3 className="font-bold text-ink text-lg mb-1 leading-tight">{task.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="bg-indigo-500/10 text-indigo-400 font-bold px-2.5 py-1 rounded-lg text-xs">+{task.reward_tasky} TASKY</span>
                    <span className="bg-surface text-ink-soft font-medium px-2.5 py-1 rounded-lg text-xs truncate max-w-[140px]">@{task.username || task.first_name}</span>
                  </div>
                  <p className="text-[10px] text-ink-faint mt-3 uppercase font-bold tracking-wider">Submitted: {new Date(task.submitted_at).toLocaleString()}</p>
                </div>

                {/* Actions */}
                <div className="mt-auto flex gap-2 pt-4 border-t border-border/50">
                  <button
                    onClick={() => handleReview(task.user_task_id, 'reject')}
                    disabled={processingId === task.user_task_id}
                    className="flex-1 py-3 rounded-xl border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/10 hover:border-red-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                  <button
                    onClick={() => handleReview(task.user_task_id, 'approve')}
                    disabled={processingId === task.user_task_id}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-400 text-slate-900 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} /> Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

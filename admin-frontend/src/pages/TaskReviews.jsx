import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function TaskReviews() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data } = await api.get('/tasks/pending');
      setTasks(data);
    } catch (e) {
      toast.error('Failed to load pending tasks');
    } finally {
      setLoading(false);
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

  if (loading) return <div className="p-8 text-ink">Loading pending tasks...</div>;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-ink mb-2">Task Reviews</h1>
        <p className="text-ink-soft">Review user submitted proofs and approve rewards.</p>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-surface-soft p-12 rounded-3xl border border-border text-center">
          <p className="text-ink-soft">No pending tasks to review! 🎉</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <div key={task.user_task_id} className="bg-surface-soft border border-border rounded-3xl overflow-hidden flex flex-col">
              {/* Proof Area */}
              <div className="h-48 bg-black/50 relative group flex flex-col items-center justify-center border-b border-border">
                {task.verification_type === 'proof_url' || task.verification_type === 'proof_username' ? (
                  <div className="p-4 text-center break-all w-full">
                    <p className="text-ink-soft mb-2 uppercase text-xs font-bold tracking-wider">{task.verification_type === 'proof_username' ? 'Username Submitted:' : 'URL Submitted:'}</p>
                    <a 
                      href={task.verification_type === 'proof_url' ? task.proof_screenshot_url : `https://x.com/${task.proof_screenshot_url?.replace('@', '')}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="text-indigo-400 font-bold hover:underline text-lg"
                    >
                      {task.proof_screenshot_url}
                    </a>
                  </div>
                ) : task.proof_screenshot_url ? (
                  <>
                    <img 
                      src={task.proof_screenshot_url.startsWith('http') ? task.proof_screenshot_url : "http://localhost:3000" + task.proof_screenshot_url} 
                      alt="Proof" 
                      className="w-full h-full object-cover"
                    />
                    <a 
                      href={task.proof_screenshot_url.startsWith('http') ? task.proof_screenshot_url : "http://localhost:3000" + task.proof_screenshot_url}
                      target="_blank" 
                      rel="noreferrer"
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2"
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
                  <h3 className="font-bold text-ink mb-1">{task.title}</h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-indigo-400 font-bold">+{task.reward_tasky} TASKY</span>
                    <span className="text-ink-faint">•</span>
                    <span className="text-ink-soft">User: @{task.username || task.first_name}</span>
                  </div>
                  <p className="text-[10px] text-ink-faint mt-1">Submitted: {new Date(task.submitted_at).toLocaleString()}</p>
                </div>

                {/* Actions */}
                <div className="mt-auto flex gap-3 pt-4 border-t border-border">
                  <button
                    onClick={() => handleReview(task.user_task_id, 'reject')}
                    disabled={processingId === task.user_task_id}
                    className="flex-1 py-2.5 rounded-xl border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                  <button
                    onClick={() => handleReview(task.user_task_id, 'approve')}
                    disabled={processingId === task.user_task_id}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
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

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PackageOpen, Clock, CheckCircle2, XCircle, ExternalLink, Image as ImageIcon, AlertCircle, ShieldAlert, Twitter, Send, Globe, Youtube, Repeat, CheckSquare, Cpu, Zap, Bot } from 'lucide-react';
import Card, { cardVariants } from '../components/Card';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { getTasks, getMySubmissions, completeTask } from '../api';
import { useToast } from '../App';

const containerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const IconRenderer = ({ name, ...props }) => {
  switch (name) {
    case 'Twitter': return <Twitter {...props} />;
    case 'Telegram': return <Send {...props} />;
    case 'Globe': return <Globe {...props} />;
    case 'Youtube': return <Youtube {...props} />;
    case 'Repeat': return <Repeat {...props} />;
    default: return <CheckSquare {...props} />;
  }
};

const getIconBgColor = (name) => {
  switch (name) {
    case 'Twitter': return 'bg-[#000000]'; // X is black
    case 'Telegram': return 'bg-[#0088cc]'; // Telegram blue
    case 'Youtube': return 'bg-[#FF0000]'; // YouTube red
    case 'Repeat': return 'bg-[#10b981]'; // Emerald green
    case 'Globe': return 'bg-[#3b82f6]'; // Blue
    default: return 'bg-gradient-primary';
  }
};

export default function Tasks({ user, refreshUser }) {
  const [activeTab, setActiveTab] = useState('available');
  const [activeCategory, setActiveCategory] = useState('all');
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTask, setSubmittedTask] = useState(null);
  const { showToast } = useToast();

  const [hasVisited, setHasVisited] = useState(false);
  const [proofData, setProofData] = useState('');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [tasksRes, subsRes] = await Promise.all([
      getTasks(user?.telegram_id || '123456'),
      getMySubmissions(user?.telegram_id || '123456')
    ]);
    if (tasksRes.data) setTasks(tasksRes.data.filter(t => !t.submission_status || t.submission_status === 'rejected'));
    if (subsRes.data) setSubmissions(subsRes.data);
    setLoading(false);
  };

  const handleSelectTask = (task) => {
    setSelectedTask(task);
    setHasVisited(false);
    setProofData('');
  };

  const handleTaskAction = () => {
    if (selectedTask?.action_url) {
      window.open(selectedTask.action_url, '_blank');
      setHasVisited(true);
    }
  };

  const handleSubmitProof = async () => {
    setIsSubmitting(true);
    let proof_screenshot_url = null;
    let proof_url = null;

    if (selectedTask.verification_type === 'proof_screenshot' && proofData) {
      try {
        const formData = new FormData();
        formData.append('image', proofData);
        const imgRes = await fetch(import.meta.env.VITE_API_URL === 'http://localhost:3000' ? '/api/upload' : `${import.meta.env.VITE_API_URL}/api/upload`, {
          method: 'POST',
          body: formData
        });
        const imgJson = await imgRes.json();
        if (imgJson.success) {
          proof_screenshot_url = imgJson.url;
        } else {
          showToast('Failed to upload image', 'error');
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        showToast('Image upload error', 'error');
        setIsSubmitting(false);
        return;
      }
    } else if (selectedTask.verification_type === 'proof_url') {
      proof_url = proofData;
    }

    const res = await completeTask(user?.telegram_id, selectedTask.id, proof_screenshot_url, proof_url);
    setIsSubmitting(false);
    if (res.data) {
      setSubmittedTask(selectedTask);
      setSelectedTask(null);
      fetchData();
      refreshUser();
    } else {
      showToast(res.error || 'Failed to submit', 'error');
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24 h-full flex flex-col relative">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-ink">Tasks</h1>
        <p className="text-sm text-ink-soft">Complete tasks to earn TASKY</p>
      </div>

      <div className="flex bg-surface-soft p-1 rounded-pill relative mb-2">
        {['available', 'submissions'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium z-10 transition-colors ${activeTab === tab ? 'text-ink' : 'text-ink-soft hover:text-ink'}`}
          >
            {tab === 'available' ? 'Available' : 'My Submissions'}
          </button>
        ))}
        <motion.div
          layoutId="taskTabIndicator"
          className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-surface rounded-pill shadow-sm border border-border"
          initial={false}
          animate={{ left: activeTab === 'available' ? '4px' : 'calc(50% + 0px)' }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-24 bg-surface-soft rounded-2xl"></div>
            <div className="h-24 bg-surface-soft rounded-2xl"></div>
            <div className="h-24 bg-surface-soft rounded-2xl"></div>
          </div>
        ) : activeTab === 'available' ? (
          <div className="flex flex-col h-full">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 mb-4 shrink-0">
              {['all', 'daily', 'weekly', 'bounty', 'social'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-4 py-1.5 rounded-pill text-sm font-bold border transition-colors ${activeCategory === cat ? 'bg-ink text-surface border-ink' : 'bg-surface border-border text-ink-soft hover:border-ink-faint'}`}
                >
                  {cat === 'all' ? 'All' : cat === 'daily' ? 'Daily' : cat === 'weekly' ? 'Weekly' : cat === 'bounty' ? 'Bounties' : 'One-Time'}
                </button>
              ))}
            </div>
            
            {tasks.length === 0 ? (
              <EmptyState title="No tasks available" message="You've completed all tasks for now!" />
            ) : (
              <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-6 pb-6">
                {['daily', 'weekly', 'social', 'bounty']
                  .filter(type => activeCategory === 'all' || activeCategory === type)
                  .map(type => {
                  const typeTasks = tasks.filter(t => (type === 'social' ? (t.type !== 'daily' && t.type !== 'weekly' && t.type !== 'bounty') : t.type === type));
                
                return (
                  <div key={type} className="space-y-3">
                    <h2 className="text-sm font-black text-ink-soft uppercase tracking-wider pl-2">
                      {type === 'daily' ? 'Daily Tasks' : type === 'weekly' ? 'Weekly Tasks' : type === 'bounty' ? 'Creator Bounties' : 'One-Time Tasks'}
                    </h2>
                    {typeTasks.length === 0 ? (
                      <div className="pl-2">
                         <p className="text-xs text-ink-faint italic">No tasks available in this category.</p>
                      </div>
                    ) : (
                      typeTasks.map(task => (
                        <Card key={task.id} className="relative cursor-pointer hover:border-ink-faint transition-colors flex items-center gap-4" onClick={() => handleSelectTask(task)}>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-soft shrink-0 ${getIconBgColor(task.icon)}`}>
                            <IconRenderer name={task.icon} size={20} />
                          </div>
                          <div className="pr-16 flex-1">
                            <h3 className="font-bold text-ink mb-1">{task.title}</h3>
                            <p className="text-sm text-ink-soft">{task.subtitle}</p>
                          </div>
                          <div className="absolute top-1/2 -translate-y-1/2 right-4 bg-surface-soft px-2 py-1 rounded-pill border border-border">
                            <span className="text-xs font-bold text-ink">+{task.reward_tasky}</span>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                );
              })}
              </motion.div>
            )}
          </div>
        ) : (
          submissions.length === 0 ? (
            <EmptyState title="No submissions yet" message="Complete some tasks to see them here." />
          ) : (
            <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-3">
              {submissions.map(sub => (
                <Card key={sub.id} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-soft flex items-center justify-center text-ink-soft shrink-0">
                    <IconRenderer name={sub.icon} size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-ink">{sub.title}</h3>
                      <span className="text-sm font-bold">+{sub.reward_tasky}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {sub.status === 'pending' && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-warning-soft text-warning rounded-pill uppercase font-bold tracking-wide"><Clock size={10}/> Pending</span>}
                      {sub.status === 'approved' && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-success-soft text-success rounded-pill uppercase font-bold tracking-wide"><CheckCircle2 size={10}/> Approved</span>}
                      {sub.status === 'rejected' && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-danger-soft text-danger rounded-pill uppercase font-bold tracking-wide"><XCircle size={10}/> Rejected</span>}
                      <span className="text-xs text-ink-faint">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                    </div>
                    {sub.status === 'rejected' && sub.rejection_reason && (
                      <p className="text-xs text-danger mt-1">Reason: {sub.rejection_reason}</p>
                    )}
                  </div>
                </Card>
              ))}
            </motion.div>
          )
        )}
      </div>

      {/* Bottom Sheet Modal */}
      <AnimatePresence>
        {selectedTask && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 "
              onClick={() => setSelectedTask(null)}
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-3xl border-t border-border p-6 pb-12 z-50 "
            >
              <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />
              
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">{selectedTask.title}</h2>
                <div className="bg-gradient-primary px-3 py-1 rounded-pill">
                  <span className="text-sm font-bold text-white">+{selectedTask.reward_tasky} TASKY</span>
                </div>
              </div>
              
              <div className="mb-6">
                {selectedTask.subtitle.includes('Rules:') ? (
                  <>
                    <p className="text-ink-soft mb-3">{selectedTask.subtitle.split('Rules:')[0]}</p>
                    <div className="bg-surface-soft p-4 rounded-xl border border-border">
                      <p className="text-xs font-black text-ink mb-3 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-indigo-500" />
                        Required Rules
                      </p>
                      <ul className="space-y-2">
                        {selectedTask.subtitle.split('Rules:')[1].split(',').map((rule, idx) => {
                          let cleanRule = rule.trim();
                          if (cleanRule.startsWith('and ')) cleanRule = cleanRule.substring(4);
                          if (!cleanRule) return null;
                          return (
                            <li key={idx} className="flex items-start gap-2 text-sm text-ink-soft">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                              <span className="leading-tight">{cleanRule}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </>
                ) : (
                  <p className="text-ink-soft">{selectedTask.subtitle}</p>
                )}
              </div>

              <div className="space-y-4">
                {selectedTask.type !== 'bounty' && (
                  <Button variant="secondary" className="w-full justify-between" onClick={handleTaskAction}>
                    <span>Go to Task</span>
                    <ExternalLink size={18} />
                  </Button>
                )}

                {(!hasVisited && selectedTask.type !== 'bounty') ? (
                  <div className="bg-surface-soft border border-warning/20 p-4 rounded-xl space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="text-warning shrink-0 mt-0.5" />
                      <p className="text-sm text-ink-soft leading-tight">
                        <strong className="text-ink">Action Required:</strong> You must visit the task link before you can submit your proof.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldAlert size={16} className="text-danger shrink-0 mt-0.5" />
                      <p className="text-sm text-ink-soft leading-tight">
                        <strong className="text-danger">Warning:</strong> Make sure you follow the task criteria and provide valid proof. Failing more than 5 tasks will cause permanent account suspension.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedTask.verification_type === 'proof_screenshot' && (
                      <label className="block border-2 border-dashed border-border rounded-2xl p-4 text-center cursor-pointer hover:bg-surface-soft transition-colors">
                        {proofData ? (
                          <span className="text-sm text-success font-bold text-center w-full block">Image Selected ✓</span>
                        ) : (
                          <>
                            <ImageIcon size={24} className="mx-auto text-ink-faint mb-2" />
                            <span className="text-sm text-ink-soft">Upload Screenshot Proof</span>
                          </>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={e => setProofData(e.target.files[0])} />
                      </label>
                    )}

                    {selectedTask.verification_type === 'proof_url' && (
                      <input 
                        type="url" 
                        placeholder={
                          (selectedTask.title.toLowerCase().includes('retweet') || selectedTask.title.toLowerCase().includes('repost') || selectedTask.action_url.toLowerCase().includes('x.com') || selectedTask.action_url.toLowerCase().includes('twitter.com')) 
                            ? "Paste your Retweet/Repost link here" 
                            : (selectedTask.title.toLowerCase().includes('youtube') || selectedTask.action_url.toLowerCase().includes('youtube.com'))
                              ? "Paste your YouTube Video link here"
                              : "Paste your proof link here"
                        }
                        value={proofData}
                        onChange={e => setProofData(e.target.value)}
                        className="w-full bg-surface-soft border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-ink-faint transition-colors"
                      />
                    )}

                    <Button 
                      className="w-full" 
                      onClick={handleSubmitProof} 
                      disabled={isSubmitting || (selectedTask.verification_type === 'proof_screenshot' && !proofData) || (selectedTask.verification_type === 'proof_url' && !proofData)}
                    >
                      {isSubmitting 
                        ? 'Submitting...' 
                        : (selectedTask.verification_type === 'none' || selectedTask.verification_type === 'auto_telegram')
                          ? 'Complete Task' 
                          : 'Submit Proof'}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Task Submitted Popup ── */}
      <AnimatePresence>
        {submittedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={() => setSubmittedTask(null)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)' }}
            >
              {/* Top glow strip */}
              <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #818cf8, #a78bfa, #818cf8)' }} />

              <div className="p-6">
                {/* Animated icon */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-indigo-400/20 animate-ping" />
                    <div className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                      <Cpu size={28} className="text-white" />
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-center text-xl font-black text-white mb-1">Submitted!</h2>
                <p className="text-center text-indigo-300 text-xs font-medium mb-5">Automated review in progress</p>

                {/* Task name pill */}
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 mb-4">
                  <CheckCircle2 size={16} className="text-indigo-400 flex-shrink-0" />
                  <p className="text-white text-sm font-bold truncate">{submittedTask.title}</p>
                  <span className="ml-auto text-xs font-black text-emerald-400 flex-shrink-0">+{submittedTask.reward_tasky} TASKY</span>
                </div>

                {/* Steps */}
                <div className="space-y-2.5 mb-5">
                  {[
                    { icon: Zap, label: 'Proof received', done: true },
                    { icon: Bot, label: 'AI system verifying now...', done: false, active: true },
                    { icon: CheckCircle2, label: 'Reward credited to balance', done: false },
                  ].map((step, i) => (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                      step.done ? 'bg-emerald-500/10' : step.active ? 'bg-indigo-500/15' : 'bg-white/4'
                    }`}>
                      <step.icon size={14} className={step.done ? 'text-emerald-400' : step.active ? 'text-indigo-300' : 'text-white/20'} />
                      <span className={`text-xs font-semibold ${
                        step.done ? 'text-emerald-300' : step.active ? 'text-indigo-200' : 'text-white/25'
                      }`}>{step.label}</span>
                      {step.active && (
                        <div className="ml-auto flex gap-0.5">
                          {[0,1,2].map(d => (
                            <div key={d} className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-center text-white/30 text-[10px] leading-relaxed mb-4">
                  Our automated system reviews all submissions in real-time.<br />Rewards are credited instantly upon approval.
                </p>

                <button
                  onClick={() => setSubmittedTask(null)}
                  className="w-full py-3 rounded-2xl font-black text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  Got it!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PackageOpen, Clock, CheckCircle2, XCircle, ExternalLink, Image as ImageIcon, AlertCircle, ShieldAlert, Twitter, Send, Globe, Youtube, Repeat, CheckSquare, Cpu, Zap, Bot, Video, Rocket } from 'lucide-react';
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
    case 'Video': return <Video {...props} />;
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
    case 'Video': return 'bg-[#8b5cf6]'; // Purple
    default: return 'bg-gradient-primary';
  }
};

export default function Tasks({ user, refreshUser }) {
  const [activeTab, setActiveTab] = useState('available');
  const [activeCategory, setActiveCategory] = useState('all');
  const [placementCategory, setPlacementCategory] = useState('internal');
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTask, setSubmittedTask] = useState(null);
  const { showToast } = useToast();

  const [hasVisited, setHasVisited] = useState(false);
  const [proofData, setProofData] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tasksRes, subsRes] = await Promise.all([
          getTasks(user?.telegram_id || '123456'),
          getMySubmissions(user?.telegram_id || '123456')
        ]);
        if (!isMounted) return;
        if (tasksRes.data) setTasks(tasksRes.data.filter(t => !t.submission_status || t.submission_status === 'rejected'));
        if (subsRes.data) setSubmissions(subsRes.data);
      } catch (err) {
        if (!isMounted) return;
        console.error('Tasks fetchData error:', err);
        showToast(err.message || 'Error loading tasks', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [user]);

  // Expose fetchData for other functions
  const reloadData = async () => {
    try {
      const [tasksRes, subsRes] = await Promise.all([
        getTasks(user?.telegram_id || '123456'),
        getMySubmissions(user?.telegram_id || '123456')
      ]);
      if (tasksRes.data) setTasks(tasksRes.data.filter(t => !t.submission_status || t.submission_status === 'rejected'));
      if (subsRes.data) setSubmissions(subsRes.data);
    } catch (err) {
      console.error('Tasks reloadData error:', err);
      showToast(err.message || 'Error reloading tasks', 'error');
    }
  };

  const handleSelectTask = (task) => {
    setSelectedTask(task);
    setHasVisited(!task.action_url);
    setProofData('');
    setCountdown(0);
    setTimerStarted(false);
  };

  const handleTaskAction = async () => {
    if (selectedTask?.action_url) {
      let finalUrl = selectedTask.action_url;
      
      if (finalUrl.includes('/latest')) {
        try {
          const channelParts = finalUrl.split('t.me/');
          if (channelParts.length > 1) {
            const channelName = channelParts[1].split('/')[0];
            const API_URL = import.meta.env.VITE_API_URL === 'http://localhost:3000' ? '' : import.meta.env.VITE_API_URL;
            const res = await fetch(`${API_URL}/api/tasks/latest-post?channel=${channelName}`);
            const data = await res.json();
            if (data.latestUrl) {
              finalUrl = data.latestUrl;
            }
          }
        } catch (e) { console.error('Failed to resolve latest post', e); }
      }

      if (selectedTask.title === 'Say GM in Community') {
        try {
          navigator.clipboard.writeText('GM');
          showToast('Copied "GM" to clipboard! Paste it in the chat.', 'success');
        } catch (e) {}
      }
      
      window.open(finalUrl, '_blank');
      setHasVisited(true);
      if ((selectedTask.verification_type === 'timer_10s' || selectedTask.verification_type === 'auto_telegram') && !timerStarted) {
        setTimerStarted(true);
        setCountdown(10);
        const endTime = Date.now() + 10000;
        const interval = setInterval(() => {
          const remaining = Math.ceil((endTime - Date.now()) / 1000);
          if (remaining <= 0) {
            clearInterval(interval);
            setCountdown(0);
          } else {
            setCountdown(remaining);
          }
        }, 500);
      }
    }
  };

  const handleSubmitProof = async () => {
    try {
      setIsSubmitting(true);
      let proof_screenshot_url = null;
      let proof_url = null;

      if (selectedTask.verification_type === 'proof_screenshot' && proofData) {
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
      } else if (selectedTask.verification_type === 'proof_url' || selectedTask.verification_type === 'proof_username') {
        proof_url = proofData;
      } else if (selectedTask.verification_type === 'auto_ad') {
        if (selectedTask.last_ad_time) {
          const secondsSinceLastAd = (Date.now() - new Date(selectedTask.last_ad_time).getTime()) / 1000;
          if (secondsSinceLastAd < 30) {
            const timeLeft = Math.ceil(30 - secondsSinceLastAd);
            showToast(`Please wait ${timeLeft} seconds before watching another ad.`, 'error');
            setIsSubmitting(false);
            return;
          }
        }
        
        if (typeof window.showGiga === 'undefined') {
          showToast('Ad network not loaded. Please try again later.', 'error');
          setIsSubmitting(false);
          return;
        }
        try {
          await window.showGiga("main");
        } catch (e) {
          showToast('You must watch the entire ad to get the reward.', 'error');
          setIsSubmitting(false);
          return;
        }
      }

      const res = await completeTask(user?.telegram_id, selectedTask.id, proof_screenshot_url, proof_url);
      setIsSubmitting(false);
      if (res.data) {
        const isAutoApproved = ['auto_telegram', 'auto_referral', 'none', 'auto_ad', 'timer_10s'].includes(selectedTask.verification_type);
        
        const updatedTask = { 
          ...selectedTask, 
          status: isAutoApproved ? 'approved' : 'pending',
          submitted_at: new Date().toISOString()
        };
        setTasks(prev => {
          if (selectedTask.verification_type === 'auto_ad') return prev;
          return prev.filter(t => t.id !== selectedTask.id);
        });
        setSubmissions(prev => [updatedTask, ...prev]);

        setSelectedTask(null);
        if (isAutoApproved) {
          showToast(`Task Verified! +${selectedTask.reward_tasky} TASKY`, 'success');
        } else {
          setSubmittedTask(selectedTask);
        }
        
        reloadData();
        refreshUser();
      } else {
        showToast(res.error || 'Failed to submit', 'error');
      }
    } catch (err) {
      console.error('handleSubmitProof error:', err);
      setIsSubmitting(false);
      showToast(err.message || 'Error submitting proof', 'error');
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
        {activeTab === 'available' ? (
          <div className="flex flex-col h-full">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setPlacementCategory('internal')}
                  className={`flex-1 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${placementCategory === 'internal' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-surface-soft border-border text-ink-soft'}`}
                >
                  Tasky Missions
                </button>
                <button
                  onClick={() => setPlacementCategory('partner')}
                  className={`flex-1 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${placementCategory === 'partner' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'bg-surface-soft border-border text-ink-soft'}`}
                >
                  Partner Promos
                </button>
              </div>


            
            {tasks.length === 0 ? (
              <EmptyState title="No tasks available" message="You've completed all tasks for now!" />
            ) : (
              <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-3 pb-6">
                {(() => {
                  const filteredTasks = tasks.filter(t => {
                    return (t.category || 'internal') === placementCategory;
                  });
                  
                  return filteredTasks.length === 0 ? (
                    <div className="pl-2">
                       <p className="text-xs text-ink-faint italic">No tasks available right now.</p>
                    </div>
                  ) : (
                    filteredTasks.map(task => (
                      <Card key={task.id} className={`relative cursor-pointer transition-all duration-300 flex items-center gap-4 py-3 px-4 overflow-hidden ${task.verification_type === 'auto_ad' ? 'border-rose-500/50 bg-gradient-to-r from-rose-500/10 via-purple-500/5 to-orange-500/10 hover:border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.15)] my-1' : task.category === 'partner' ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/5 to-transparent hover:border-amber-400' : 'hover:border-indigo-500/30 bg-surface-soft'}`} onClick={() => handleSelectTask(task)}>
                        {task.verification_type === 'auto_ad' && (
                          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
                        )}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg shrink-0 relative z-10 ${getIconBgColor(task.icon)}`}>
                          <IconRenderer name={task.icon} size={20} />
                          {task.verification_type === 'auto_ad' && (
                            <div className="absolute -top-1 -right-1 flex h-4 w-4">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-surface"></span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pr-16 relative z-10">
                          <h3 className="font-bold text-ink text-[15px] leading-tight mb-1 truncate flex items-center gap-1.5">
                            {task.title}
                            {task.x_subtype === 'follow' && <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 font-black uppercase tracking-wider">Follow</span>}
                            {task.x_subtype === 'repost' && <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-black uppercase tracking-wider">Repost</span>}
                          </h3>
                          <p className={`text-xs truncate ${task.verification_type === 'auto_ad' ? 'text-rose-400/80 font-medium' : 'text-ink-soft'}`}>{task.subtitle}</p>
                        </div>
                        <div className={`absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full shadow-sm border z-10 ${task.verification_type === 'auto_ad' ? 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : 'bg-surface border-border'}`}>
                          <span className={`text-sm font-black ${task.verification_type === 'auto_ad' ? 'text-rose-500' : 'text-ink'}`}>+{task.reward_tasky}</span>
                        </div>
                      </Card>
                    ))
                  );
                })()}
              </motion.div>

            )}

            {placementCategory === 'partner' && (
                <div className="mt-2 mb-6">
                  <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500/50 transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.1)] relative overflow-hidden group" onClick={() => window.open('https://t.me/taskycs', '_blank')}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all duration-500 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-all duration-500 pointer-events-none" />
                    
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30 relative z-10 group-hover:scale-110 transition-transform duration-300">
                      <Rocket size={26} />
                    </div>
                    <h3 className="font-black text-ink text-xl mb-1 relative z-10 tracking-tight">Promote Your Project</h3>
                    <p className="text-sm text-ink-soft mb-5 relative z-10 font-medium px-4">Want to get listed here? Grow your community with thousands of active users.</p>
                    <button className="bg-ink hover:bg-indigo-500 text-surface font-bold py-2.5 px-8 rounded-xl transition-colors shadow-md relative z-10 flex items-center gap-2">
                      <Send size={16} /> Contact Sales
                    </button>
                  </Card>
                </div>
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

      {createPortal(
        <AnimatePresence>
          {selectedTask && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-[60]"
                onClick={() => setSelectedTask(null)}
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-3xl border-t border-border p-6 pb-12 z-[70]"
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
                
                {selectedTask.verification_type === 'auto_ad' && (
                  <div className="bg-surface-soft border border-border rounded-xl p-4 mt-3">
                    <p className="text-sm font-bold text-ink mb-2 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-indigo-500" />
                      Required Rules
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-ink-soft">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span className="leading-tight">You must watch the entire ad to get the reward.</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-ink-soft">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span className="leading-tight">Skipping or closing the ad early will cancel the reward.</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-ink-soft">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span className="leading-tight">Daily limit: 60 ads per 24 hours (30 TASKY per ad).</span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {selectedTask.type !== 'bounty' && selectedTask.action_url && (
                  <Button variant="secondary" className="w-full justify-between" onClick={handleTaskAction}>
                    <span>{selectedTask.x_subtype === 'follow' ? 'Follow on X' : selectedTask.x_subtype === 'repost' ? 'View Post to Repost' : 'Go to Task'}</span>
                    <ExternalLink size={18} />
                  </Button>
                )}

                {(!hasVisited && selectedTask.type !== 'bounty' && selectedTask.action_url) ? (
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

                    {selectedTask.verification_type === 'proof_username' && (
                      <input 
                        type="text" 
                        placeholder="Enter your X (Twitter) username (e.g. @janedoe)"
                        value={proofData}
                        onChange={e => setProofData(e.target.value)}
                        className="w-full bg-surface-soft border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-ink-faint transition-colors"
                      />
                    )}

                    <Button 
                      onClick={handleSubmitProof}
                      disabled={isSubmitting || (selectedTask.verification_type === 'auto_referral' && (user?.valid_referrals || 0) < 5) || (selectedTask.verification_type === 'proof_screenshot' && !proofData && !hasVisited) || ((selectedTask.verification_type === 'proof_url' || selectedTask.verification_type === 'proof_username') && !proofData) || ((selectedTask.verification_type === 'timer_10s' || selectedTask.verification_type === 'auto_telegram') && (!timerStarted || countdown > 0))}
                      className={`w-full font-bold text-white shadow-lg ${isSubmitting ? 'bg-gray-500' : 'bg-gradient-primary hover:opacity-90'}`}
                    >
                      {isSubmitting 
                        ? 'Submitting...' 
                        : selectedTask.verification_type === 'auto_referral' 
                          ? (user?.valid_referrals >= 5 ? 'Claim Reward' : `${user?.valid_referrals || 0} / 5 Friends Invited`)
                          : selectedTask.verification_type === 'auto_ad'
                            ? 'Watch Ad'
                          : (selectedTask.verification_type === 'timer_10s' || selectedTask.verification_type === 'auto_telegram')
                            ? (countdown > 0 ? `Wait ${countdown}s...` : (!timerStarted ? 'Click "Go to Task" first' : 'Claim Reward'))
                          : selectedTask.verification_type === 'none'
                            ? 'Complete Task' 
                            : 'Submit Proof'}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Task Submitted Popup ── */}
      {createPortal(
        <AnimatePresence>
          {submittedTask && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-end justify-center pb-8 px-4"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
              onClick={() => setSubmittedTask(null)}
            >
              <motion.div
                initial={{ y: 80, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 60, opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-sm rounded-3xl overflow-hidden z-[70]"
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
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

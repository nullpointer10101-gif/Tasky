import React, { useState, useEffect } from 'react';
import { showRewardedAd } from '../adUtils';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PackageOpen, Clock, CheckCircle2, XCircle, ExternalLink, Image as ImageIcon, AlertCircle, ShieldAlert, Twitter, Send, Globe, Youtube, Repeat, CheckSquare, Cpu, Zap, Bot, Video, Rocket, Gift, Flame, Coins, Sparkles, Gem } from 'lucide-react';
import Card, { cardVariants } from '../components/Card';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { getTasks, getMySubmissions, completeTask, getGramStatus } from '../api';
import { useToast } from '../App';
import PromoCodeModal from '../components/PromoCodeModal';
import GramClaimModal from '../components/GramClaimModal';
import { useIsAdmin } from '../AdminContext';

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
    case 'Gem': return <Gem {...props} />;
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
    case 'Gem': return 'bg-gradient-to-r from-emerald-500 to-teal-500';
    default: return 'bg-gradient-primary';
  }
};

export default function Tasks({ user, refreshUser, navigate }) {
  const [activeTab, setActiveTab] = useState('available');
  const [activeCategory, setActiveCategory] = useState('all');
  const [placementCategory, setPlacementCategory] = useState('internal');
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTask, setSubmittedTask] = useState(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [isGramModalOpen, setIsGramModalOpen] = useState(false);
  const [gramStatusData, setGramStatusData] = useState(null);
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
        const [tasksRes, subsRes, gramRes] = await Promise.all([
          getTasks(user?.telegram_id || '123456'),
          getMySubmissions(user?.telegram_id || '123456'),
          getGramStatus(user?.telegram_id || '123456')
        ]);
        if (!isMounted) return;
        if (tasksRes.data) setTasks(tasksRes.data.filter(t => (!t.submission_status || t.submission_status === 'rejected') && t.verification_type !== 'gram_ad'));
        if (subsRes.data) setSubmissions(subsRes.data);
        if (gramRes.data) setGramStatusData(gramRes.data);
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
      const [tasksRes, subsRes, gramRes] = await Promise.all([
        getTasks(user?.telegram_id || '123456'),
        getMySubmissions(user?.telegram_id || '123456'),
        getGramStatus(user?.telegram_id || '123456')
      ]);
      if (tasksRes.data) setTasks(tasksRes.data.filter(t => (!t.submission_status || t.submission_status === 'rejected') && t.verification_type !== 'gram_ad'));
      if (subsRes.data) setSubmissions(subsRes.data);
      if (gramRes.data) setGramStatusData(gramRes.data);
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
      let currentTask = selectedTask;

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
      }

      if (selectedTask.verification_type === 'auto_ad') {
        // Enforce 4-second cooldown
        if (selectedTask.last_ad_time) {
          const secondsSinceLastAd = (Date.now() - new Date(selectedTask.last_ad_time).getTime()) / 1000;
          if (secondsSinceLastAd < 4) {
            const timeLeft = Math.ceil(4 - secondsSinceLastAd);
            showToast(`Please wait ${timeLeft} seconds before watching another ad.`, 'error');
            setIsSubmitting(false);
            return;
          }
        }

        // Show rewarded ad using Adexium ONLY (no GigaPub fallback) for auto_ad tasks
        const adResult = await showRewardedAd('tasks', { adexiumOnly: true, allowFallback: false });
        if (!adResult.success) {
          showToast(adResult.error || 'You must watch the entire ad to get the reward.', 'error');
          setIsSubmitting(false);
          return;
        }
      }

      // Submit task completion to backend
      const activeTask = selectedTask;
      const tgUser = window?.Telegram?.WebApp?.initDataUnsafe?.user || { first_name: user?.first_name, username: user?.username };
      const res = await completeTask(user?.telegram_id, activeTask.id, proof_screenshot_url, proof_url, tgUser);
      setIsSubmitting(false);
      if (res.data) {
        const isAutoApproved = ['auto_telegram', 'auto_referral', 'none', 'auto_ad', 'timer_10s', 'telegram_suffix'].includes(activeTask.verification_type);

        if (activeTask.verification_type === 'auto_ad') {
          // Optimistically increment the counter in the task subtitle immediately
          setTasks(prev => prev.map(t => {
            if (t.id !== activeTask.id) return t;
            const match = (t.subtitle || '').match(/^(\d+)\/60/);
            const current = match ? parseInt(match[1]) + 1 : 1;
            return {
              ...t,
              subtitle: `${current}/60 completed in last 24h.`,
              last_ad_time: new Date().toISOString()
            };
          }));
          showToast(`Ad watched! +${activeTask.reward_tasky} TASKY`, 'success');
        } else {
          const updatedTask = {
            ...activeTask,
            status: res.data.status || (isAutoApproved ? 'approved' : 'pending'),
            submitted_at: new Date().toISOString()
          };
          setTasks(prev => prev.filter(t => t.id !== activeTask.id));
          setSubmissions(prev => [updatedTask, ...prev]);
          if (res.data.status === 'approved' || isAutoApproved) {
            if (parseFloat(activeTask.reward_gram || 0) > 0) {
              showToast(`Task Verified! +${activeTask.reward_gram} GRAM 💎`, 'success');
            } else {
              showToast(`Task Verified! +${activeTask.reward_tasky} TASKY`, 'success');
            }
          } else {
            setSubmittedTask(activeTask);
          }
        }

        setSelectedTask(null);
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
    <>
    <div className="p-4 space-y-4 pb-20 min-h-full relative">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Tasks</h1>
          <p className="text-sm text-ink-soft">Complete tasks to earn TASKY</p>
        </div>
      </div>



      {/* Redeem Bounty Code Banner */}
      <motion.div 
        whileTap={{ scale: 0.96 }}
        onClick={() => setIsPromoModalOpen(true)}
        className="relative overflow-hidden rounded-[1.25rem] cursor-pointer bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 border border-indigo-500/30 p-4 mb-4 shadow-[0_0_15px_rgba(99,102,241,0.2)] flex items-center justify-between"
      >
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-pink-500/20 blur-xl rounded-full" />
        <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-indigo-500/20 blur-xl rounded-full" />
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg border border-white/20">
            <Gift size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-black text-white text-[15px] uppercase tracking-wide">Redeem Bounty Code</h3>
            <p className="text-[12px] text-indigo-200 font-medium">Claim secret rewards</p>
          </div>
        </div>
        <div className="relative z-10 bg-white/10 p-2 rounded-xl border border-white/10">
          <ExternalLink size={16} className="text-white" />
        </div>
      </motion.div>



      <div className="flex p-1.5 rounded-[1.25rem] relative mb-5 bg-surface-soft shadow-inner">
        {['available', 'submissions'].map((tab) => (
          <motion.button
            key={tab}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3.5 text-[15px] font-black z-10 transition-colors tracking-wide ${activeTab === tab ? 'text-surface' : 'text-ink-soft hover:text-ink'}`}
          >
            {tab === 'available' ? 'Missions' : 'History'}
          </motion.button>
        ))}
        <motion.div
          layoutId="taskTabIndicator"
          className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-ink rounded-2xl shadow-lg"
          initial={false}
          animate={{ left: activeTab === 'available' ? '6px' : 'calc(50% + 0px)' }}
          transition={{ type: "spring", stiffness: 500, damping: 25, mass: 0.8 }}
        />
      </div>

      <div className="">
        {activeTab === 'available' ? (
          <div className="flex flex-col">
              <div className="flex gap-3 mb-6 px-1">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPlacementCategory('internal')}
                  className={`flex-1 py-4 rounded-[1.25rem] text-[13px] font-black uppercase tracking-wider transition-all border-2 overflow-hidden relative flex flex-col items-center justify-center gap-1 ${placementCategory === 'internal' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30 ' : 'bg-surface-soft border-transparent text-ink-soft opacity-70'}`}
                >
                  {placementCategory === 'internal' && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent -translate-x-full " />}
                  Tasky
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPlacementCategory('partner')}
                  className={`flex-1 py-4 rounded-[1.25rem] text-[13px] font-black uppercase tracking-wider transition-all border-2 overflow-hidden relative flex flex-col items-center justify-center gap-1 ${placementCategory === 'partner' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 ' : 'bg-surface-soft border-transparent text-ink-soft opacity-70'}`}
                >
                  {placementCategory === 'partner' && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent -translate-x-full " />}
                  Partners
                </motion.button>
              </div>

              {placementCategory === 'internal' && (
                <motion.div 
                  whileTap={{ scale: 0.96 }}
                  className="relative cursor-pointer transition-all duration-300 flex items-center gap-3.5 py-3.5 px-4 mb-4 overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/25 border-b-[3px] shadow-sm"
                  onClick={() => navigate('gram')}
                >
                  <div className="absolute -right-4 -top-4 w-12 h-12 bg-yellow-500/10 blur-lg rounded-full" />
                  
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 bg-gradient-to-br from-amber-400 to-yellow-600 border border-white/10">
                    <Coins size={20} />
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-16 relative z-10 text-left">
                    <h3 className="font-black text-[15.5px] leading-tight mb-0.5 text-amber-500 flex items-center gap-1.5">
                      Gram Daily Reward
                      {gramStatusData?.ads_watched_today >= 60 && !gramStatusData?.claimed_in_last_24h && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      )}
                    </h3>
                    <p className="text-[12.5px] truncate text-amber-400/80 font-bold">
                      {gramStatusData ? `Progress: ${gramStatusData.ads_watched_today}/60 ads watched` : 'Claim 0.02 GRAM daily'}
                    </p>
                  </div>
                  
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-xl shadow-sm z-10 flex flex-col items-center justify-center bg-gradient-to-br from-amber-500 to-yellow-600 border border-amber-400/20">
                    <span className="text-[14px] font-black text-slate-900">0.02 GRAM</span>
                  </div>
                </motion.div>
              )}


            
            {tasks.length === 0 ? (
              <EmptyState title="No tasks available" message="You've completed all tasks for now!" />
            ) : (
              <motion.div    className="space-y-3 pb-6">
                {(() => {
                  const filteredTasks = tasks.filter(t => {
                    return (t.category || 'internal') === placementCategory;
                  }).sort((a, b) => {
                    if (a.verification_type === 'auto_ad' && b.verification_type !== 'auto_ad') return -1;
                    if (b.verification_type === 'auto_ad' && a.verification_type !== 'auto_ad') return 1;
                    return 0;
                  });
                  
                  return filteredTasks.length === 0 ? (
                    <div className="pl-2">
                       <p className="text-xs text-ink-faint italic">No tasks available right now.</p>
                    </div>
                  ) : (
                    filteredTasks.map(task => (
                      <motion.div 
                        key={task.id} 
                        whileTap={{ scale: 0.96 }}
                        className={`relative cursor-pointer transition-all duration-300 flex items-center gap-3.5 py-3.5 px-4 mb-2.5 overflow-hidden rounded-[1.25rem] active:translate-y-[2px] active:border-b-[1px] active:shadow-none ${task.verification_type === 'telegram_suffix' ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/50 border-b-[3px] shadow-[0_0_15px_rgba(16,185,129,0.1)]' : task.verification_type === 'auto_ad' ? 'bg-gradient-to-r from-rose-500/10 via-orange-500/5 to-transparent border border-rose-500/50 border-b-[3px]' : task.category === 'partner' ? 'bg-amber-500/5 border border-amber-500/20 border-b-[3px]' : 'bg-surface border-b-[3px] border-x border-t border-border shadow-sm'}`} 
                        onClick={() => handleSelectTask(task)}
                      >
                        {task.verification_type === 'telegram_suffix' && (
                          <div className="absolute top-0 right-0 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[9px] font-black px-2.5 py-1 rounded-bl-xl shadow-sm z-20 flex items-center gap-1.5">
                            <Gem size={10} className="text-white animate-pulse" />
                            REAL GRAM
                          </div>
                        )}
                        {task.verification_type === 'auto_ad' && (
                          <div className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-black px-2.5 py-1 rounded-bl-xl shadow-sm z-20 flex items-center gap-1">
                            <Flame size={10} className="text-yellow-300" />
                            LIMITED TIME
                          </div>
                        )}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 relative z-10 ${task.verification_type === 'telegram_suffix' ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : task.verification_type === 'auto_ad' ? 'bg-gradient-to-br from-rose-500 to-orange-500' : getIconBgColor(task.icon)}`}>
                          <IconRenderer name={task.verification_type === 'telegram_suffix' ? 'Gem' : task.icon} size={20} />
                          {task.verification_type === 'auto_ad' && (
                            <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping"></span>
                              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border-2 border-white dark:border-gray-900"></span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 relative z-10" style={{ paddingRight: parseFloat(task.reward_gram || 0) > 0 ? '135px' : '64px' }}>
                          <h3 className={`font-black text-[15.5px] leading-tight mb-0.5 truncate flex items-center gap-1.5 ${task.verification_type === 'telegram_suffix' ? 'text-emerald-500' : task.verification_type === 'auto_ad' ? 'text-rose-500' : 'text-ink'}`}>
                            {task.title}
                            {task.x_subtype === 'follow' && <span className="text-[9px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded-md border border-indigo-500/20 font-black uppercase tracking-wider">Follow</span>}
                            {task.x_subtype === 'repost' && <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-md border border-emerald-500/20 font-black uppercase tracking-wider">Repost</span>}
                          </h3>
                          <p className={`text-[12.5px] truncate ${task.verification_type === 'telegram_suffix' ? 'text-emerald-500/70 font-semibold' : task.verification_type === 'auto_ad' ? 'text-orange-500 font-bold' : 'text-ink-soft'}`}>{task.subtitle}</p>
                        </div>
                        <div className={`absolute right-4 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-xl shadow-sm z-10 flex flex-col items-center justify-center ${task.verification_type === 'telegram_suffix' ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : task.verification_type === 'auto_ad' ? 'bg-gradient-to-br from-rose-500 to-orange-500 animate-pulse' : 'bg-surface-soft border border-border'}`}>
                          <span className={`text-[14px] font-black ${task.verification_type === 'telegram_suffix' || task.verification_type === 'auto_ad' ? 'text-white' : 'text-ink'}`}>
                            {parseFloat(task.reward_gram || 0) > 0 ? `+${task.reward_gram} GRAM` : `+${task.reward_tasky}`}
                          </span>
                        </div>
                      </motion.div>
                    ))
                  );
                })()}
              </motion.div>

            )}

            {placementCategory === 'partner' && (
                <div className="mt-2 mb-6">
                  <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500/50 transition-all duration-300  relative overflow-hidden group" onClick={() => window.open('https://t.me/taskycs', '_blank')}>
                    
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
            <motion.div    className="space-y-3">
              {submissions.map(sub => (
                <Card key={sub.id} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-soft flex items-center justify-center text-ink-soft shrink-0">
                    <IconRenderer name={sub.verification_type === 'telegram_suffix' ? 'Gem' : sub.icon} size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-ink">{sub.title}</h3>
                      <span className="text-sm font-bold">
                        {parseFloat(sub.reward_gram || 0) > 0 ? `+${sub.reward_gram} GRAM` : `+${sub.reward_tasky}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {sub.status === 'pending' && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-warning-soft text-warning rounded-pill uppercase font-bold tracking-wide"><Clock size={10}/> Pending Review</span>}
                      {sub.status === 'approved' && sub.approved_by === 'admin' && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-success-soft text-success rounded-pill uppercase font-bold tracking-wide"><CheckCircle2 size={10}/> ✅ Admin Approved</span>}
                      {sub.status === 'approved' && sub.approved_by === 'ai' && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-pill uppercase font-bold tracking-wide" style={{background:'rgba(139,92,246,0.15)',color:'#a78bfa'}}><Bot size={10}/> 🤖 AI Approved</span>}
                      {sub.status === 'approved' && sub.approved_by === 'auto' && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-pill uppercase font-bold tracking-wide" style={{background:'rgba(139,92,246,0.15)',color:'#a78bfa'}}><Zap size={10}/> Auto Verified</span>}
                      {sub.status === 'approved' && !sub.approved_by && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-success-soft text-success rounded-pill uppercase font-bold tracking-wide"><CheckCircle2 size={10}/> Approved</span>}
                      {sub.status === 'rejected' && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-danger-soft text-danger rounded-pill uppercase font-bold tracking-wide"><XCircle size={10}/> Rejected</span>}
                      <span className="text-xs text-ink-faint">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                    </div>
                    {sub.status === 'rejected' && sub.rejection_reason && (
                      <p className="text-xs text-danger mt-1">Reason: {sub.rejection_reason === 'stealth_rejection' ? 'Verification failed' : sub.rejection_reason}</p>
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
                className="fixed inset-0 bg-black/60  z-[60]"
                onClick={() => setSelectedTask(null)}
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 350, mass: 0.8 }}
                className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-[2.5rem] border-t border-border p-6 pb-12 z-[70] "
              >
              <div className="w-14 h-2 bg-surface-soft rounded-full mx-auto mb-6" />
              
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-[22px] font-black text-ink leading-tight pr-4">{selectedTask.title}</h2>
                <div className={`px-4 py-2 rounded-[1.25rem] shadow-sm flex-shrink-0 ${selectedTask.verification_type === 'auto_ad' ? 'bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-500  bg-[length:200%_200%] ' : 'bg-gradient-primary '}`}>
                  <span className="text-[15px] font-black text-white">
                    {parseFloat(selectedTask.reward_gram || 0) > 0 
                      ? `+${selectedTask.reward_gram} GRAM` 
                      : `+${selectedTask.reward_tasky} TASKY`}
                  </span>
                </div>
              </div>
              
              <div className="mb-6">
                {selectedTask.subtitle.includes('Rules:') ? (
                  <>
                    <p className="text-ink-soft text-[15px] mb-4">{selectedTask.subtitle.split('Rules:')[0]}</p>
                    <div className="bg-surface-soft p-5 rounded-[1.5rem] border border-border">
                      <p className="text-[13px] font-black text-ink mb-4 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-indigo-500" />
                        Required Rules
                      </p>
                      <ul className="space-y-4">
                        {selectedTask.subtitle.split('Rules:')[1].split(',').map((rule, idx) => {
                          let cleanRule = rule.trim();
                          if (cleanRule.startsWith('and ')) cleanRule = cleanRule.substring(4);
                          if (!cleanRule) return null;
                          return (
                            <li key={idx} className="flex items-start gap-3 text-[15px] text-ink-soft">
                              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0 " />
                              <span className="leading-relaxed">{cleanRule}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </>
                ) : (
                  <p className="text-ink-soft text-[15px]">{selectedTask.subtitle}</p>
                )}
                
                {selectedTask.verification_type === 'auto_ad' && (
                  <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-[1.5rem] p-5 mt-4 relative overflow-hidden">
                    <p className="text-[13px] font-black text-fuchsia-500 mb-4 uppercase tracking-wider flex items-center gap-2 relative z-10">
                      <AlertCircle size={18} className="text-fuchsia-500" />
                      Required Rules
                    </p>
                    <ul className="space-y-4 relative z-10">
                      <li className="flex items-start gap-3 text-[15px] text-fuchsia-600 dark:text-fuchsia-300">
                        <div className="w-2 h-2 rounded-full bg-fuchsia-500 mt-2 shrink-0 " />
                        <span className="leading-relaxed font-medium">You must watch the entire ad to get the reward.</span>
                      </li>
                      <li className="flex items-start gap-3 text-[15px] text-fuchsia-600 dark:text-fuchsia-300">
                        <div className="w-2 h-2 rounded-full bg-fuchsia-500 mt-2 shrink-0 " />
                        <span className="leading-relaxed font-medium">Skipping or closing the ad early will cancel the reward.</span>
                      </li>
                      <li className="flex items-start gap-3 text-[15px] text-fuchsia-600 dark:text-fuchsia-300">
                        <div className="w-2 h-2 rounded-full bg-fuchsia-500 mt-2 shrink-0 " />
                        <span className="leading-relaxed font-medium">Daily limit: 60 ads per 24 hours (30 TASKY per ad).</span>
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
                    {selectedTask.verification_type === 'telegram_suffix' && (
                      <div className="bg-surface-soft border border-border rounded-[1.5rem] p-5 space-y-4">
                        <p className="text-[13px] font-black text-ink mb-2 uppercase tracking-wider flex items-center gap-2">
                          <Bot size={18} className="text-indigo-500" />
                          Instructions
                        </p>
                        <p className="text-sm text-ink-soft leading-relaxed">
                          1. Click below to copy the suffix:<br/>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText('| Tasky 🐾');
                              showToast('Suffix copied to clipboard!');
                            }}
                            className="mt-1 px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-sm font-bold active:scale-95 transition-transform flex items-center gap-1.5"
                          >
                            <span>| Tasky 🐾</span>
                            <span className="text-xs text-indigo-400/60">(Click to copy)</span>
                          </button>
                        </p>
                        <p className="text-sm text-ink-soft leading-relaxed">
                          2. Open Telegram Settings &rarr; Edit Name.<br/>
                          3. Paste <strong>| Tasky 🐾</strong> at the end of your <strong>Name</strong>.<br/>
                          4. Click <strong>Verify Suffix</strong> below!
                        </p>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-2">
                          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-red-400 font-bold leading-normal">
                            🚨 <strong>Penalty:</strong> Suffix must remain active. If you remove it after verification, you will face permanent account suspension and rejection of all Gram withdrawals.
                          </p>
                        </div>
                      </div>
                    )}

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

                    {selectedTask.verification_type === 'telegram_suffix' ? (
                      <Button 
                        onClick={handleSubmitProof}
                        disabled={isSubmitting}
                        className={`w-full font-bold text-white shadow-lg bg-gradient-primary ${isSubmitting ? 'opacity-50' : 'hover:opacity-90'}`}
                      >
                        {isSubmitting ? 'Verifying...' : 'Verify Suffix'}
                      </Button>
                    ) : (
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
                    )}
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
                      <div className="absolute inset-0 rounded-full bg-indigo-400/20 " />
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
                              <div key={d} className="w-1 h-1 rounded-full bg-indigo-400 " style={{ animationDelay: `${d * 0.15}s` }} />
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

      <PromoCodeModal 
        isOpen={isPromoModalOpen} 
        onClose={() => setIsPromoModalOpen(false)} 
        onRedeemSuccess={(amount) => {
          refreshUser();
        }}
        user={user} 
      />

      <GramClaimModal
        isOpen={isGramModalOpen}
        onClose={() => setIsGramModalOpen(false)}
        user={user}
        onClaimSuccess={() => {
          reloadData();
        }}
      />
    </div>
    </>
  );
}

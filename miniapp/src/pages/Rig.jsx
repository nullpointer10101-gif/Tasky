import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Zap, Clock, Info, ChevronDown, ChevronUp, Link as LinkIcon, CheckCircle2, Cpu, Crown, HelpCircle, X, Lock, TrendingUp, Wallet } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useToast } from '../App';
import { getMiningStatus, startMiningSession, claimMiningSession, getMiningLevels, saveWalletAddress, getMachines, markMachineSeen } from '../api';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import TaskyCoin from '../assets/tasky-coin.jpg';
import triggerConfetti from '../confetti';

const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const getRarityConfig = (rarity) => {
  switch(rarity) {
     case 'common': return { color: 'text-gray-400', border: 'border-gray-500/40', bg: 'bg-gray-500/10', glow: '', Icon: Cpu, badgeBg: 'bg-gray-500/20' };
     case 'rare': return { color: 'text-blue-400', border: 'border-blue-500/50', bg: 'bg-blue-500/10', glow: '', Icon: Zap, badgeBg: 'bg-blue-500/20' };
     case 'epic': return { color: 'text-purple-400', border: 'border-purple-500/50', bg: 'bg-purple-500/10', glow: '', Icon: Gem, badgeBg: 'bg-purple-500/20' };
     case 'legendary': return { color: 'text-amber-400', border: 'border-amber-500/60', bg: 'bg-amber-500/10', glow: '', Icon: Crown, badgeBg: 'bg-amber-500/20' };
     default: return { color: 'text-gray-400', border: 'border-gray-500/30', bg: 'bg-gray-500/10', glow: '', Icon: Cpu, badgeBg: 'bg-gray-500/20' };
  }
}

export default function Rig({ user, refreshUser }) {
  const [status, setStatus] = useState(null);
  const [levelsData, setLevelsData] = useState(null);
  const [machinesData, setMachinesData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [activeSession, setActiveSession] = useState(null);
  const [liveEarnings, setLiveEarnings] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');
  
  const [actionLoading, setActionLoading] = useState(false);
  const [tiersExpanded, setTiersExpanded] = useState(false);
  
  const [selectedMachine, setSelectedMachine] = useState(null);
  
  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedMachine) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [selectedMachine]);

  const [revealQueue, setRevealQueue] = useState([]);
  const [shakingId, setShakingId] = useState(null);

  // Tap-to-boost state
  const [tapCount, setTapCount] = useState(0);
  const [tapParticles, setTapParticles] = useState([]);
  const [isOrbPulsing, setIsOrbPulsing] = useState(false);
  const tapParticleId = useRef(0);

  const { showToast } = useToast();
  const [tonConnectUI] = useTonConnectUI();
  const walletAddress = useTonAddress();

  const fetchStatus = async (showLoad = true, isMounted = { current: true }) => {
    try {
      if (showLoad) setLoading(true);
      const [statusRes, levelsRes, machinesRes] = await Promise.all([
        getMiningStatus(user?.telegram_id || '123456'),
        getMiningLevels(),
        getMachines(user?.telegram_id || '123456')
      ]);
      
      if (!isMounted.current) return;

      if (statusRes.data) {
        setStatus(statusRes.data);
        setActiveSession(statusRes.data.active_session);
        if (statusRes.data.active_session?.is_ready_to_claim) {
          setLiveEarnings(statusRes.data.active_session.estimated_current_earned);
          setTimeLeft('00:00:00');
        }
      }
      if (levelsRes.data) {
        setLevelsData(levelsRes.data);
      }
      if (machinesRes.data) {
        setMachinesData(machinesRes.data);
        if (machinesRes.data.unrevealed_new_machines?.length > 0) {
           setRevealQueue(prev => {
               const newIds = machinesRes.data.unrevealed_new_machines.filter(id => !prev.includes(id));
               return [...prev, ...newIds];
           });
        }
      }
    } catch (err) {
      if (!isMounted.current) return;
      console.error('Rig fetchStatus error:', err);
      showToast(err.message || 'Error loading rig data', 'error');
    } finally {
      if (isMounted.current && showLoad) setLoading(false);
    }
  };

  useEffect(() => {
    const isMounted = { current: true };
    fetchStatus(true, isMounted);
    return () => { isMounted.current = false; };
  }, [user]);

  // No need for saveWalletAddress here as WalletManager handles global sync


  // Dynamic Polling & Timer
  useEffect(() => {
    if (!activeSession || activeSession.is_ready_to_claim) return;

    let timeoutId;
    const tick = () => {
      const now = new Date();
      const end = new Date(activeSession.expected_claim_at);
      const start = new Date(activeSession.started_at);
      
      if (now >= end) {
        fetchStatus(false);
      } else {
        const diff = end - now;
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        const s = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        
        const elapsedHours = (now - start) / (1000 * 60 * 60);
        const rate = Number(activeSession.rate_used);
        const currentEarned = rate * elapsedHours;
        const maxEarned = rate * 4;
        setLiveEarnings(Math.min(currentEarned, maxEarned));

        // Smooth dynamic UI updates
        const nextInterval = 50;
        timeoutId = setTimeout(tick, nextInterval);
      }
    };
    
    tick(); // Start recursive timeout

    const wobbleInterval = setInterval(() => {
      setWobble(true);
      setTimeout(() => setWobble(false), 500);
    }, 45000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(wobbleInterval);
    };
  }, [activeSession]);

  const [wobble, setWobble] = useState(false);

  const handleStartMining = async () => {
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch (e) {}

    try {
      setActionLoading(true);
      const { data, error } = await startMiningSession(user?.telegram_id || '123456', walletAddress);
      
      if (data) {
        showToast('Mining session started!');
        await fetchStatus(false, { current: true });
      } else {
        showToast(error || 'Failed to start mining', 'error');
      }
    } catch (err) {
      console.error('handleStartMining error:', err);
      showToast(err.message || 'Error starting mining', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaim = async () => {
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch (e) {}

    try {
      setActionLoading(true);
      const { data, error } = await claimMiningSession(user?.telegram_id || '123456', walletAddress);
      
      if (data) {
        try {
          triggerConfetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        } catch (e) {}
        showToast(`+${data.tasky_earned} TASKY MINED 💥`, 'success');
        await refreshUser();
        await fetchStatus(false, { current: true });
      } else {
        showToast(error || 'Failed to claim', 'error');
      }
    } catch (err) {
      console.error('handleClaim error:', err);
      showToast(err.message || 'Error claiming rewards', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMachineTap = (m) => {
    if (m.status === 'hidden') {
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('warning'); } catch (e) {}
      setShakingId(m.id);
      setTimeout(() => setShakingId(null), 300);
      showToast('Keep growing your Rig to discover this machine', 'info');
    } else {
      setSelectedMachine(m);
    }
  };

  const handleAcknowledgeReveal = async () => {
    const activeRevealId = revealQueue[0];
    if (!activeRevealId) return;
    try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch (e) {}
    try {
      await markMachineSeen(user?.telegram_id || '123456', activeRevealId);
      setRevealQueue(prev => prev.slice(1));
    } catch (err) {
      console.error('handleAcknowledgeReveal error:', err);
      showToast(err.message || 'Error confirming reveal', 'error');
    }
  };

  const { levels, efficiency_tiers } = levelsData || { levels: [], efficiency_tiers: [] };
  // Wallet is now only used for swap destination; mining/rig works for all users
  const isConnected = !!walletAddress; // still tracked for wallet UI display, not gating

  const safeLevels = levels || [];
  const safeTiers = efficiency_tiers || [];
  
  const currentEff = status?.efficiency_percent || 100;
  let nextTier = null;
  for (const tier of safeTiers) {
    if (tier.multiplier_percent > currentEff) {
      nextTier = tier;
      break;
    }
  }

  let effProgress = 100;
  let effMessage = '';
  const daysStable = status?.days_stable || 0;
  
  if (nextTier) {
    const currentTier = [...safeTiers].reverse().find(t => t.min_days <= daysStable) || safeTiers[0] || { min_days: 0 };
    const range = nextTier.min_days - currentTier.min_days;
    const currentProgress = daysStable - currentTier.min_days;
    effProgress = Math.max(0, (currentProgress / (range || 1)) * 100);
    const daysLeft = nextTier.min_days - daysStable;
    effMessage = `${daysStable} days stable — ${daysLeft} day${daysLeft > 1 ? 's' : ''} until ${nextTier.multiplier_percent}% Efficiency`;
  } else {
    effMessage = `${daysStable} days stable — Maximum Efficiency reached!`;
  }

  const isReset = daysStable < 2;

  const displayLevel = status?.level_name || 'No Vault';
  const displaySpeed = Number(status?.effective_speed || 0).toFixed(2);
  const displayHolding = Math.floor(Number(status?.balance || 0)).toLocaleString();
  const displayEff = status?.efficiency_percent || 100;
  
  const machines = machinesData?.machines || [];
  const ownedCount = machines.filter(m => m.status === 'owned').length;
  const totalMachines = machines.length;
  
  const activeRevealId = revealQueue.length > 0 ? revealQueue[0] : null;
  const activeRevealMachine = activeRevealId ? machines.find(m => m.id === activeRevealId) : null;

  const currentLevelInfo = safeLevels.find(l => l.level === status?.mining_level) || safeLevels[0];
  const baseSpeed = currentLevelInfo ? Number(currentLevelInfo.base_speed_per_hour) : 0;
  const boostedSpeed = baseSpeed * (1 + (machinesData?.total_bonus_percent || 0) / 100);

  // Pre-compute session progress safely outside JSX
  const sessionDurationMs = 4 * 60 * 60 * 1000;
  const sessionStartedAt = activeSession?.started_at ? new Date(activeSession.started_at).getTime() : Date.now();
  const sessionElapsed = activeSession ? Date.now() - sessionStartedAt : 0;
  const sessionPct = activeSession ? Math.min(100, (sessionElapsed / sessionDurationMs) * 100) : 0;

  return (
    <motion.div variants={containerVariants} initial="initial" animate="animate" className="p-4 space-y-4 pb-24 h-full flex flex-col">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-ink">Rig</h1>
        <p className="text-sm text-ink-soft">Earn TASKY by holding. The longer you hold, the faster you earn.</p>
      </div>

      {/* Hero Card */}
      <motion.div variants={containerVariants} className="relative group perspective-1000 mb-2">
        <motion.div 
          whileTap={{ scale: 0.98, rotateX: 2 }}
          className="relative overflow-hidden rounded-[2rem] border-b-[4px] border-indigo-900/60 shadow-[0_15px_35px_-10px_rgba(99,102,241,0.4)] active:translate-y-[3px] active:border-b-[1px] active:shadow-none transition-all cursor-pointer bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700"
        >
          {/* Animated Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-white/20 transition-all duration-700" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-fuchsia-500/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />
          
          <div className="relative z-10 p-5 text-white">
            <div className="flex justify-between items-start mb-6">
              <span className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wider uppercase shadow-sm flex items-center gap-1.5">
                <Gem size={12} className="text-blue-300"/> {displayLevel}
              </span>
              <span className={`bg-white/10 backdrop-blur-md text-white border border-white/20 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wider uppercase shadow-sm flex items-center gap-1.5`}>
                <Zap size={12} className={displayEff > 100 ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'text-blue-300'}/> {displayEff}% EFF
              </span>
            </div>
            
            <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1 drop-shadow-md">Mining Speed</p>
            <div className="flex items-baseline gap-1.5 mb-6">
              <span className="text-4xl sm:text-5xl font-black tracking-tighter drop-shadow-lg">{displaySpeed}</span>
              <span className="text-sm font-black text-white/80 uppercase tracking-wider">TASKY / hr</span>
            </div>
            
            <div className="bg-black/20 backdrop-blur-sm rounded-[1.25rem] px-4 py-3 border border-white/10 flex items-center justify-between shadow-inner">
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider">TASKY Balance</span>
              <span className="text-sm font-black">{displayHolding}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Efficiency Progress Indicator */}
      <motion.div variants={containerVariants} className="space-y-2">
        <div className="flex justify-between text-xs font-medium">
          <span className={isReset ? 'text-yellow-600 dark:text-yellow-500 font-semibold' : 'text-ink-soft'}>
            {isReset ? "Efficiency reset — keep rig undisturbed to rebuild bonus" : effMessage}
          </span>
          {(!isReset && nextTier) && <span className="text-ink-soft font-bold">{nextTier.multiplier_percent}%</span>}
        </div>
        <div className="h-2 w-full bg-surface-soft rounded-full overflow-hidden border border-border">
          <motion.div 
            className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${effProgress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </motion.div>

      {/* Mining Session Card */}
      {/* ---- MAIN MINING SESSION CARD ---- */}
      <div className="relative mb-6">
        
        {/* ── DISCONNECTED WALLET STATE ── */}
        {!walletAddress ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[2rem] border-b-[4px] border-border bg-surface shadow-sm text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent" />
            <div className="relative z-10 p-8 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-400 border border-indigo-500/20 shadow-inner">
                <Wallet className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-ink tracking-tight mb-2">Connect to Mine</h3>
              <p className="text-sm text-ink-soft font-medium max-w-[240px] mb-6">
                Mining progress is safely linked to your wallet. {activeSession && !activeSession.is_ready_to_claim ? 'Mining stopped.' : ''} Connect your wallet to {activeSession ? 'resume' : 'start'}.
              </p>
              <button 
                onClick={() => tonConnectUI.connectWallet()}
                className="bg-indigo-500 text-white font-black uppercase tracking-wider py-4 px-8 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.4)] border-b-[4px] border-indigo-700 active:border-b-0 active:translate-y-[4px] transition-all w-full max-w-[250px]"
              >
                Connect Wallet
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            {/* ── IDLE: Ready to Start ── */}
            {!activeSession && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2rem] border-b-[4px] border-indigo-900/40 bg-surface shadow-sm"
              >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/80 via-slate-900/60 to-purple-950/80" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.2),transparent_70%)]" />

            <div className="relative z-10 flex flex-col items-center text-center px-6 pt-10 pb-8">
              {/* Animated orb — the single tap target */}
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
                {/* Press button */}
                <motion.button
                  className="relative w-40 h-40 sm:w-48 sm:h-48 flex flex-col items-center justify-center z-10 select-none bg-indigo-950/50 rounded-full border-b-[6px] border-indigo-800 shadow-[0_0_40px_rgba(99,102,241,0.3)] active:border-b-[2px] active:translate-y-[4px] active:shadow-none transition-all"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  onClick={handleStartMining}
                  disabled={actionLoading}
                >
                  <motion.div 
                    className="w-[140px] h-[140px] rounded-full overflow-hidden flex items-center justify-center mb-1 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                    initial={{ scale: 1, rotate: 0 }}
                    animate={actionLoading ? { scale: [0.8, 1.1, 1], rotate: [-10, 5, 0] } : { scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', duration: 0.5, bounce: 0.5 }}
                  >
                    <img src={TaskyCoin} alt="TASKY Coin" className="w-[135%] h-[135%] max-w-none object-cover" />
                  </motion.div>
                  <span className="text-white/90 text-sm font-black uppercase tracking-[0.25em] drop-shadow-md">
                    {actionLoading ? '...' : 'MINE'}
                  </span>
                </motion.button>
              </div>

              <h3 className="text-2xl font-black text-white mb-2">Tap Once to Mine</h3>
              <p className="text-sm text-white/50 font-medium max-w-[240px] leading-relaxed">
                One tap starts your 4-hour mining session. Come back to claim.
              </p>

              {/* Speed preview pill */}
              <div className="mt-6 flex items-center gap-2 bg-white/5 border-b-[2px] border-white/10 rounded-full px-5 py-2.5 shadow-inner backdrop-blur-md">
                <Zap size={14} className="text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]" />
                <span className="text-white font-black text-sm">{displaySpeed}</span>
                <span className="text-white/50 text-[10px] uppercase font-bold tracking-widest">TASKY/hr · 4 hrs</span>
                <span className="text-white/50 text-xs font-bold">=</span>
                <span className="text-yellow-400 font-black text-sm">~{(Number(displaySpeed) * 4).toFixed(1)}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── ACTIVE: Auto-mining progress display ── */}
        {activeSession && !activeSession.is_ready_to_claim && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[2rem] border-b-[4px] border-indigo-900/30 bg-surface shadow-sm"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-indigo-950/60 to-slate-900/80" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(99,102,241,0.2),transparent_70%)]" />

            <div className="relative z-10 px-6 pt-6 pb-8">
              {/* Top status bar */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                  <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">Auto-Mining</span>
                </div>
                <div className="bg-indigo-500/20 border-b-[2px] border-indigo-500/40 rounded-xl px-4 py-2 font-mono text-base font-black text-white shadow-inner">
                  {timeLeft}
                </div>
              </div>

              {/* Central earnings display */}
              <div className="flex flex-col items-center mb-8 mt-4 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 sm:w-48 sm:h-48 bg-indigo-500/20 rounded-full blur-3xl" />
                <motion.div 
                    className="w-[130px] h-[130px] sm:w-[160px] sm:h-[160px] rounded-full overflow-hidden flex items-center justify-center mb-4 drop-shadow-[0_0_35px_rgba(139,92,246,0.6)] relative z-10"
                    animate={wobble ? { rotate: [-8, 8, -8, 8, 0], scale: [1, 1.08, 1] } : { rotate: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                >
                    <img src={TaskyCoin} alt="TASKY Coin" className="w-[135%] h-[135%] max-w-none object-cover" />
                </motion.div>

                <div className="flex flex-col items-center relative z-10 bg-black/20 px-6 sm:px-8 py-3 rounded-[2rem] border border-white/10 backdrop-blur-sm shadow-inner">
                  <span className="text-4xl sm:text-5xl font-black text-white leading-tight font-mono tracking-tighter drop-shadow-lg">
                    {Number(liveEarnings).toFixed(4)}
                  </span>
                  <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1">TASKY</span>
                </div>

                <p className="text-xs text-white/40 font-medium mt-6 relative z-10 bg-white/5 px-4 py-1.5 rounded-full">
                  Mining at <span className="text-white font-black">{displaySpeed} TASKY/hr</span>
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-2.5 bg-black/20 p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between text-[10px] font-black text-white/50 uppercase tracking-widest">
                  <span>Session Progress</span>
                  <span className="text-white/80">{sessionPct.toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${sessionPct}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── CLAIM: The reward moment ── */}
        {activeSession && activeSession.is_ready_to_claim && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-[2rem] border-b-[4px] border-emerald-900/60 bg-surface shadow-sm"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-green-950/40 to-slate-900/80" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,197,94,0.3),transparent_65%)]" />

            <div className="relative z-10 flex flex-col items-center text-center px-6 pt-10 pb-8">
              {/* Trophy orb */}
              <div className="relative mb-6 mt-2 flex justify-center w-full">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
                <motion.div 
                  className="w-[150px] h-[150px] sm:w-[180px] sm:h-[180px] rounded-full overflow-hidden flex items-center justify-center drop-shadow-[0_0_50px_rgba(52,211,153,0.7)] bg-black/0 relative z-10"
                  initial={{ scale: 0.8, rotate: -15 }}
                  animate={actionLoading 
                    ? { scale: [1, 1.25, 1], rotate: [0, 10, 0] } 
                    : { scale: [0.8, 1.1, 1], rotate: [-15, 5, 0] }
                  }
                  transition={{ type: 'spring', duration: 0.5, bounce: 0.5 }}
                >
                  <img src={TaskyCoin} alt="TASKY Coin" className="w-[135%] h-[135%] max-w-none object-cover" />
                </motion.div>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white mb-1 drop-shadow-md">
                Ready to Claim! 🏆
              </h3>
              <p className="text-sm text-white/50 font-medium mb-6">Your 4-hour session is complete</p>

              {/* Reward amount */}
              <div className="w-full bg-emerald-950/50 border border-emerald-500/30 rounded-2xl p-5 mb-6 backdrop-blur-sm shadow-inner">
                <p className="text-[10px] text-emerald-400/80 uppercase font-black tracking-[0.2em] mb-2">Total Mined</p>
                <div className="text-3xl sm:text-4xl font-black text-emerald-400 drop-shadow-lg">
                  +{Number(activeSession.rate_used * 4).toFixed(2)}
                  <span className="text-lg sm:text-xl ml-2 text-emerald-500/70">TASKY</span>
                </div>
              </div>

              {/* Claim CTA */}
              <button
                className="w-full font-black py-4 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white text-lg uppercase tracking-wider active:translate-y-[4px] active:border-b-0 transition-all shadow-[0_0_30px_rgba(52,211,153,0.5)] border-b-[4px] border-emerald-800"
                onClick={handleClaim}
                disabled={actionLoading}
              >
                {actionLoading ? 'Claiming...' : '✦ Claim Rewards ✦'}
              </button>

              <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-4">Tap above to add to balance</p>
            </div>
          </motion.div>
        )}
          </>
        )}
      </div>

      {/* Rig Tiers Table (Collapsible) */}
      <Card className="rounded-3xl border-border p-0 overflow-hidden">
        <button 
          className="w-full p-4 flex items-center justify-between focus:outline-none"
          onClick={() => setTiersExpanded(!tiersExpanded)}
        >
          <div className="flex items-center gap-2">
            <Gem size={18} className="text-brand" />
            <span className="font-bold text-ink">Rig Tiers & Multipliers</span>
          </div>
          {tiersExpanded ? <ChevronUp size={20} className="text-ink-soft"/> : <ChevronDown size={20} className="text-ink-soft"/>}
        </button>
        
        <AnimatePresence>
          {tiersExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0 space-y-4">
                <div className="bg-surface-soft rounded-xl overflow-hidden border border-border">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface text-ink-soft uppercase text-[10px] font-bold border-b border-border">
                      <tr>
                        <th className="px-3 py-2">Level</th>
                        <th className="px-3 py-2">Min Hold</th>
                        <th className="px-3 py-2 text-right">Speed/hr</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {safeLevels.map((lvl) => {
                        const isCurrent = status?.mining_level === lvl.level;
                        return (
                          <tr key={lvl.level} className={isCurrent ? 'bg-brand/5' : ''}>
                            <td className="px-3 py-2.5 font-medium text-ink flex items-center gap-1.5">
                              {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>}
                              {lvl.name}
                            </td>
                            <td className="px-3 py-2.5 text-ink-soft">{Number(lvl.min_holding).toLocaleString()}</td>
                            <td className="px-3 py-2.5 font-bold text-right text-brand">{lvl.base_speed_per_hour}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-surface-soft rounded-xl overflow-hidden border border-border">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface text-ink-soft uppercase text-[10px] font-bold border-b border-border">
                      <tr>
                        <th className="px-3 py-2">Days Held</th>
                        <th className="px-3 py-2 text-right">Multiplier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {safeTiers.map((tier, idx) => {
                        const next = safeTiers[idx + 1];
                        const label = next ? `${tier.min_days}-${next.min_days - 1} days` : `${tier.min_days}+ days`;
                        let isCurrent = false;
                        if (status && status.days_stable !== undefined) {
                           if (next) {
                             isCurrent = status.days_stable >= tier.min_days && status.days_stable < next.min_days;
                           } else {
                             isCurrent = status.days_stable >= tier.min_days;
                           }
                        }

                        return (
                          <tr key={tier.min_days} className={isCurrent ? 'bg-brand/5' : ''}>
                            <td className="px-3 py-2.5 font-medium text-ink flex items-center gap-1.5">
                              {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>}
                              {label}
                            </td>
                            <td className="px-3 py-2.5 font-bold text-right text-success">{tier.multiplier_percent}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
      
      {/* Machines Collection Grid */}
      <Card className="rounded-3xl border-border p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-lg font-bold text-ink">Machines</h2>
            <p className="text-xs text-ink-soft">{ownedCount} of {totalMachines} unlocked</p>
          </div>
          {(machinesData?.total_bonus_percent || 0) > 0 && (
             <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-brand border border-brand/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 h-fit">
               <Zap size={10} /> +{machinesData?.total_bonus_percent || 0}% Total Bonus
             </div>
          )}
        </div>

        {(machinesData?.total_bonus_percent || 0) > 0 && (
          <div className="mb-2 text-xs text-ink font-medium">
             Machines are boosting your speed: <span className="line-through text-ink-soft opacity-70">{baseSpeed}/hr</span> <span className="mx-1 text-ink-faint">→</span> <span className="text-brand font-bold">{boostedSpeed.toFixed(2)}/hr</span>
          </div>
        )}

        <div className="text-[10px] text-ink-soft mb-4">
          Machines unlock automatically as you hold more TASKY. Each one permanently boosts your mining speed.
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
           {machines.map((m, idx) => {
              const isOwned = m.status === 'owned';
              const isVisible = m.status === 'visible';
              const isHidden = m.status === 'hidden';
              
              const conf = isHidden ? getRarityConfig('hidden') : getRarityConfig(m.rarity);
              const RarityIcon = isHidden ? HelpCircle : conf.Icon;
              
              const isShaking = shakingId === m.id;
              
              return (
                 <motion.button
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, x: isShaking ? [0, -5, 5, -5, 5, 0] : 0 }}
                    transition={{ duration: 0.3, delay: Math.min(idx, 8) * 0.05, x: { duration: 0.3 } }}
                    onClick={() => handleMachineTap(m)}
                    whileTap={!isHidden ? { scale: 0.95 } : {}}
                    className={`
                       relative flex flex-col items-center justify-center p-3.5 rounded-[1.25rem] transition-all overflow-hidden text-center
                       ${isOwned ? `bg-surface border-x border-t border-b-[3px] active:translate-y-[2px] active:border-b-[1px] shadow-sm active:shadow-none ${conf.border}` : ''}
                       ${isVisible ? `bg-surface-soft border border-dashed ${conf.border} opacity-80 active:scale-95` : ''}
                       ${isHidden ? `bg-surface-soft border border-solid border-border opacity-50` : ''}
                    `}
                 >
                    {isOwned && (
                       <div className={`absolute -top-1 -right-1 w-16 h-16 rounded-full blur-xl ${conf.bg}`} />
                    )}
                    {isOwned && (
                       <div className={`absolute top-2 right-2 text-[10px] font-black px-1.5 py-0.5 rounded-md ${conf.badgeBg} ${conf.color} border border-current/20 shadow-sm z-10`}>
                          +{m.bonus}%
                       </div>
                    )}
                    <div className={`relative z-10 w-12 h-12 rounded-xl mb-2 flex items-center justify-center shadow-inner ${isHidden ? 'bg-surface border border-border text-ink-faint' : conf.bg}`}>
                       <RarityIcon size={24} className={isHidden ? 'text-ink-faint' : (isVisible ? 'text-ink-soft grayscale' : conf.color)} />
                    </div>
                    <div className="relative z-10 font-black text-[11px] text-ink truncate w-full mb-0.5 uppercase tracking-wide">
                       {isHidden ? 'Mystery Rig' : m.name}
                    </div>
                    <div className="relative z-10 text-[10px] text-ink-soft w-full px-1">
                       {isHidden ? (
                         <div className="flex items-center justify-center gap-1 text-ink-faint font-bold tracking-widest mt-1">
                            <Lock size={10} /> LOCKED
                         </div>
                       ) : (isOwned ? (
                         <span className="font-bold uppercase tracking-widest opacity-80">{m.rarity}</span>
                       ) : (
                         <div className="w-full flex flex-col items-center gap-1.5 mt-1.5">
                           <div className="text-[9px] font-bold uppercase tracking-widest text-ink-soft">Hold {Number(m.min_holding).toLocaleString()}</div>
                           <div className="w-full flex flex-col gap-0.5">
                             <div className="w-full h-1.5 bg-surface-soft border border-border shadow-inner rounded-full overflow-hidden">
                               <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500" style={{ width: `${Math.min(100, (Number(displayHolding.replace(/,/g, '')) / Number(m.min_holding)) * 100)}%` }} />
                             </div>
                           </div>
                         </div>
                       ))}
                    </div>
                 </motion.button>
              )
           })}
        </div>
      </Card>

      {/* Explainer Card */}
      <Card className="rounded-[2rem] border-b-[4px] border-x border-t border-border shadow-sm space-y-4 p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-center gap-3 mb-2 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center border border-brand/20">
            <Info size={20} className="text-brand fill-brand/20" />
          </div>
          <div>
             <h2 className="text-lg font-black text-ink leading-tight">How Rig Works</h2>
             <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">Master Mining</p>
          </div>
        </div>
        <div className="space-y-3 relative z-10">
           <div className="flex gap-3 items-start">
             <div className="w-6 h-6 rounded-md bg-surface-soft flex items-center justify-center shrink-0 border border-border font-black text-xs text-ink-soft">1</div>
             <p className="text-[12px] text-ink-soft font-medium leading-snug pt-0.5"><strong className="text-ink">Hold TASKY</strong> in your wallet to automatically unlock higher tiers and new machines.</p>
           </div>
           <div className="flex gap-3 items-start">
             <div className="w-6 h-6 rounded-md bg-surface-soft flex items-center justify-center shrink-0 border border-border font-black text-xs text-ink-soft">2</div>
             <p className="text-[12px] text-ink-soft font-medium leading-snug pt-0.5">The longer you hold without withdrawing, the <strong className="text-ink">higher your efficiency bonus grows</strong>.</p>
           </div>
           <div className="flex gap-3 items-start">
             <div className="w-6 h-6 rounded-md bg-surface-soft flex items-center justify-center shrink-0 border border-border font-black text-xs text-ink-soft">3</div>
             <p className="text-[12px] text-danger font-medium leading-snug pt-0.5">Withdrawing or transferring your balance <strong className="font-bold">resets efficiency to 100%</strong>.</p>
           </div>
           <div className="flex gap-3 items-start">
             <div className="w-6 h-6 rounded-md bg-surface-soft flex items-center justify-center shrink-0 border border-border font-black text-xs text-ink-soft">4</div>
             <p className="text-[12px] text-ink-soft font-medium leading-snug pt-0.5"><strong className="text-ink">Tap MINE</strong> to start a 4-hour session. Return to claim your rewards!</p>
           </div>
        </div>
      </Card>
      
      {/* Machine Detail Bottom Sheet */}
      <AnimatePresence>
         {selectedMachine && (
            <>
               <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 z-40 "
                  onClick={() => setSelectedMachine(null)}
               />
               <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                  className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-[2.5rem] p-6 z-50  border-t border-border pb-10 max-h-[90vh] overflow-y-auto"
               >
                  <button onClick={() => setSelectedMachine(null)} className="absolute top-5 right-5 p-2 bg-surface-soft rounded-full text-ink-soft active:scale-95 transition-transform">
                     <X size={20} />
                  </button>
                  
                  {(() => {
                     const m = selectedMachine;
                     const isOwned = m.status === 'owned';
                     const conf = getRarityConfig(m.rarity);
                     const RarityIcon = conf.Icon;
                     const holding = Number(status.balance) || 0;
                     const required = Number(m.min_holding);
                     const progress = Math.min(100, (holding / required) * 100);
                     
                     return (
                        <div className="flex flex-col items-center mt-4 text-center">
                           <div className={`w-24 h-24 rounded-3xl mb-4 flex items-center justify-center ${conf.bg} ${isOwned ? conf.glow : ''}`}>
                              <RarityIcon size={48} className={isOwned ? conf.color : 'text-ink-soft grayscale'} />
                           </div>
                           <h2 className="text-2xl font-black text-ink mb-1">{m.name}</h2>
                           <div className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-md mb-4 ${conf.badgeBg} ${conf.color}`}>
                              {m.rarity}
                           </div>
                           
                           <div className={`w-full rounded-2xl p-4 border mb-6 space-y-3 ${conf.bg} ${conf.border}`}>
                              <div className="flex justify-between items-center text-sm">
                                 <div className="flex items-center gap-1.5 text-ink-soft font-medium">
                                    <Wallet size={16} /> Requirement
                                 </div>
                                 <span className="font-bold text-ink">Hold {required.toLocaleString()} TASKY</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                 <div className="flex items-center gap-1.5 text-ink-soft font-medium">
                                    <Zap size={16} className={conf.color} /> Speed Bonus
                                 </div>
                                 <span className={`font-bold ${conf.color}`}>+{m.bonus}%</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                 <div className="flex items-center gap-1.5 text-ink-soft font-medium">
                                    <TrendingUp size={16} className="text-success" /> Hourly Benefit
                                 </div>
                                 <span className="font-bold text-success">+{(baseSpeed * (m.bonus / 100)).toFixed(2)} TASKY/hr</span>
                              </div>
                              <div className="pt-3 mt-2 border-t border-border/50">
                                 <p className="text-[11px] text-ink-soft text-left leading-relaxed">
                                   {isOwned 
                                      ? `This machine is active. Along with your other machines, your total bonus is +${machinesData?.total_bonus_percent || 0}%, earning you ${boostedSpeed.toFixed(2)}/hr instead of the base ${baseSpeed}/hr.`
                                      : `Unlock this machine by holding at least ${required.toLocaleString()} TASKY in your connected wallet. Once unlocked, it permanently boosts your mining speed.`}
                                 </p>
                              </div>
                           </div>
                           
                           {!isOwned && (
                              <div className="w-full space-y-2 mb-6">
                                 <div className="flex justify-between text-xs font-medium">
                                    <span className="text-ink-soft flex items-center gap-1"><Lock size={12} /> Progress</span>
                                    <span className="text-ink font-bold">{holding.toLocaleString()} / {required.toLocaleString()} TASKY</span>
                                 </div>
                                 <div className="h-3 w-full bg-surface-soft rounded-full overflow-hidden border border-border shadow-inner">
                                    <motion.div 
                                       className="h-full bg-gradient-to-r from-blue-400 to-brand rounded-full"
                                       initial={{ width: 0 }}
                                       animate={{ width: `${progress}%` }}
                                       transition={{ duration: 1, ease: "easeOut" }}
                                    />
                                 </div>
                              </div>
                           )}
                           

                           {isOwned ? (
                              <div className="w-full bg-success/10 text-success border border-success/20 rounded-xl py-3 text-sm font-bold flex justify-center items-center gap-2">
                                 <CheckCircle2 size={18} /> Active in your Rig
                              </div>
                           ) : (
                              <div className="w-full bg-surface border border-border rounded-xl py-3 text-sm font-bold flex justify-center items-center gap-2 text-ink-soft mb-4">
                                 Hold {Math.max(0, required - holding).toLocaleString()} more TASKY to unlock this machine
                              </div>
                           )}
                           
                           {!isOwned && (
                              <Button className="w-full font-bold py-3.5 rounded-xl" onClick={() => setSelectedMachine(null)}>
                                 Close
                              </Button>
                           )}
                        </div>
                     )
                  })()}
               </motion.div>
            </>
         )}
      </AnimatePresence>
      
      {/* Unlock Reveal Modal */}
      <AnimatePresence>
         {activeRevealMachine && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
               <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/90 "
               />
               <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative z-10 flex flex-col items-center justify-center p-6 text-center w-full max-w-sm"
               >
                  {(() => {
                     const m = activeRevealMachine;
                     const conf = getRarityConfig(m.rarity);
                     const RarityIcon = conf.Icon;
                     return (
                        <>
                           <motion.div 
                              initial={{ scale: 0, rotate: -15 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: 'spring', bounce: 0.6, duration: 0.8, delay: 0.2 }}
                              className="relative mb-8"
                           >
                              
                              <div className={`relative w-40 h-40 rounded-[2rem] flex items-center justify-center bg-gradient-to-br from-surface to-surface-soft border-2 ${conf.border} shadow-2xl`}>
                                 <RarityIcon size={72} className={conf.color} />
                              </div>
                           </motion.div>
                           
                           <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.5 }}
                              className="space-y-3 w-full"
                           >
                              <p className="text-xs font-black uppercase tracking-widest text-white/50">New Machine Unlocked</p>
                              <h2 className="text-4xl font-black text-white">{m.name}</h2>
                              <div className="flex items-center justify-center gap-2 mb-6">
                                 <span className={`text-xs font-bold uppercase px-3 py-1 rounded-md ${conf.badgeBg} ${conf.color}`}>
                                    {m.rarity}
                                 </span>
                                 <span className="bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-md">
                                    +{m.bonus}% Speed
                                 </span>
                              </div>
                              <Button 
                                 className="w-full font-black py-4 rounded-2xl bg-white text-black hover:bg-gray-100 mt-8 text-lg"
                                 onClick={handleAcknowledgeReveal}
                              >
                                 AWESOME!
                              </Button>
                           </motion.div>
                        </>
                     )
                  })()}
               </motion.div>
            </div>
         )}
      </AnimatePresence>
      
    </motion.div>
  );
}

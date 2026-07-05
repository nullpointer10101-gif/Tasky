import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Zap, Clock, Info, ChevronDown, ChevronUp, Link as LinkIcon, CheckCircle2, Cpu, Crown, HelpCircle, X, Lock, TrendingUp, Wallet } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useToast } from '../App';
import { getMiningStatus, startMiningSession, claimMiningSession, getMiningLevels, saveWalletAddress, getMachines, markMachineSeen } from '../api';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import TaskyCoin from '../assets/tasky-coin.jpg';

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
      setActionLoading(false);
      if (data) {
        showToast('Mining session started!');
        fetchStatus(false, { current: true });
      } else {
        showToast(error || 'Failed to start mining', 'error');
      }
    } catch (err) {
      console.error('handleStartMining error:', err);
      setActionLoading(false);
      showToast(err.message || 'Error starting mining', 'error');
    }
  };

  const handleClaim = async () => {
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch (e) {}

    try {
      setActionLoading(true);
      const { data, error } = await claimMiningSession(user?.telegram_id || '123456', walletAddress);
      setActionLoading(false);
      if (data) {
        showToast(`+${data.tasky_earned} TASKY claimed successfully!`);
        refreshUser();
        fetchStatus(false, { current: true });
      } else {
        showToast(error || 'Failed to claim', 'error');
      }
    } catch (err) {
      console.error('handleClaim error:', err);
      setActionLoading(false);
      showToast(err.message || 'Error claiming rewards', 'error');
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

  const currentEff = status?.efficiency_percent || 100;
  let nextTier = null;
  for (const tier of efficiency_tiers) {
    if (tier.multiplier_percent > currentEff) {
      nextTier = tier;
      break;
    }
  }

  let effProgress = 100;
  let effMessage = '';
  const daysStable = status?.days_stable || 0;
  
  if (nextTier) {
    const currentTier = [...efficiency_tiers].reverse().find(t => t.min_days <= daysStable) || efficiency_tiers[0] || { min_days: 0 };
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

  const currentLevelInfo = levels.find(l => l.level === status?.mining_level) || levels[0];
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
      <Card className="relative overflow-hidden rounded-3xl border-0 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-800" />
        
        
        <div className="relative z-10 p-2 text-white">
          <div className="flex justify-between items-start mb-4">
            <span className="bg-white/20 text-white border border-white/20 px-3 py-1 rounded-full text-xs font-bold shadow-sm  flex items-center gap-1.5">
              <Gem size={12} className="text-blue-200"/> {displayLevel}
            </span>
            <span className={`bg-white/20 text-white border border-white/20 px-3 py-1 rounded-full text-xs font-bold shadow-sm  flex items-center gap-1.5 ${displayEff > 100 ? '' : ''}`}>
              <Zap size={12} className={displayEff > 100 ? 'text-yellow-300' : 'text-blue-200'}/> {displayEff}% Efficiency
            </span>
          </div>
          
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-0.5">Mining Speed</p>
          <div className="flex items-baseline gap-1.5 mb-5">
            <span className="text-4xl font-black tracking-tight">{displaySpeed}</span>
            <span className="text-sm font-medium text-white/80">TASKY / hr</span>
          </div>
          
          <div className="bg-black/20 rounded-xl px-3.5 py-2.5  border border-white/10 flex items-center justify-between">
            <span className="text-xs font-medium text-white/70">TASKY Balance</span>
            <span className="text-sm font-bold">{displayHolding} TASKY</span>
          </div>
        </div>
      </Card>

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
            className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-sm text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent" />
            <div className="relative z-10 p-8 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-400">
                <Wallet className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-ink tracking-tight mb-2">Connect to Mine</h3>
              <p className="text-sm text-ink-soft font-medium max-w-[240px] mb-6">
                Mining progress is safely linked to your wallet. {activeSession && !activeSession.is_ready_to_claim ? 'Mining stopped.' : ''} Connect your wallet to {activeSession ? 'resume' : 'start'}.
              </p>
              <button 
                onClick={() => tonConnectUI.connectWallet()}
                className="bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform"
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
                className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-sm"
              >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/60 via-slate-900/40 to-purple-950/60" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.15),transparent_70%)]" />

            <div className="relative z-10 flex flex-col items-center text-center px-6 pt-8 pb-7">
              {/* Animated orb — the single tap target */}
              <div className="relative mb-6">
                {/* Press button */}
                <motion.button
                  className="relative w-40 h-40 flex flex-col items-center justify-center z-10 select-none"
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  whileTap={{ scale: 0.95, transition: { duration: 0.12 } }}
                  onClick={handleStartMining}
                  disabled={actionLoading}
                >
                  <motion.div 
                    className="w-[140px] h-[140px] rounded-full overflow-hidden flex items-center justify-center mb-2 drop-shadow-[0_0_30px_rgba(99,102,241,0.6)] bg-black/0"
                    initial={{ scale: 1, rotate: 0 }}
                    animate={actionLoading ? { scale: [0.8, 1.1, 1], rotate: [-10, 5, 0] } : { scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', duration: 0.5, bounce: 0.5 }}
                  >
                    <img src={TaskyCoin} alt="TASKY Coin" className="w-[135%] h-[135%] max-w-none object-cover" />
                  </motion.div>
                  <span className="text-white/90 text-[12px] font-black uppercase tracking-[0.2em] drop-shadow-md">
                    {actionLoading ? '...' : 'MINE'}
                  </span>
                </motion.button>
              </div>

              <h3 className="text-xl font-black text-white mb-1.5">Tap Once to Mine</h3>
              <p className="text-sm text-white/50 font-medium max-w-[220px] leading-relaxed">
                One tap starts your 4-hour mining session. Come back to claim.
              </p>

              {/* Speed preview pill */}
              <div className="mt-5 flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 ">
                <Zap size={12} className="text-yellow-300" />
                <span className="text-white font-black text-sm">{displaySpeed}</span>
                <span className="text-white/50 text-xs font-medium">TASKY/hr · 4 hrs</span>
                <span className="text-white/50 text-xs">=</span>
                <span className="text-yellow-300 font-black text-sm">~{(Number(displaySpeed) * 4).toFixed(1)} TASKY</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── ACTIVE: Auto-mining progress display ── */}
        {activeSession && !activeSession.is_ready_to_claim && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-sm"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-indigo-950/40 to-slate-900/60" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(99,102,241,0.12),transparent_70%)]" />

            <div className="relative z-10 px-5 pt-5 pb-6">
              {/* Top status bar */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Auto-Mining</span>
                </div>
                <div className="bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 font-mono text-sm font-black text-white/90">
                  {timeLeft}
                </div>
              </div>

              {/* Central earnings display */}
              <div className="flex flex-col items-center mb-6 mt-4">
                <motion.div 
                    className="w-[150px] h-[150px] rounded-full overflow-hidden flex items-center justify-center mb-4 drop-shadow-[0_0_25px_rgba(139,92,246,0.5)] bg-black/0"
                    animate={wobble ? { rotate: [-8, 8, -8, 8, 0], scale: [1, 1.08, 1] } : { rotate: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                >
                    <img src={TaskyCoin} alt="TASKY Coin" className="w-[135%] h-[135%] max-w-none object-cover" />
                </motion.div>

                <div className="flex flex-col items-center">
                  <span className="text-4xl font-black text-white leading-tight font-mono tracking-tighter">
                    {Number(liveEarnings).toFixed(4)}
                  </span>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1">TASKY</span>
                </div>

                <p className="text-xs text-white/40 font-medium mt-4">
                  Mining at <span className="text-white/70 font-black">{displaySpeed} TASKY/hr</span>
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  <span>Session Progress</span>
                  <span>{sessionPct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full"
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
            className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-surface shadow-sm"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/70 via-green-900/30 to-slate-900/60" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,197,94,0.2),transparent_65%)]" />

            <div className="relative z-10 flex flex-col items-center text-center px-6 pt-8 pb-7">
              {/* Trophy orb */}
              <div className="relative mb-6 mt-4 flex justify-center w-full">
                <motion.div 
                  className="w-[160px] h-[160px] rounded-full overflow-hidden flex items-center justify-center drop-shadow-[0_0_35px_rgba(52,211,153,0.5)] bg-black/0"
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

              <h3 className="text-2xl font-black text-white mb-1">
                Ready to Claim! 🏆
              </h3>
              <p className="text-sm text-white/50 font-medium mb-5">Your 4-hour session is complete</p>

              {/* Reward amount */}
              <div className="w-full bg-white/5 border border-emerald-400/20 rounded-2xl p-4 mb-5">
                <p className="text-[10px] text-emerald-400/70 uppercase font-bold tracking-widest mb-1">Total Mined</p>
                <div className="text-3xl font-black text-emerald-300">
                  +{Number(activeSession.rate_used * 4).toFixed(2)}
                  <span className="text-lg ml-1.5 text-emerald-400/70">TASKY</span>
                </div>
              </div>

              {/* Claim CTA */}
              <button
                className="w-full font-black py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 text-white text-base  active:scale-95 transition-transform shadow-[0_0_25px_rgba(34,197,94,0.4)]"
                onClick={handleClaim}
                disabled={actionLoading}
              >
                {actionLoading ? 'Claiming...' : '✦ Claim Rewards'}
              </button>

              <p className="text-[10px] text-white/30 font-medium mt-3">Tap above to add to your balance</p>
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
                      {levels.map((lvl) => {
                        const isCurrent = status.mining_level === lvl.level;
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
                      {efficiency_tiers.map((tier, idx) => {
                        const next = efficiency_tiers[idx + 1];
                        const label = next ? `${tier.min_days}-${next.min_days - 1} days` : `${tier.min_days}+ days`;
                        let isCurrent = false;
                        if (next) {
                          isCurrent = daysStable >= tier.min_days && daysStable < next.min_days;
                        } else {
                          isCurrent = daysStable >= tier.min_days;
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
          {machinesData.total_bonus_percent > 0 && (
             <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-brand border border-brand/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 h-fit">
               <Zap size={10} /> +{machinesData.total_bonus_percent}% Total Bonus
             </div>
          )}
        </div>

        {machinesData.total_bonus_percent > 0 && (
          <div className="mb-2 text-xs text-ink font-medium">
             Machines are boosting your speed: <span className="line-through text-ink-soft opacity-70">{baseSpeed}/hr</span> <span className="mx-1 text-ink-faint">→</span> <span className="text-brand font-bold">{boostedSpeed.toFixed(2)}/hr</span>
          </div>
        )}

        <div className="text-[10px] text-ink-soft mb-4">
          Machines unlock automatically as you hold more TASKY. Each one permanently boosts your mining speed.
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
           {machinesData.machines.map((m, idx) => {
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
                    className={`
                       relative flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all overflow-hidden
                       ${isOwned ? `bg-surface border-solid ${conf.border} shadow-sm` : ''}
                       ${isVisible ? `bg-surface-soft border-dashed ${conf.border} opacity-80` : ''}
                       ${isHidden ? `bg-surface-soft border-solid border-border opacity-50` : ''}
                    `}
                 >
                    {isOwned && (
                       <div className={`absolute top-2 right-2 text-[10px] font-black px-1.5 py-0.5 rounded-md ${conf.badgeBg} ${conf.color}`}>
                          +{m.bonus}%
                       </div>
                    )}
                    <div className={`w-12 h-12 rounded-xl mb-2 flex items-center justify-center ${isHidden ? 'bg-surface border border-border text-ink-faint' : conf.bg}`}>
                       <RarityIcon size={24} className={isHidden ? 'text-ink-faint' : (isVisible ? 'text-ink-soft grayscale' : conf.color)} />
                    </div>
                    <div className="font-bold text-xs text-ink truncate w-full mb-0.5">
                       {isHidden ? 'Mystery Rig' : m.name}
                    </div>
                    <div className="text-[10px] text-ink-soft w-full px-1">
                       {isHidden ? (
                         <div className="flex items-center justify-center gap-1 text-brand/80 font-medium tracking-wide">
                            <Lock size={10} /> LOCKED
                         </div>
                       ) : (isOwned ? (
                         m.rarity.toUpperCase()
                       ) : (
                         <div className="w-full flex flex-col items-center gap-1 mt-1">
                           <div className="text-[9px]">Hold {Number(m.min_holding).toLocaleString()} TASKY</div>
                           <div className="w-full flex flex-col gap-0.5">
                             <div className="text-[8px] text-center text-ink-faint">
                               {displayHolding} / {Number(m.min_holding).toLocaleString()} TASKY
                             </div>
                             <div className="w-full h-1 bg-surface-soft border border-border rounded-full overflow-hidden">
                               <div className="h-full bg-brand" style={{ width: `${Math.min(100, (Number(displayHolding.replace(/,/g, '')) / Number(m.min_holding)) * 100)}%` }} />
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
      <Card className="rounded-3xl border-border space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-surface-soft p-1.5 rounded-lg">
            <Info size={16} className="text-ink-soft" />
          </div>
          <h2 className="text-sm font-bold text-ink">How Rig Works</h2>
        </div>
        <ul className="space-y-2 text-xs text-ink-soft">
          <li className="flex items-start gap-2">
            <span className="text-brand mt-0.5">•</span>
            <span>Hold TASKY in your wallet to unlock higher tiers automatically.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand mt-0.5">•</span>
            <span>The longer you hold without withdrawing, the higher your efficiency bonus grows.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand mt-0.5">•</span>
            <span>Withdrawing or reducing your balance resets efficiency back to 100%.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand mt-0.5">•</span>
            <span>Start a mining session, then return in 4 hours to claim your earnings.</span>
          </li>
        </ul>
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
                                      ? `This machine is active. Along with your other machines, your total bonus is +${machinesData.total_bonus_percent}%, earning you ${boostedSpeed.toFixed(2)}/hr instead of the base ${baseSpeed}/hr.`
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

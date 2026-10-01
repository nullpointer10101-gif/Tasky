import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coins, Zap, Flame, Trophy, Sparkles, ShieldCheck, 
  ArrowUpRight, Copy, Check, RefreshCw, AlertCircle, 
  TrendingUp, Wallet, ChevronRight, X, Info
} from 'lucide-react';
import { playFlip, getFlipStats, autoVerifyDeposit } from '../api';
import { useToast } from '../App';
import triggerConfetti from '../confetti';

const MIN_BET = 2.0;
const MULTIPLIER = 1.90;
const DEPOSIT_WALLET = 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR';

const SIMULATED_PLAYERS = [
  '@ton_***77', 'Alex***', '@cry***ox', '@kaz***01', '@sam***dev',
  '@vip***99', 'Dmit***', '@roma***12', 'Vital***', '@coin***44',
  'Max***ton', '@star***88', 'Elena***', '@pro***flip', '@gram***whales',
  'Igor***', '@ton_***king', 'Oleg***', '@lucky***7', '@cyber***x'
];

const DEFAULT_FEED_TEMPLATES = [
  { bet: 2.0, is_win: true, choice: 'heads', outcome: 'heads', mins: 1.2 },
  { bet: 5.0, is_win: true, choice: 'tails', outcome: 'tails', mins: 3.1 },
  { bet: 2.0, is_win: false, choice: 'tails', outcome: 'heads', mins: 5.4 },
  { bet: 5.0, is_win: true, choice: 'heads', outcome: 'heads', mins: 7.8 },
  { bet: 2.0, is_win: true, choice: 'tails', outcome: 'tails', mins: 10.5 },
  { bet: 5.0, is_win: false, choice: 'heads', outcome: 'tails', mins: 14.2 },
  { bet: 2.0, is_win: true, choice: 'heads', outcome: 'heads', mins: 18.0 },
  { bet: 10.0, is_win: true, choice: 'tails', outcome: 'tails', mins: 23.5 },
  { bet: 2.0, is_win: false, choice: 'heads', outcome: 'tails', mins: 29.8 },
  { bet: 5.0, is_win: true, choice: 'tails', outcome: 'tails', mins: 37.0 },
  { bet: 2.0, is_win: true, choice: 'heads', outcome: 'heads', mins: 46.2 },
  { bet: 5.0, is_win: false, choice: 'tails', outcome: 'heads', mins: 58.0 },
  { bet: 2.0, is_win: true, choice: 'tails', outcome: 'tails', mins: 72.5 },
  { bet: 5.0, is_win: true, choice: 'heads', outcome: 'heads', mins: 91.0 },
  { bet: 2.0, is_win: false, choice: 'tails', outcome: 'heads', mins: 115.0 }
];

function generateClientFallbackFeed() {
  const now = Date.now();
  return DEFAULT_FEED_TEMPLATES.map((tpl, i) => ({
    id: `cl_sim_${i}`,
    player: SIMULATED_PLAYERS[i % SIMULATED_PLAYERS.length],
    bet_amount: tpl.bet,
    choice: tpl.choice,
    outcome: tpl.outcome,
    is_win: tpl.is_win,
    win_amount: tpl.is_win ? parseFloat((tpl.bet * MULTIPLIER).toFixed(2)) : 0,
    created_at: new Date(now - tpl.mins * 60 * 1000).toISOString()
  }));
}

function formatTimeAgo(dateString) {
  if (!dateString) return '1m ago';
  const now = Date.now();
  const past = new Date(dateString).getTime();
  const diffSec = Math.max(0, Math.floor((now - past) / 1000));
  
  if (diffSec < 45) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export default function CyberFlip({ user, refreshUser }) {
  const { showToast } = useToast();
  const [selectedSide, setSelectedSide] = useState('heads'); // 'heads' | 'tails'
  const [betAmount, setBetAmount] = useState(2.0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState(null); // { outcome, is_win, win_amount, bet_amount }
  const [coinRotation, setCoinRotation] = useState(0);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [activeTab, setActiveTab] = useState('play'); // 'play' | 'history' | 'feed'
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [verifyingDeposit, setVerifyingDeposit] = useState(false);
  const [localFeed, setLocalFeed] = useState(() => generateClientFallbackFeed());

  const telegramId = user?.telegram_id;
  const gramBalance = parseFloat(user?.gram_balance || 0);
  const memoText = `TASKY_${telegramId}`;

  // Fetch flip stats and live feed
  const loadStats = async () => {
    if (!telegramId) return;
    try {
      const res = await getFlipStats(telegramId);
      if (res.data) {
        setStats(res.data);
        if (res.data.live_feed && res.data.live_feed.length > 0) {
          setLocalFeed(res.data.live_feed);
        }
      }
    } catch (e) {
      console.warn('Failed to load flip stats:', e);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 15000); // 15s refresh for live community feed
    return () => clearInterval(interval);
  }, [telegramId]);

  // Gentle live feed trickle every 90s if page remains open ("not too fast, not too slow")
  useEffect(() => {
    const trickle = setInterval(() => {
      setLocalFeed(prev => {
        const tpl = DEFAULT_FEED_TEMPLATES[Math.floor(Math.random() * DEFAULT_FEED_TEMPLATES.length)];
        const player = SIMULATED_PLAYERS[Math.floor(Math.random() * SIMULATED_PLAYERS.length)];
        const newEntry = {
          id: `trickle_${Date.now()}`,
          player,
          bet_amount: tpl.bet,
          choice: tpl.choice,
          outcome: tpl.outcome,
          is_win: tpl.is_win,
          win_amount: tpl.is_win ? parseFloat((tpl.bet * MULTIPLIER).toFixed(2)) : 0,
          created_at: new Date().toISOString()
        };
        return [newEntry, ...prev.slice(0, 19)];
      });
    }, 90000);
    return () => clearInterval(trickle);
  }, []);

  // Haptic feedback helper
  const triggerHaptic = (type = 'light') => {
    try {
      const tg = window.Telegram?.WebApp?.HapticFeedback;
      if (!tg) return;
      if (type === 'selection') tg.selectionChanged();
      else if (type === 'medium') tg.impactOccurred('medium');
      else if (type === 'heavy') tg.impactOccurred('heavy');
      else if (type === 'success') tg.notificationOccurred('success');
      else if (type === 'error') tg.notificationOccurred('error');
    } catch (_) {}
  };

  // Switch Side & Smoothly Rotate 3D Coin to Face User
  const handleSelectSide = (side) => {
    if (isFlipping) return;
    triggerHaptic('selection');
    setSelectedSide(side);

    // Smoothly turn the 3D coin to show the selected side
    const targetMod = side === 'heads' ? 0 : 180;
    const currentMod = ((coinRotation % 360) + 360) % 360;
    if (currentMod !== targetMod) {
      setCoinRotation(prev => prev + 180);
    }
  };

  // Adjust Bet Helpers
  const handleSetBet = (amt) => {
    triggerHaptic('selection');
    setBetAmount(Math.max(MIN_BET, parseFloat(amt.toFixed(2))));
  };

  const handleMultiplyBet = (factor) => {
    triggerHaptic('selection');
    const newBet = Math.max(MIN_BET, parseFloat((betAmount * factor).toFixed(2)));
    setBetAmount(newBet);
  };

  const handleMaxBet = () => {
    triggerHaptic('selection');
    if (gramBalance >= MIN_BET) {
      setBetAmount(parseFloat(gramBalance.toFixed(2)));
    } else {
      setBetAmount(MIN_BET);
    }
  };

  // Execute Flip
  const handleFlip = async () => {
    if (isFlipping) return;

    if (betAmount < MIN_BET) {
      showToast(`Minimum bet is ${MIN_BET} GRAM`, 'error');
      return;
    }

    if (gramBalance < betAmount) {
      triggerHaptic('error');
      showToast(`Insufficient GRAM! Need ${betAmount} GRAM (Balance: ${gramBalance.toFixed(2)} GRAM)`, 'error');
      setShowDepositModal(true);
      return;
    }

    triggerHaptic('heavy');
    setIsFlipping(true);
    setFlipResult(null);

    try {
      const res = await playFlip(telegramId, betAmount, selectedSide);
      
      if (res.error) {
        setIsFlipping(false);
        showToast(res.error, 'error');
        return;
      }

      const data = res.data;
      const targetOutcome = data.outcome; // 'heads' or 'tails'
      const targetMod = targetOutcome === 'heads' ? 0 : 180;

      // 6 full 360-degree spins + forward diff to land squarely on targetOutcome
      const fullSpins = 360 * 6;
      const currentMod = ((coinRotation % 360) + 360) % 360;
      const forwardDiff = (targetMod - currentMod + 360) % 360;
      const newRotation = coinRotation + fullSpins + forwardDiff;
      
      setCoinRotation(newRotation);

      // Play tick vibrations during spin
      let ticks = 0;
      const tickInterval = setInterval(() => {
        ticks++;
        triggerHaptic('medium');
        if (ticks >= 8) clearInterval(tickInterval);
      }, 250);

      // Settle flip after 2.4s animation
      setTimeout(() => {
        setIsFlipping(false);
        setFlipResult(data);

        if (data.is_win) {
          triggerHaptic('success');
          triggerConfetti();
          showToast(`🎉 WINNER! +${data.win_amount.toFixed(2)} GRAM credited!`, 'success');
        } else {
          triggerHaptic('error');
          showToast(`Landed on ${targetOutcome.toUpperCase()}. Better luck next flip!`, 'info');
        }

        // Add user's flip immediately to top of community live feed
        setLocalFeed(prev => [
          {
            id: `usr_${Date.now()}`,
            player: user?.username ? `@${user.username}` : (user?.first_name || 'You'),
            bet_amount: betAmount,
            choice: selectedSide,
            outcome: targetOutcome,
            is_win: data.is_win,
            win_amount: data.is_win ? data.win_amount : 0,
            created_at: new Date().toISOString()
          },
          ...prev.slice(0, 19)
        ]);

        if (refreshUser) refreshUser();
        loadStats();
      }, 2400);

    } catch (err) {
      setIsFlipping(false);
      showToast(err.message || 'Flip failed. Please try again.', 'error');
    }
  };

  // Deposit Helpers
  const handlePayViaWallet = (amount) => {
    triggerHaptic('medium');
    const nanoAmount = Math.round(amount * 1e9);
    const comment = encodeURIComponent(memoText);
    const tonkeeperUrl = `https://app.tonkeeper.com/transfer/${DEPOSIT_WALLET}?amount=${nanoAmount}&text=${comment}`;

    try {
      if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(tonkeeperUrl);
      } else {
        window.open(tonkeeperUrl, '_blank');
      }
    } catch (_) {
      window.location.href = tonkeeperUrl;
    }
    showToast(`Opening Tonkeeper for ${amount} GRAM deposit...`, 'success');
  };

  const copyToClipboard = (text, type) => {
    triggerHaptic('selection');
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'wallet') {
        setCopiedWallet(true);
        setTimeout(() => setCopiedWallet(false), 2000);
      } else {
        setCopiedMemo(true);
        setTimeout(() => setCopiedMemo(false), 2000);
      }
      showToast(`${type === 'wallet' ? 'Wallet Address' : 'Memo'} copied!`, 'success');
    }).catch(() => showToast('Failed to copy', 'error'));
  };

  const handleAutoVerify = async () => {
    if (!telegramId) return;
    setVerifyingDeposit(true);
    triggerHaptic('medium');

    try {
      const { data, error } = await autoVerifyDeposit(telegramId);
      if (error) {
        showToast(error, 'error');
      } else if (data?.success) {
        triggerHaptic('success');
        triggerConfetti();
        const amt = data.amount_gram ? `+${data.amount_gram} GRAM ` : '';
        showToast(`🎉 Deposit Verified! ${amt}added to your balance!`, 'success');
        setShowDepositModal(false);
        if (refreshUser) refreshUser();
      } else {
        showToast('No deposit found. Make sure you included your memo comment in the transfer.', 'info');
      }
    } catch (_) {
      showToast('Connection error checking deposit. Please retry in a few seconds.', 'error');
    } finally {
      setVerifyingDeposit(false);
    }
  };

  const potentialWin = parseFloat((betAmount * MULTIPLIER).toFixed(2));
  const potentialProfit = parseFloat((potentialWin - betAmount).toFixed(2));

  return (
    <div className="space-y-4">
      {/* ── TOP HEADER CARD ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/80 via-[#0d091e] to-[#06040d] border border-cyan-500/25 p-4 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <Coins size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black text-white uppercase tracking-wider">Cyber Flip</h2>
                <span className="px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 font-black text-[9px] border border-cyan-400/30">
                  1.90X
                </span>
              </div>
              <p className="text-[11px] text-white/50 font-medium">Instant 50/50 Provably Fair Coin Toss</p>
            </div>
          </div>

          {/* User GRAM Balance Badge */}
          <div className="flex flex-col items-end">
            <span className="text-[9.5px] uppercase tracking-wider text-cyan-300 font-bold">Your Balance</span>
            <div className="flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded-xl">
              <span className="text-sm font-black text-white font-mono">{gramBalance.toFixed(2)}</span>
              <span className="text-[10px] font-black text-cyan-400">GRAM</span>
            </div>
          </div>
        </div>

        {/* Live Community Wins Ticker */}
        {localFeed && localFeed.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <div className="flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase tracking-wider shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {localFeed.slice(0, 6).map((f) => (
                <div 
                  key={f.id} 
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-medium shrink-0 flex items-center gap-1.5 border ${
                    f.is_win 
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                      : 'bg-white/5 text-white/40 border-white/5'
                  }`}
                >
                  <span className="font-mono text-white/80">{f.player}</span>
                  <span className="uppercase text-[9px] font-bold text-white/40">({f.choice})</span>
                  {f.is_win ? (
                    <span className="font-bold text-emerald-400">+{f.win_amount.toFixed(1)}G</span>
                  ) : (
                    <span className="text-rose-400/80">-{f.bet_amount.toFixed(1)}G</span>
                  )}
                  <span className="text-[9px] text-white/30 font-mono">{formatTimeAgo(f.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 3D COIN ARENA ── */}
      <div className="relative rounded-3xl bg-gradient-to-b from-[#100d23] to-[#070512] border border-white/10 p-6 flex flex-col items-center justify-center overflow-hidden">
        {/* Glow backdrop */}
        <div 
          className={`absolute inset-0 opacity-20 blur-3xl transition-colors duration-700 pointer-events-none ${
            selectedSide === 'heads' ? 'bg-cyan-500' : 'bg-purple-600'
          }`}
        />

        {/* 3D Coin Container */}
        <div className="relative w-36 h-36 my-3 perspective-[1000px] flex items-center justify-center">
          <motion.div
            className="w-32 h-32 relative preserve-3d"
            animate={{ rotateY: coinRotation }}
            transition={{
              duration: isFlipping ? 2.4 : 0.45,
              ease: isFlipping ? [0.25, 1, 0.5, 1] : 'easeOut'
            }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* FRONT SIDE: HEADS (CYAN/BLUE) */}
            <div 
              className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-900 border-4 border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.6)] flex flex-col items-center justify-center text-white backface-hidden"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="w-24 h-24 rounded-full border border-cyan-200/40 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
                <Zap size={32} className="text-cyan-200 mb-0.5" />
                <span className="text-[11px] font-black tracking-widest uppercase text-cyan-100">HEADS</span>
                <span className="text-[8px] font-mono text-cyan-300/80">CYBER</span>
              </div>
            </div>

            {/* BACK SIDE: TAILS (PURPLE/MAGENTA) */}
            <div 
              className="absolute inset-0 rounded-full bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-950 border-4 border-purple-300 shadow-[0_0_25px_rgba(168,85,247,0.6)] flex flex-col items-center justify-center text-white backface-hidden"
              style={{ 
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <div className="w-24 h-24 rounded-full border border-purple-200/40 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
                <Flame size={32} className="text-purple-200 mb-0.5" />
                <span className="text-[11px] font-black tracking-widest uppercase text-purple-100">TAILS</span>
                <span className="text-[8px] font-mono text-purple-300/80">GRAM</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Flip Status Banner */}
        <div className="min-h-[28px] mt-1 text-center">
          {isFlipping ? (
            <div className="flex items-center justify-center gap-1.5 text-cyan-300 text-xs font-black animate-pulse uppercase tracking-wider">
              <RefreshCw size={14} className="animate-spin" /> Flipping Coin...
            </div>
          ) : flipResult ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`text-xs font-black uppercase tracking-wider ${
                flipResult.is_win ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {flipResult.message}
            </motion.div>
          ) : (
            <p className="text-[11px] text-white/60 font-medium flex items-center justify-center gap-1.5">
              <span>Selected:</span>
              <span className={`font-black uppercase tracking-wider ${
                selectedSide === 'heads' ? 'text-cyan-300' : 'text-purple-300'
              }`}>
                {selectedSide}
              </span>
              <span className="text-white/30">•</span>
              <span className="text-white/40">Choose bet & flip</span>
            </p>
          )}
        </div>
      </div>

      {/* ── SIDE SELECTOR (HEADS vs TAILS) ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Heads Card */}
        <motion.button
          onClick={() => handleSelectSide('heads')}
          disabled={isFlipping}
          whileTap={{ scale: 0.96 }}
          className={`relative p-3.5 rounded-2xl border text-left transition-all ${
            selectedSide === 'heads'
              ? 'bg-gradient-to-br from-cyan-950/60 to-blue-950/80 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] ring-2 ring-cyan-400/40'
              : 'bg-black/30 border-white/10 hover:border-white/20 opacity-70'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                selectedSide === 'heads' ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white/60'
              }`}>
                <Zap size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider">HEADS</p>
                <p className="text-[10px] text-cyan-300 font-bold">1.90X Payout</p>
              </div>
            </div>
            {selectedSide === 'heads' && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            )}
          </div>
        </motion.button>

        {/* Tails Card */}
        <motion.button
          onClick={() => handleSelectSide('tails')}
          disabled={isFlipping}
          whileTap={{ scale: 0.96 }}
          className={`relative p-3.5 rounded-2xl border text-left transition-all ${
            selectedSide === 'tails'
              ? 'bg-gradient-to-br from-purple-950/60 to-fuchsia-950/80 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)] ring-2 ring-purple-400/40'
              : 'bg-black/30 border-white/10 hover:border-white/20 opacity-70'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                selectedSide === 'tails' ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/60'
              }`}>
                <Flame size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider">TAILS</p>
                <p className="text-[10px] text-purple-300 font-bold">1.90X Payout</p>
              </div>
            </div>
            {selectedSide === 'tails' && (
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            )}
          </div>
        </motion.button>
      </div>

      {/* ── BET AMOUNT CONTROLS ── */}
      <div className="p-4 rounded-3xl bg-black/40 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
            <Coins size={13} className="text-amber-400" />
            Bet Amount (GRAM)
          </label>
          <span className="text-[10.5px] font-mono text-cyan-300 font-bold">
            Min: {MIN_BET} GRAM
          </span>
        </div>

        {/* Input & Potential Return Display */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              min={MIN_BET}
              step="0.5"
              value={betAmount}
              disabled={isFlipping}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setBetAmount(isNaN(val) ? 0 : val);
              }}
              className="w-full bg-[#0a0817] border border-white/15 rounded-2xl py-2.5 px-3.5 text-base font-black text-white font-mono focus:outline-none focus:border-cyan-400 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-white/40">
              GRAM
            </span>
          </div>

          {/* Quick Multiply Buttons */}
          <button
            onClick={() => handleMultiplyBet(2)}
            disabled={isFlipping}
            className="py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-xs active:scale-95 transition-all"
          >
            2X
          </button>
          <button
            onClick={handleMaxBet}
            disabled={isFlipping}
            className="py-2.5 px-3 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 font-black text-xs active:scale-95 transition-all"
          >
            MAX
          </button>
        </div>

        {/* Quick Amount Chips */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {[2.0, 5.0, 10.0, 25.0].map((amt) => (
            <button
              key={amt}
              disabled={isFlipping}
              onClick={() => handleSetBet(amt)}
              className={`py-1.5 rounded-xl text-xs font-black font-mono transition-all border ${
                betAmount === amt
                  ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400'
                  : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10'
              }`}
            >
              {amt.toFixed(1)}G
            </button>
          ))}
        </div>

        {/* Potential Return Badge */}
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-950/30 to-teal-950/20 border border-emerald-500/20 rounded-2xl p-2.5 px-3">
          <span className="text-[10.5px] font-bold text-emerald-300 uppercase tracking-wider">
            Potential Win (1.90X)
          </span>
          <div className="text-right">
            <span className="text-xs font-black text-emerald-400 font-mono">
              +{potentialWin.toFixed(2)} GRAM
            </span>
            <span className="text-[9.5px] text-white/40 ml-1 font-mono">
              (+{potentialProfit.toFixed(2)} profit)
            </span>
          </div>
        </div>
      </div>

      {/* ── ACTION BUTTON: FLIP OR TOP-UP ── */}
      {gramBalance < betAmount ? (
        <motion.button
          onClick={() => {
            triggerHaptic('medium');
            setShowDepositModal(true);
          }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all"
        >
          <Wallet size={18} />
          Top Up GRAM to Flip (Need {(betAmount - gramBalance).toFixed(2)} GRAM)
        </motion.button>
      ) : (
        <motion.button
          onClick={handleFlip}
          disabled={isFlipping || betAmount < MIN_BET}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
            isFlipping
              ? 'bg-white/20 text-white/50 cursor-not-allowed'
              : selectedSide === 'heads'
              ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-black shadow-cyan-500/30 hover:brightness-110'
              : 'bg-gradient-to-r from-purple-400 via-fuchsia-500 to-pink-600 text-white shadow-purple-500/30 hover:brightness-110'
          }`}
        >
          {isFlipping ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              Flipping...
            </>
          ) : (
            <>
              <Zap size={18} />
              Flip {selectedSide.toUpperCase()} for {betAmount.toFixed(1)} GRAM
            </>
          )}
        </motion.button>
      )}

      {/* ── STATS & RECENT HISTORY TABS ── */}
      <div className="pt-2">
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-3">
          <button
            onClick={() => setActiveTab('play')}
            className={`text-xs font-black uppercase tracking-wider pb-1 transition-all ${
              activeTab === 'play' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-white/40'
            }`}
          >
            My Stats
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`text-xs font-black uppercase tracking-wider pb-1 transition-all ${
              activeTab === 'history' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-white/40'
            }`}
          >
            My History ({stats?.user?.history?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('feed')}
            className={`text-xs font-black uppercase tracking-wider pb-1 transition-all ${
              activeTab === 'feed' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-white/40'
            }`}
          >
            Community Live
          </button>
        </div>

        {/* Tab 1: Stats */}
        {activeTab === 'play' && (
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-center">
              <span className="text-[10px] text-white/40 font-bold uppercase">Total Flips</span>
              <p className="text-base font-black text-white font-mono mt-0.5">{stats?.user?.total_flips || 0}</p>
            </div>
            <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-center">
              <span className="text-[10px] text-white/40 font-bold uppercase">Win Rate</span>
              <p className="text-base font-black text-emerald-400 font-mono mt-0.5">{stats?.user?.win_rate || 0}%</p>
            </div>
            <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-center">
              <span className="text-[10px] text-white/40 font-bold uppercase">Net Profit</span>
              <p className={`text-base font-black font-mono mt-0.5 ${
                (stats?.user?.net_profit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {(stats?.user?.net_profit || 0) >= 0 ? '+' : ''}{(stats?.user?.net_profit || 0).toFixed(1)}G
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: User History */}
        {activeTab === 'history' && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {stats?.user?.history && stats.user.history.length > 0 ? (
              stats.user.history.map((h) => (
                <div 
                  key={h.id} 
                  className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${h.is_win ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span className="font-black uppercase text-white/80">{h.choice}</span>
                    <span className="text-[10px] text-white/40">Landed {h.outcome}</span>
                  </div>
                  <div className="text-right font-mono font-bold">
                    {h.is_win ? (
                      <span className="text-emerald-400">+{h.win_amount.toFixed(2)} GRAM</span>
                    ) : (
                      <span className="text-rose-400">-{h.bet_amount.toFixed(2)} GRAM</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-white/40 text-center py-4">No flips yet. Take your first flip above!</p>
            )}
          </div>
        )}

        {/* Tab 3: Community Feed */}
        {activeTab === 'feed' && (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {localFeed && localFeed.length > 0 ? (
              localFeed.map((f) => {
                const profit = f.is_win ? (f.win_amount - f.bet_amount).toFixed(2) : f.bet_amount.toFixed(2);
                return (
                  <div 
                    key={f.id} 
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-white/15 transition-all text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        f.choice === 'heads' 
                          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' 
                          : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                      }`}>
                        {f.choice === 'heads' ? <Zap size={15} /> : <Flame size={15} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-cyan-200 font-bold">{f.player}</span>
                          <span className={`text-[9px] uppercase font-black px-1.5 py-0.2 rounded-md ${
                            f.choice === 'heads' ? 'bg-cyan-400/15 text-cyan-300' : 'bg-purple-400/15 text-purple-300'
                          }`}>
                            {f.choice}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-white/40 mt-0.5 block">
                          {formatTimeAgo(f.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      {f.is_win ? (
                        <div>
                          <span className="text-emerald-400 font-black text-xs">
                            +{f.win_amount.toFixed(2)} GRAM
                          </span>
                          <p className="text-[9.5px] text-emerald-300/80 font-bold">
                            (+{profit}G profit)
                          </p>
                        </div>
                      ) : (
                        <div>
                          <span className="text-rose-400/90 font-bold text-xs">
                            -{f.bet_amount.toFixed(2)} GRAM
                          </span>
                          <p className="text-[9.5px] text-white/30">
                            loss
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-white/40 text-center py-4">No community flips recorded yet.</p>
            )}
          </div>
        )}
      </div>

      {/* ── INSTANT TOP-UP / DEPOSIT MODAL ── */}
      <AnimatePresence>
        {showDepositModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-[#0f0a22] border border-indigo-500/30 p-5 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Top Up GRAM</h3>
                    <p className="text-[10.5px] text-white/50">Instant deposit via Tonkeeper</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="p-1.5 rounded-xl bg-white/5 text-white/50 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 1-Tap Presets */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                  1-Tap Tonkeeper Presets
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[2.0, 5.0, 10.0, 25.0].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => handlePayViaWallet(amt)}
                      className="py-2.5 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-white font-black text-xs flex items-center justify-between active:scale-95 transition-all"
                    >
                      <span>{amt.toFixed(1)} GRAM</span>
                      <ArrowUpRight size={14} className="text-cyan-400" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Address & Memo */}
              <div className="space-y-2 pt-1 border-t border-white/10">
                <div>
                  <p className="text-[9.5px] font-bold text-white/40 uppercase">Tasky Deposit Wallet</p>
                  <div className="flex items-center justify-between bg-black/50 p-2 rounded-xl border border-white/10 gap-1.5 mt-1">
                    <p className="text-[11px] font-mono text-white truncate flex-1">{DEPOSIT_WALLET}</p>
                    <button
                      onClick={() => copyToClipboard(DEPOSIT_WALLET, 'wallet')}
                      className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 shrink-0"
                    >
                      {copiedWallet ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-[9.5px] font-bold text-amber-400 uppercase">Required Memo Comment</p>
                  <div className="flex items-center justify-between bg-amber-500/10 p-2 rounded-xl border border-amber-500/30 gap-1.5 mt-1">
                    <p className="text-xs font-mono font-black text-amber-300 truncate">{memoText}</p>
                    <button
                      onClick={() => copyToClipboard(memoText, 'memo')}
                      className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 shrink-0"
                    >
                      {copiedMemo ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Instant Auto-Verifier */}
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <p className="text-[10px] text-white/50 text-center">
                  Once your transfer is sent, tap below to check & credit your balance:
                </p>
                <motion.button
                  onClick={handleAutoVerify}
                  disabled={verifyingDeposit}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                >
                  {verifyingDeposit ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Checking Blockchain...
                    </>
                  ) : (
                    <>
                      <Zap size={14} /> Check & Credit Deposit ⚡
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

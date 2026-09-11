import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Rocket, ShieldCheck, Sparkles, Copy, Check, Clock, Timer,
  Wallet, ArrowDownLeft, Trophy, AlertCircle, RefreshCw, 
  ExternalLink, Flame, Users, Gem, ChevronRight, CheckCircle2, Crown 
} from 'lucide-react';
import { getNftMarketplace, buyNft, getMyNftCards, claimNftYield, autoVerifyDeposit } from '../api';
import { useToast } from '../App';
import triggerConfetti from '../confetti';

const TABS = [
  { key: 'marketplace', label: 'Marketplace', icon: Sparkles },
  { key: 'inventory', label: 'My Miners', icon: Gem },
  { key: 'deposit', label: 'Deposit', icon: ArrowDownLeft }
];

export default function NFTMarketplace({ user, refreshUser, tgUser, navigate }) {
  const telegramId = user?.telegram_id || tgUser?.id || tgUser?.telegram_id || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('marketplace');
  const [cards, setCards] = useState([]);
  const [myCards, setMyCards] = useState([]);
  const [depositWallet, setDepositWallet] = useState('UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR');
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  const [claimingId, setClaimingId] = useState(null);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [txHashInput, setTxHashInput] = useState('');
  const [verifyingDeposit, setVerifyingDeposit] = useState(false);
  const [showCommModal, setShowCommModal] = useState(false);

  // ── SEASON 1 FIXED GLOBAL CLOSING DEADLINE (7-Day Genesis Campaign Launched Sept 8, 2026) ──
  const S1_GLOBAL_TARGET_TS = new Date('2026-09-15T18:30:00.000Z').getTime();
  const [s1DeadlineTs, setS1DeadlineTs] = useState(S1_GLOBAL_TARGET_TS);
  const [s1TimeLeft, setS1TimeLeft] = useState({ days: 4, hours: 8, minutes: 0, seconds: 0, totalMs: 0 });

  useEffect(() => {
    const updateTimer = () => {
      const diff = Math.max(0, s1DeadlineTs - Date.now());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setS1TimeLeft({ days, hours, minutes, seconds, totalMs: diff });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [s1DeadlineTs]);

  const memoText = `TASKY_${telegramId}`;
  const gramBalance = parseFloat(user?.gram_balance || user?.balance || 0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [marketRes, myRes] = await Promise.all([
        getNftMarketplace(),
        telegramId ? getMyNftCards(telegramId) : Promise.resolve({ data: { cards: [] } })
      ]);

      if (marketRes.data?.cards) {
        const sortedCards = [...marketRes.data.cards].sort((a, b) => parseFloat(b.price_gram) - parseFloat(a.price_gram));
        setCards(sortedCards);
      }
      if (marketRes.data?.s1_deadline) {
        const parsed = new Date(marketRes.data.s1_deadline).getTime();
        if (!isNaN(parsed) && parsed > 0) {
          setS1DeadlineTs(parsed);
        }
      }
      if (marketRes.data?.deposit_wallet) {
        setDepositWallet(marketRes.data.deposit_wallet);
      }
      if (myRes.data?.cards) {
        setMyCards(myRes.data.cards);
      }
    } catch (err) {
      console.error('Error fetching NFT data:', err);
    } finally {
      setLoading(false);
    }
  }, [telegramId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBuy = async (nft) => {
    if (!telegramId) {
      showToast('Telegram user ID required', 'error');
      return;
    }
    const price = parseFloat(nft.price_gram);
    if (gramBalance < price) {
      showToast(`Insufficient GRAM! You need ${price} GRAM. Top up via Deposit tab!`, 'error');
      return;
    }

    setBuyingId(nft.id);
    try {
      const { data, error } = await buyNft(telegramId, nft.id);
      if (error) {
        showToast(error, 'error');
      } else if (data && data.success) {
        showToast(data.message || '🎉 NFT Miner activated successfully!', 'success');
        triggerConfetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        await refreshUser();
        await fetchData();
        setActiveTab('inventory');
      }
    } catch (err) {
      showToast('Connection error during purchase', 'error');
    } finally {
      setBuyingId(null);
    }
  };

  const handlePayViaWallet = (amountGram, walletType = 'tonkeeper') => {
    const nanoAmount = Math.round(parseFloat(amountGram) * 1e9);
    const comment = encodeURIComponent(memoText);

    let url = walletType === 'tonkeeper'
      ? `https://app.tonkeeper.com/transfer/${depositWallet}?amount=${nanoAmount}&text=${comment}`
      : `ton://transfer/${depositWallet}?amount=${nanoAmount}&text=${comment}`;

    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }

    showToast(`Opening ${walletType === 'tonkeeper' ? 'Tonkeeper' : 'TON Wallet'} with pre-filled deposit...`, 'success');
  };

  const handleClaim = async (instanceId) => {
    if (!telegramId) return;
    setClaimingId(instanceId);
    try {
      const { data, error } = await claimNftYield(telegramId, instanceId);
      if (error) {
        showToast(error, 'error');
      } else if (data && data.success) {
        showToast(data.message || '🎉 Daily GRAM yield claimed!', 'success');
        triggerConfetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        await refreshUser();
        await fetchData();
      }
    } catch (err) {
      showToast('Connection error during yield claim', 'error');
    } finally {
      setClaimingId(null);
    }
  };

  const handleAutoVerifyDeposit = async () => {
    if (!telegramId) return;
    setVerifyingDeposit(true);
    try {
      const { data, error } = await autoVerifyDeposit(telegramId, txHashInput);
      if (error) {
        showToast(error, 'error');
      } else if (data && data.success) {
        showToast('🎉 Deposit verified & credited to Vault!', 'success');
        triggerConfetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        setTxHashInput('');
        await refreshUser();
        await fetchData();
        setActiveTab('marketplace');
      }
    } catch (err) {
      showToast('Connection error verifying deposit', 'error');
    } finally {
      setVerifyingDeposit(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'wallet') {
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
      showToast('Wallet address copied!', 'success');
    } else {
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 2000);
      showToast('Deposit Memo copied!', 'success');
    }
  };

  const renderCountdown = (seconds) => {
    if (seconds <= 0) return 'Ready to Claim!';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="p-4 space-y-4 pb-28 min-h-full relative max-w-md mx-auto">
      
      {/* ── TOP HERO HEADER ── */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#1d123d] via-[#140b2b] to-[#0a0518] border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.12)]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white uppercase tracking-tight">NFT Miners</h1>
              <p className="text-[11px] text-indigo-200/70 font-semibold">Automated Cloud Hashrate</p>
            </div>
          </div>

          {/* Balance Capsule */}
          <div className="flex items-center gap-2 bg-black/50 border border-white/10 px-3 py-1.5 rounded-2xl backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <div className="text-right">
              <p className="text-[9px] font-black uppercase text-white/40 leading-none">Vault Balance</p>
              <p className="text-xs font-mono font-black text-emerald-300 leading-tight mt-0.5">
                {gramBalance.toFixed(3)} <span className="text-[9px] text-emerald-400/60">GRAM</span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-white/80 font-medium leading-relaxed relative z-10">
          Deploy high-yield NFT Digital Miners to automatically generate passive GRAM rewards directly to your wallet.
        </p>

        {/* 3-Level Commission Bar */}
        <div 
          onClick={() => setShowCommModal(true)}
          className="mt-3 bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-purple-500/15 border border-amber-500/30 rounded-2xl p-2.5 flex items-center justify-between cursor-pointer active:scale-98 transition-all"
        >
          <div className="flex items-center gap-2">
            <Users size={14} className="text-amber-400" />
            <span className="text-[11px] font-black text-amber-300">
              3-Level Team Rewards: L1 (30%) • L2 (10%) • L3 (4%)
            </span>
          </div>
          <ChevronRight size={14} className="text-amber-300/70" />
        </div>
      </div>

      {/* ── SEASON 1 CLOSING COUNTDOWN HERO BANNER (TOP ABOVE OPTION TABS) ── */}
      <div className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-br from-[#2a0815] via-[#1a051d] to-[#0d0315] border border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.18)]">
        <div className="absolute top-0 right-0 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <Flame size={14} className="text-rose-400" /> Season 1 Ending Soon
            </span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
            <Clock size={11} /> Closing in {s1TimeLeft.days > 0 ? `${s1TimeLeft.days}d ${s1TimeLeft.hours}h` : `${s1TimeLeft.hours}h ${s1TimeLeft.minutes}m`}
          </span>
        </div>

        <p className="text-[11.5px] text-white/80 font-medium leading-snug mb-3 relative z-10">
          Season 1 NFT Digital Miners will close permanently when the countdown expires. Deployed miners continue generating full daily yield for their 10-day lifecycle!
        </p>

        {/* 4 Digital Timer Capsules */}
        <div className="grid grid-cols-4 gap-2 text-center relative z-10">
          <div className="bg-black/60 border border-rose-500/30 rounded-2xl py-2 px-1 backdrop-blur-sm shadow-inner">
            <p className="text-lg font-black font-mono text-white tracking-tight">{String(s1TimeLeft.days).padStart(2, '0')}</p>
            <p className="text-[9px] font-black uppercase text-rose-300/70">Days</p>
          </div>
          <div className="bg-black/60 border border-rose-500/30 rounded-2xl py-2 px-1 backdrop-blur-sm shadow-inner">
            <p className="text-lg font-black font-mono text-white tracking-tight">{String(s1TimeLeft.hours).padStart(2, '0')}</p>
            <p className="text-[9px] font-black uppercase text-rose-300/70">Hours</p>
          </div>
          <div className="bg-black/60 border border-rose-500/30 rounded-2xl py-2 px-1 backdrop-blur-sm shadow-inner">
            <p className="text-lg font-black font-mono text-white tracking-tight">{String(s1TimeLeft.minutes).padStart(2, '0')}</p>
            <p className="text-[9px] font-black uppercase text-rose-300/70">Mins</p>
          </div>
          <div className="bg-black/60 border border-rose-500/30 rounded-2xl py-2 px-1 backdrop-blur-sm shadow-inner">
            <p className="text-lg font-black font-mono text-amber-300 tracking-tight animate-pulse">{String(s1TimeLeft.seconds).padStart(2, '0')}</p>
            <p className="text-[9px] font-black uppercase text-amber-400/80">Secs</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/10">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const count = tab.key === 'inventory' ? myCards.length : null;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.35)] border border-indigo-400/30'
                  : 'text-white/60 hover:text-white bg-transparent hover:bg-white/5'
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
              {count !== null && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── MAIN TAB CONTENT ── */}
      <AnimatePresence mode="wait">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-indigo-400 animate-pulse">
            <RefreshCw size={32} className="animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest">Loading NFT Network...</p>
          </div>
        ) : activeTab === 'marketplace' ? (
          /* ========================================================= */
          /* TAB 1: NFT MARKETPLACE                                    */
          /* ========================================================= */
          <motion.div 
            key="marketplace" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            className="space-y-4"
          >
            {cards.map((nft) => {
              const isTitan = nft.id === 4 || parseFloat(nft.price_gram) >= 50;
              const isMega = (nft.id === 3 || parseFloat(nft.price_gram) >= 5) && !isTitan;
              const isTurbo = nft.id === 2;
              const price = parseFloat(nft.price_gram);
              const directCommission = (price * 0.30).toFixed(2);
              const maxAllowed = (isTitan || isMega) ? 10 : 2;
              const ownedCount = myCards
                .filter(c => Number(c.nft_id) === Number(nft.id))
                .reduce((sum, c) => sum + Math.max(1, Math.round((c.total_days || c.duration_days || 10) / 10)), 0);
              const isMaxOwned = ownedCount >= maxAllowed;

              return (
                <div
                  key={nft.id}
                  className={`relative overflow-hidden rounded-3xl p-5 border transition-all duration-300 ${
                    isTitan
                      ? 'bg-gradient-to-b from-[#381f02] via-[#221200] to-[#0d0700] border-amber-400/60 shadow-[0_0_35px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/30'
                      : isMega
                      ? 'bg-gradient-to-b from-[#2a0e05] via-[#1a0802] to-[#0d0401] border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.15)]'
                      : isTurbo
                      ? 'bg-gradient-to-b from-[#1b103c] via-[#120a2b] to-[#090417] border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.12)]'
                      : 'bg-gradient-to-b from-[#111638] via-[#0b0e24] to-[#060714] border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                  }`}
                >
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.8 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        S1
                      </span>

                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isTitan
                          ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 text-black shadow-md font-black'
                          : isMega
                          ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-sm'
                          : isTurbo
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        {isTitan ? <Crown size={12} className="animate-bounce" /> : isMega ? <Flame size={12} /> : isTurbo ? <Rocket size={12} /> : <Zap size={12} />}
                        {isTitan ? '👑 TITAN GOD MINER' : nft.rarity || (isMega ? 'MYTHIC MINER' : isTurbo ? 'TURBO MINER' : 'STARTER MINER')}
                      </span>
                      
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.8 rounded-full border ${
                        isMaxOwned ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-white/5 text-white/60 border-white/10'
                      }`}>
                        {ownedCount > 0 ? `Owned: ${ownedCount}/${maxAllowed}` : `Limit: ${maxAllowed} Max`}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black font-mono text-amber-300">
                        {nft.price_gram} <span className="text-xs text-white/50">GRAM</span>
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="flex items-start gap-3.5 mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isTitan
                        ? 'bg-amber-400/20 border-amber-400/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                        : isMega
                        ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                        : isTurbo
                        ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                        : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                    }`}>
                      {isTitan ? <Crown size={26} className="animate-pulse text-amber-300" /> : isMega ? <Flame size={24} className="animate-pulse" /> : isTurbo ? <Rocket size={22} /> : <Zap size={22} />}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">{nft.name}</h3>
                      <p className="text-xs text-white/60 leading-snug mt-0.5">{nft.description}</p>
                    </div>
                  </div>

                  {/* Clean Yield Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-black/40 p-3 rounded-2xl border border-white/10 mb-3.5">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-left">
                      <p className="text-[9.5px] font-black text-emerald-400/80 uppercase tracking-wider">Daily Output</p>
                      <p className="text-sm font-black font-mono text-emerald-300 mt-0.5">+{nft.daily_yield_gram} GRAM/day</p>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/20 p-2.5 rounded-xl text-left">
                      <p className="text-[9.5px] font-black text-purple-300/80 uppercase tracking-wider">Total Return ({nft.duration_days || 10} Days)</p>
                      <p className="text-sm font-black font-mono text-purple-200 mt-0.5">{nft.total_yield_gram} GRAM Total</p>
                    </div>
                  </div>

                  {/* Direct Referral Bonus Pill */}
                  <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl flex items-center justify-between text-[11px] font-bold text-amber-300 mb-3.5">
                    <span className="flex items-center gap-1.5">
                      <Users size={13} className="text-amber-400" /> Direct Sponsor Reward (30%):
                    </span>
                    <span className="font-mono font-black text-amber-200">+{directCommission} GRAM</span>
                  </div>

                  {/* Purchase Action Buttons */}
                  <div className="space-y-2">
                    <motion.button
                      onClick={() => handleBuy(nft)}
                      disabled={isMaxOwned || buyingId === nft.id}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                        isMaxOwned
                          ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                          : isTitan
                          ? 'bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 text-black shadow-[0_0_25px_rgba(245,158,11,0.4)]'
                          : isMega
                          ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-black shadow-[0_0_20px_rgba(249,115,22,0.3)]'
                          : isTurbo
                          ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                          : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                      }`}
                    >
                      {buyingId === nft.id ? (
                        <><RefreshCw size={14} className="animate-spin" /> Activating Miner...</>
                      ) : isMaxOwned ? (
                        <>Max Limit Reached ({ownedCount}/{maxAllowed})</>
                      ) : (
                        <><Zap size={14} /> Buy with Vault Balance ({nft.price_gram} GRAM)</>
                      )}
                    </motion.button>

                    <button
                      onClick={() => handlePayViaWallet(nft.price_gram, 'tonkeeper')}
                      className="w-full py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-98"
                    >
                      <ExternalLink size={13} />
                      <span>Pay {nft.price_gram} GRAM with Tonkeeper / TON Wallet</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : activeTab === 'inventory' ? (
          /* ========================================================= */
          /* TAB 2: MY INVENTORY & CLAIM YIELD                         */
          /* ========================================================= */
          <motion.div 
            key="inventory" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            className="space-y-4"
          >
            {myCards.length === 0 ? (
              <div className="py-16 text-center space-y-4 bg-gradient-to-b from-[#180f33] to-[#0a051d] border border-white/10 rounded-3xl p-6">
                <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
                  <Gem size={28} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">No Active NFT Miners</h3>
                  <p className="text-xs text-white/60 max-w-xs mx-auto mt-1">
                    You haven't activated any NFT Digital Miners yet. Browse the Marketplace to deploy your first mining rig!
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
                >
                  Browse Marketplace →
                </button>
              </div>
            ) : (
              myCards.map((card) => {
                const claimsDone = card.claims_done || 0;
                const durationDays = card.duration_days || 10;
                const pct = Math.min((claimsDone / durationDays) * 100, 100);
                const isMaxedOut = claimsDone >= durationDays;

                return (
                  <div 
                    key={card.instance_id} 
                    className="p-5 rounded-3xl bg-gradient-to-b from-[#180f33] to-[#0a051d] border border-indigo-500/30 shadow-lg space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                          {card.nft_id === 4 ? <Crown size={20} className="text-amber-300" /> : card.nft_id === 3 ? <Flame size={20} className="text-orange-400" /> : card.nft_id === 2 ? <Rocket size={20} /> : <Zap size={20} />}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">{card.name}</h4>
                          <p className="text-[11px] font-mono text-emerald-400">+{card.daily_yield_gram} GRAM/day</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                        isMaxedOut
                          ? 'bg-white/10 text-white/50 border-white/10'
                          : card.can_claim
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse'
                          : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      }`}>
                        {isMaxedOut ? 'Completed' : card.can_claim ? 'Ready to Claim' : 'Mining Active'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-white/50 text-[11px]">Yield Lifecycle</span>
                        <span className="text-indigo-300 font-mono text-[11px]">{claimsDone} / {durationDays} Days</span>
                      </div>
                      <div className="w-full h-2.5 bg-black/50 rounded-full overflow-hidden border border-white/10 p-0.5">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Action & Yield Status */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div>
                        <p className="text-[10px] font-bold text-white/40 uppercase">Total Earned</p>
                        <p className="text-xs font-mono font-black text-emerald-400">
                          +{Number(card?.total_earned_gram || 0).toFixed(3)} GRAM
                        </p>
                      </div>

                      {isMaxedOut ? (
                        <span className="text-xs font-bold text-white/40">10/10 Days Complete ✓</span>
                      ) : card.can_claim ? (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleClaim(card.instance_id)}
                          disabled={claimingId === card.instance_id}
                          className="bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-black text-xs px-4 py-2.5 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-1.5"
                        >
                          {claimingId === card.instance_id ? (
                            <><RefreshCw size={12} className="animate-spin" /> Claiming...</>
                          ) : (
                            <><Sparkles size={13} /> Claim +{card.daily_yield_gram} GRAM</>
                          )}
                        </motion.button>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                          <Clock size={12} />
                          <span>{renderCountdown(card.next_claim_seconds)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        ) : (
          /* ========================================================= */
          /* TAB 3: DEPOSIT GRAM                                       */
          /* ========================================================= */
          <motion.div 
            key="deposit" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            className="space-y-4"
          >
            {/* Quick 1-Tap Tonkeeper Presets */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-[#130d29] to-[#0c081c] border border-indigo-500/30 space-y-3">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-black uppercase tracking-wider">
                <Zap size={14} className="text-cyan-400" /> 1-Tap Tonkeeper Top-Up
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[1.0, 5.0, 10.0, 50.0].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handlePayViaWallet(amt, 'tonkeeper')}
                    className="py-3 px-3 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-white font-black text-xs flex items-center justify-between transition-all active:scale-95"
                  >
                    <span>{amt.toFixed(1)} GRAM</span>
                    <span className="text-[10px] text-indigo-300 font-mono">Tonkeeper 💎</span>
                  </button>
                ))}
              </div>
              <p className="text-[10.5px] text-white/60 font-medium text-center">
                Auto-fills recipient address, exact amount, and your personal verification memo!
              </p>
            </div>

            {/* Manual Deposit Details */}
            <div className="p-5 rounded-3xl bg-black/40 border border-white/10 space-y-4">
              <p className="text-xs font-black text-white uppercase tracking-wider">Manual Deposit Address & Memo</p>

              {/* Step 1: Wallet Address */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-white/50 uppercase">Tasky Deposit Wallet</p>
                <div className="flex items-center justify-between bg-black/60 p-3 rounded-2xl border border-white/10 gap-2">
                  <p className="text-xs font-mono text-white truncate flex-1">{depositWallet}</p>
                  <button
                    onClick={() => copyToClipboard(depositWallet, 'wallet')}
                    className="shrink-0 p-2 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 transition-all active:scale-95"
                  >
                    {copiedWallet ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Step 2: Memo */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-amber-400 uppercase">Required Memo / Comment</p>
                <div className="flex items-center justify-between bg-amber-500/10 p-3 rounded-2xl border border-amber-500/30 gap-2">
                  <p className="text-xs font-mono font-black text-amber-300 truncate">{memoText}</p>
                  <button
                    onClick={() => copyToClipboard(memoText, 'memo')}
                    className="shrink-0 p-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-all active:scale-95"
                  >
                    {copiedMemo ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-[10.5px] text-amber-300/80 font-semibold leading-tight">
                  ⚠️ Always include your memo comment in the transfer so the blockchain verifies your account automatically.
                </p>
              </div>

              {/* Auto Verifier */}
              <motion.button
                onClick={handleAutoVerifyDeposit}
                disabled={verifyingDeposit}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(160,185,129,0.3)] transition-all"
              >
                {verifyingDeposit ? (
                  <><RefreshCw size={14} className="animate-spin" /> Verifying on Blockchain...</>
                ) : (
                  <><Zap size={14} /> Verify Deposit Automatically ⚡</>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3-LEVEL TEAM COMMISSION MODAL ── */}
      {showCommModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gradient-to-b from-[#1b103c] to-[#090417] p-5 rounded-3xl border border-amber-500/40 w-full max-w-sm shadow-2xl relative space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xs text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy size={14} /> 3-Level Team Rewards Chart
              </h3>
              <button
                onClick={() => setShowCommModal(false)}
                className="text-white/60 hover:text-white px-2.5 py-1 rounded-xl bg-white/10 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-[10px] font-black text-white/60 uppercase">
                    <th className="p-2.5">Miner</th>
                    <th className="p-2.5">Price</th>
                    <th className="p-2.5 text-amber-300">L1 (30%)</th>
                    <th className="p-2.5 text-purple-300">L2 (10%)</th>
                    <th className="p-2.5 text-indigo-300">L3 (4%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px] text-white">
                  <tr className="bg-amber-500/15">
                    <td className="p-2.5 font-bold text-amber-300 flex items-center gap-1"><Crown size={12} /> Titan God</td>
                    <td className="p-2.5 text-amber-300 font-black">50.00 G</td>
                    <td className="p-2.5 text-emerald-400 font-black">+15.00</td>
                    <td className="p-2.5 text-purple-300">+5.00</td>
                    <td className="p-2.5 text-indigo-300">+2.00</td>
                  </tr>
                  <tr className="bg-orange-500/10">
                    <td className="p-2.5 font-bold text-orange-300">Mega</td>
                    <td className="p-2.5 text-amber-300 font-black">5.00 G</td>
                    <td className="p-2.5 text-emerald-400 font-black">+1.50</td>
                    <td className="p-2.5 text-purple-300">+0.50</td>
                    <td className="p-2.5 text-indigo-300">+0.20</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setShowCommModal(false)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black text-xs uppercase tracking-wider shadow-lg active:scale-98 transition-all"
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

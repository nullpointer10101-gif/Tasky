import React, { useState, useEffect } from 'react';
import { showRewardedAd } from '../adUtils';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRightLeft, History,
  CheckCircle2, Clock, Wallet as WalletIcon, ExternalLink, Coins,
  Lock, X, ArrowDown, Gem, ShieldCheck, AlertCircle, Loader2, ArrowUpRight, Copy, RefreshCw
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { getSwapRates, requestSwap, getSwapHistory, saveWalletAddress, getWithdrawalSettings, notifyUsdtUnlock, watchWithdrawalAd, getGramCurrencyBalance, requestGramWithdrawal, verifyGramSuffix } from '../api';
import triggerConfetti from '../confetti';
import { useToast } from '../App';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import WalletDopamineTerminal from '../components/WalletDopamineTerminal';
import { useIsAdmin } from '../AdminContext';

const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

export default function Wallet({ user, refreshUser, navigate }) {
  const [activeTab, setActiveTab] = useState('withdraw');
  const [rates, setRates] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [swapAmount, setSwapAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [withdrawalSettings, setWithdrawalSettings] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState('USDT');
  const [isUsdtTeaserOpen, setIsUsdtTeaserOpen] = useState(false);
  const [isNotified, setIsNotified] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [showAdRequirement, setShowAdRequirement] = useState(false);
  const [localAdsWatched, setLocalAdsWatched] = useState(user?.withdrawal_ads_watched || 0);
  const [adCooldown, setAdCooldown] = useState(0);
  
  // ── GRAM WITHDRAWAL STATE ──
  const [gramInfo, setGramInfo] = useState(null);
  const [withdrawGramAmount, setWithdrawGramAmount] = useState('');
  const [isWithdrawingGram, setIsWithdrawingGram] = useState(false);
  const [suffixOk, setSuffixOk] = useState(false);
  const [suffixChecking, setSuffixChecking] = useState(false);
  const [suffixCopied, setSuffixCopied] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (user) {
      setLocalAdsWatched(user.withdrawal_ads_watched || 0);
    }
  }, [user?.withdrawal_ads_watched]);
  
  useEffect(() => {
    let interval;
    if (adCooldown > 0) {
      interval = setInterval(() => {
        setAdCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [adCooldown]);
  
  useEffect(() => {
    if (isUsdtTeaserOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isUsdtTeaserOpen]);

  const [walletInput, setWalletInput] = useState('');
  const [isSavingWallet, setIsSavingWallet] = useState(false);
  const tonAddressRaw = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const walletAddress = tonAddressRaw || user?.wallet_address;
  const isConnected = !!tonAddressRaw;

  useEffect(() => {
    if (tonAddressRaw && tonAddressRaw !== user?.wallet_address) {
       saveWalletAddress(user?.telegram_id || '123456', tonAddressRaw).then(() => refreshUser());
    }
  }, [tonAddressRaw, user?.wallet_address]);

  useEffect(() => { fetchData(); }, [user, activeTab]);

  const handleSaveWallet = async () => {
    if (!walletInput || walletInput.length < 20 || !walletInput.startsWith('0x')) {
      return showToast('Please enter a valid BSC (BEP-20) address starting with 0x', 'error');
    }
    
    try {
      setIsSavingWallet(true);
      const { error } = await saveWalletAddress(user?.telegram_id || '123456', walletInput);
      if (error) {
        showToast(error, 'error');
      } else {
        showToast('Wallet address saved successfully', 'success');
        refreshUser();
      }
    } catch (err) {
      console.error('saveWalletAddress catch:', err);
      showToast(err.message || 'Error saving wallet address', 'error');
    } finally {
      setIsSavingWallet(false);
    }
  };

  const fetchGramData = async () => {
    if (!user?.telegram_id) return;
    try {
      const [gramRes, suffixRes] = await Promise.all([
        getGramCurrencyBalance(user.telegram_id),
        verifyGramSuffix(user.telegram_id)
      ]);
      if (gramRes?.data) setGramInfo(gramRes.data);
      if (suffixRes?.data) setSuffixOk(!!suffixRes.data.has_suffix);
    } catch (e) {
      console.error('Error fetching GRAM wallet info:', e);
    }
  };

  const checkSuffixLive = async (silent = false) => {
    if (!user?.telegram_id) return false;
    setSuffixChecking(true);
    try {
      const { data, error } = await verifyGramSuffix(user.telegram_id);
      if (error) {
        setSuffixOk(false);
        if (!silent) showToast(error, 'error');
        return false;
      }
      const ok = !!data?.has_suffix;
      setSuffixOk(ok);
      if (!silent) {
        if (ok) showToast('✅ Name suffix confirmed!', 'success');
        else showToast("Suffix not found in your Telegram name. Please add '| Tasky 🐾' to your name.", 'error');
      }
      return ok;
    } catch (e) {
      setSuffixOk(false);
      return false;
    } finally {
      setSuffixChecking(false);
    }
  };

  const copySuffix = () => {
    navigator.clipboard.writeText('| Tasky 🐾').then(() => {
      setSuffixCopied(true);
      setTimeout(() => setSuffixCopied(false), 2500);
      showToast('Suffix copied! Add to your Telegram name.', 'success');
    }).catch(() => showToast('Copy failed – paste manually: | Tasky 🐾', 'error'));
  };

  const handleWithdrawGram = async () => {
    if (!isConnected && !gramInfo?.gram_wallet_address) {
      try { tonConnectUI.openModal(); } catch(e){}
      return;
    }
    const amt = parseFloat(withdrawGramAmount);
    if (!amt || amt < 0.01) { showToast('Minimum withdrawal is 0.01 GRAM', 'error'); return; }
    const maxLimit = gramInfo?.max_withdrawal || 0.02;
    if (amt > maxLimit) { 
      showToast(`Daily limit for this tier is ${maxLimit} GRAM.`, 'error'); 
      return; 
    }
    if (gramInfo?.has_reached_daily_limit || (gramInfo?.withdrawals_today_count || 0) >= 1) {
      showToast('Daily limit reached! Only 1 withdrawal allowed per day.', 'error');
      return;
    }
    if (amt > (gramInfo?.gram_balance || 0)) { showToast('Insufficient GRAM balance', 'error'); return; }

    const ok = await checkSuffixLive(true);
    if (!ok) {
      showToast("Verification failed. Please add '| Tasky 🐾' to your Telegram name before withdrawing!", 'error');
      return;
    }

    setIsWithdrawingGram(true);
    try {
      const { data, error } = await requestGramWithdrawal(user?.telegram_id, amt);
      if (error) showToast(error, 'error');
      else if (data?.success) {
        showToast('GRAM withdrawal request submitted successfully!', 'success');
        triggerConfetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setWithdrawGramAmount('');
        fetchGramData();
        refreshUser();
      }
    } catch { showToast('Connection error. Please try again.', 'error'); }
    finally { setIsWithdrawingGram(false); }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'swap') {
        const { data } = await getSwapRates();
        if (data) setRates(data);
      } else if (activeTab === 'withdraw') {
        const { data } = await getWithdrawalSettings();
        if (data) setWithdrawalSettings(data);
        await fetchGramData();
      } else {
        const { data } = await getSwapHistory(user?.telegram_id || '123456');
        if (data) setHistory(data);
      }
    } catch (err) {
      console.error('Wallet fetchData error:', err);
      showToast(err.message || 'Error loading wallet data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const usdtRate = rates.find(r => r.token_name === 'USDT' && r.is_active);
  const taskyPerUsdt = usdtRate ? Number(usdtRate.tasky_per_unit) : 20000;
  
  const currentRate = rates.find(r => r.token_name === selectedDestination) || usdtRate;
  const taskyPerUnit = currentRate ? Number(currentRate.tasky_per_unit) : 20000;
  const minSwap = currentRate ? Number(currentRate.min_tasky) : 20000;
  

    
  const isSelectedActive = currentRate ? Boolean(currentRate.is_active) : false;
  
  const balance = Number(user?.balance || 0);
  const amount = Number(swapAmount || 0);
  const receiveAmount = swapAmount ? (amount / taskyPerUnit).toFixed(4) : '0.0000';
  
  const totalRefs = user?.valid_referrals || 0;
  const hasEnoughAds = localAdsWatched >= 1000;
  const hasEnoughRefs = totalRefs >= 20;
  const meetsSwapRequirements = hasEnoughAds || hasEnoughRefs;

  const hasPendingSwap = history.some(h => h.status === 'pending');

  const handleSwap = async () => {
    if (!isConnected) {
      try {
        tonConnectUI.openModal();
      } catch (e) {
        console.error('Failed to open TON Connect modal:', e);
        showToast('Connect your wallet first', 'error');
      }
      return;
    }
    if (!swapAmount || Number(swapAmount) < minSwap) {
      return showToast(`Minimum swap is ${minSwap} TASKY`, 'error');
    }
    if (Number(swapAmount) > balance) {
      return showToast('Insufficient balance', 'error');
    }
    
    if (hasPendingSwap) return showToast('You already have a pending swap request.', 'error');

    try {
      setIsSwapping(true);
      const { data, error } = await requestSwap({ 
        telegram_id: user?.telegram_id, 
        tasky_amount: Number(swapAmount),
        destination_token: selectedDestination
      });
      setIsSwapping(false);

      if (data && !error) {
        showToast('Swap request submitted successfully!');
        setSwapAmount('');
        setActiveTab('history');
        refreshUser();
      } else {
        showToast(error || 'Failed to request swap', 'error');
      }
    } catch (err) {
      console.error('handleSwap catch:', err);
      setIsSwapping(false);
      showToast(err.message || 'An error occurred during swap', 'error');
    }
  };

  const handleWatchAd = async () => {
    try {
      setIsWatchingAd(true);
      const adResult = await showRewardedAd('main');
      if (!adResult.success) {
        showToast(adResult.error || 'Failed to complete ad', 'error');
        return;
      }
      
      setLocalAdsWatched(prev => prev + 1);
      
      const { data, error } = await watchWithdrawalAd(user?.telegram_id);
      if (data && !error) {
        showToast(`Ad watched! ${data.withdrawal_ads_watched} / 1000 completed`, 'success');
        refreshUser();
      } else {
        showToast(error || 'Failed to update ad progress', 'error');
      }
    } catch (e) {
      showToast(e.message || 'You must watch the entire ad to get credit.', 'error');
    } finally {
      setIsWatchingAd(false);
      setAdCooldown(30);
    }
  };

  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const tabs = [
    { id: 'withdraw', label: 'Withdraw', icon: WalletIcon },
    { id: 'swap', label: 'Swap', icon: ArrowRightLeft },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="p-4 space-y-4 pb-20 min-h-full relative">
      <WalletDopamineTerminal
        user={user}
        balance={user?.balance || 0}
        swapRates={rates}
        onWatchAdSuccess={refreshUser}
        showToast={showToast}
      />

      <div className="flex bg-surface-soft p-1 rounded-pill relative mb-2 shadow-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold z-10 transition-colors ${activeTab === tab.id ? 'text-ink' : 'text-ink-soft hover:text-ink'}`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
        <motion.div
          layoutId="walletTabIndicator"
          className="absolute top-1 bottom-1 w-[calc(33.333%-3px)] bg-surface rounded-2xl shadow-md border border-border"
          initial={false}
          animate={{ left: activeTab === 'withdraw' ? '4px' : activeTab === 'swap' ? 'calc(33.333%)' : 'calc(66.666%)' }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      </div>

      <div className="relative">
        {activeTab === 'withdraw' ? (
          <motion.div className="space-y-4 flex flex-col min-h-full">
            {/* ── 1. GRAM CURRENCY CASHOUT CARD ── */}
            <div className="p-5 rounded-3xl relative overflow-hidden bg-gradient-to-br from-emerald-950/40 via-[#130d29] to-[#0c081c] border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none" />
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Gem size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Instant TON Cashout</p>
                    <h3 className="text-sm font-black text-white">GRAM Currency</h3>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[9px] font-black uppercase text-white/40">Available</p>
                  <p className="text-base font-black text-emerald-300">
                    {parseFloat(gramInfo?.gram_balance || 0).toFixed(4)} <span className="text-[10px] text-emerald-400/60">GRAM</span>
                  </p>
                </div>
              </div>

              {/* Input Row */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={withdrawGramAmount}
                      onChange={e => setWithdrawGramAmount(e.target.value)}
                      placeholder="Min 0.01 GRAM"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm font-bold placeholder-white/20 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <button
                    onClick={() => setWithdrawGramAmount(String(gramInfo?.gram_balance || 0))}
                    className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black hover:bg-emerald-500/20 active:scale-95 transition-all"
                  >
                    MAX
                  </button>
                </div>

                <div className="flex justify-between items-center text-[10px] font-bold text-emerald-400/70 px-1">
                  <span>Daily Limit: 1 / Day (Max {gramInfo?.max_withdrawal || 0.02} GRAM)</span>
                  {gramInfo?.withdrawals_today_count !== undefined && (
                    <span>Today: {gramInfo.withdrawals_today_count}/1</span>
                  )}
                </div>

                {/* Suffix Live Badge */}
                {suffixOk ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                      <span className="text-[11px] text-emerald-300 font-bold">Name Suffix Confirmed (| Tasky) ✓</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-amber-400 shrink-0" />
                      <span className="text-[10.5px] text-amber-300 font-bold">Requires | Tasky in Telegram Name</span>
                    </div>
                    <button
                      onClick={copySuffix}
                      className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-lg font-black"
                    >
                      Copy Suffix
                    </button>
                  </div>
                )}

                {/* Submit button */}
                <button
                  onClick={handleWithdrawGram}
                  disabled={isWithdrawingGram || !withdrawGramAmount || parseFloat(withdrawGramAmount) < 0.01 || gramInfo?.has_reached_daily_limit}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                >
                  {isWithdrawingGram ? (
                    <><Loader2 size={16} className="animate-spin" /> Processing...</>
                  ) : gramInfo?.has_reached_daily_limit ? (
                    <><Clock size={16} /> Daily Limit Reached (1/1)</>
                  ) : (
                    <><ArrowUpRight size={16} /> Withdraw to Connected TON Wallet</>
                  )}
                </button>
              </div>

              {/* Recent Withdrawals */}
              {gramInfo?.history?.length > 0 && (
                <div className="mt-3.5 space-y-1.5 border-t border-white/5 pt-3">
                  <p className="text-[9.5px] font-black uppercase tracking-widest text-white/30">Recent GRAM Withdrawals</p>
                  {gramInfo.history.slice(0, 3).map(w => (
                    <div
                      key={w.id}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs border ${
                        w.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20' :
                        w.status === 'rejected' ? 'bg-red-500/10 border-red-500/20' :
                        'bg-amber-500/10 border-amber-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {w.status === 'approved' ? <CheckCircle2 size={12} className="text-emerald-400" /> :
                         w.status === 'rejected' ? <AlertCircle size={12} className="text-red-400" /> :
                         <Clock size={12} className="text-amber-400" />}
                        <span className={`font-black ${w.status === 'approved' ? 'text-emerald-400' : w.status === 'rejected' ? 'text-red-400' : 'text-amber-400'}`}>
                          {w.amount} GRAM
                        </span>
                      </div>
                      <span className="text-[10px] text-white/40 capitalize">{w.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── 2. TASKY ON-CHAIN TOKEN ROADMAP ── */}
            <div className="w-full bg-surface border border-border rounded-3xl p-5 space-y-4 text-left shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-ink">TASKY Token Launch Roadmap</h3>
                  <p className="text-xs text-ink-soft">On-Chain TON Deployment in progress</p>
                </div>
                <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-black uppercase">
                  Stage 2/4
                </span>
              </div>

              <div className="space-y-3.5 relative before:absolute before:inset-y-2 before:left-[11px] before:w-[2px] before:bg-border">
                <div className="relative flex items-center gap-4 z-10">
                  <div className="w-6 h-6 rounded-full bg-success-soft border border-success flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={12} className="text-success" />
                  </div>
                  <span className="text-sm font-bold text-ink">Community Growth</span>
                </div>
                <div className="relative flex items-center gap-4 z-10">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  </div>
                  <span className="text-sm font-bold text-ink">Smart Contract Deployment</span>
                </div>
                <div className="relative flex items-center gap-4 z-10 opacity-50">
                  <div className="w-6 h-6 rounded-full bg-surface-soft border border-border flex items-center justify-center flex-shrink-0">
                    <Lock size={10} className="text-ink-soft" />
                  </div>
                  <span className="text-sm font-medium text-ink-soft">Liquidity Pool</span>
                </div>
                <div className="relative flex items-center gap-4 z-10 opacity-50">
                  <div className="w-6 h-6 rounded-full bg-surface-soft border border-border flex items-center justify-center flex-shrink-0">
                    <Lock size={10} className="text-ink-soft" />
                  </div>
                  <span className="text-sm font-medium text-ink-soft">Withdrawals Unlock</span>
                </div>
              </div>

              <Button
                onClick={() => setActiveTab('swap')}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow-lg shadow-indigo-500/25 mt-2"
              >
                Instant Swap to USDT &rarr;
              </Button>
            </div>
          </motion.div>
        ) : activeTab === 'swap' ? (
          <motion.div    className="space-y-4 flex flex-col min-h-full">
            
            {/* The Huge Input Card */}
            <div className="bg-surface border border-border rounded-[2rem] p-6 shadow-sm flex flex-col items-center relative z-10">
              <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-indigo-500/5 to-transparent" />
              </div>
              
              <span className="text-xs font-bold text-ink-soft tracking-widest uppercase mb-1 z-10">You Send</span>
              
              <div className="flex flex-col items-center justify-center w-full z-10">
                <input
                  type="number"
                  value={swapAmount}
                  onChange={e => setSwapAmount(e.target.value)}
                  placeholder="0"
                  className="w-full text-center bg-transparent text-5xl font-black text-ink focus:outline-none placeholder:text-ink-faint py-2"
                />
                
                <div className="flex items-center gap-1 bg-surface-soft border border-border rounded-full p-1 mt-4 shadow-inner">
                  <span className="text-xs font-black text-ink px-3 py-1">TASKY</span>
                  <div className="w-[1px] h-4 bg-border" />
                  <button
                    onClick={() => setSwapAmount(String(Math.floor(balance)))}
                    className="text-xs font-bold text-indigo-500 hover:bg-indigo-500/10 px-3 py-1 rounded-full active:scale-95 transition-all"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="text-xs font-medium text-ink-soft mt-4 z-10">
                Balance: {Math.floor(balance).toLocaleString()} TASKY
              </div>
            </div>

            <div className="flex justify-center -my-4 relative z-30 pointer-events-none">
              <div className="w-10 h-10 bg-surface border border-border rounded-full flex items-center justify-center shadow-md">
                <ArrowDown size={18} className="text-indigo-500" />
              </div>
            </div>

            {/* The Receive Card */}
            <div className="bg-surface-soft border border-border rounded-[2rem] p-6 flex flex-col items-center relative z-10 mt-0">
              <span className="text-xs font-bold text-ink-soft tracking-widest uppercase mb-2">You Receive</span>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl font-black text-success">≈ {receiveAmount}</span>
              </div>
              
              <div
                className="flex items-center gap-2 mt-4 bg-surface px-5 py-2.5 rounded-2xl border border-border shadow-sm"
              >
                <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center shadow-inner">
                  <span className="text-white text-[10px] font-black">₮</span>
                </div>
                <span className="text-sm font-black text-ink">USDT (TON)</span>
              </div>

              <div className="text-[10px] text-ink-faint font-medium mt-4 bg-surface/50 px-3 py-1 rounded-full border border-border/50">
                Rate: {taskyPerUnit} TASKY = 1 USDT
              </div>
            </div>

            {/* Wallet Connect / Action Area */}
            <div className="pt-2 flex-1 flex flex-col justify-end">
              {!isConnected ? (
                <div className="bg-surface border border-border rounded-[2rem] p-5 shadow-sm space-y-4 ">
                  <div className="text-center">
                    <h3 className="font-black text-ink text-sm mb-1">Bind Destination Wallet</h3>
                    <p className="text-xs text-ink-soft mb-4">Connect your TON wallet to receive funds</p>
                  </div>
                  <Button
                    onClick={() => tonConnectUI.openModal()}
                    className="w-full font-black py-4 rounded-2xl active:scale-95 transition-all bg-[#0098EA] text-white shadow-lg /30"
                  >
                    Connect TON Wallet
                  </Button>
                </div>
              ) : (
                <div className="bg-surface-soft border border-border rounded-2xl p-4 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0098EA]/10 flex items-center justify-center">
                      <WalletIcon size={14} className="text-[#0098EA]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-ink-soft">TON Address Linked</span>
                      <span className="font-mono text-xs font-black text-ink">{truncateAddress(walletAddress)}</span>
                    </div>
                  </div>
                  <CheckCircle2 size={16} className="text-success" />
                </div>
              )}
              
              <div className="flex items-center justify-center gap-4 mt-6 mb-2 ">
                <div className="flex items-center gap-1.5 bg-success/10 border border-success/20 px-3 py-1.5 rounded-full shadow-sm">
                  <Clock size={12} className="text-success" />
                  <span className="text-[10px] font-black text-success uppercase tracking-wider">3 Min Arrival</span>
                </div>
                <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full shadow-sm">
                  <Lock size={12} className="text-indigo-500" />
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">1 Swap / Day</span>
                </div>
              </div>
            </div>

            {/* Action Button / Requirement UI */}
            <div className="w-full z-30 pt-2 pb-2 space-y-4">
              
              {!meetsSwapRequirements && balance >= minSwap && (
                <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-ink-soft tracking-wider text-center uppercase">Complete one task to unlock Swap</h3>
                  
                  {/* Task 1: Ads */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-ink">Watch Ads</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-indigo-500">{localAdsWatched} / 1000</span>
                        <button 
                          onClick={handleWatchAd}
                          disabled={isWatchingAd || adCooldown > 0}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold active:scale-95 transition-transform ${isWatchingAd || adCooldown > 0 ? 'bg-indigo-500/50 text-white/70' : 'bg-indigo-500 text-white'}`}
                        >
                          {isWatchingAd ? 'Watching...' : adCooldown > 0 ? `Wait (${adCooldown}s)` : 'Watch'}
                        </button>
                      </div>
                    </div>
                    <div className="h-1.5 bg-surface-soft rounded-full overflow-hidden border border-border">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (localAdsWatched / 1000) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="h-[1px] flex-1 bg-border" />
                    <span className="text-[10px] font-black text-ink-faint uppercase">OR</span>
                    <div className="h-[1px] flex-1 bg-border" />
                  </div>

                  {/* Task 2: Referrals */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-ink">Invite Friends</span>
                      <span className="font-black text-teal-500">{totalRefs} / 20</span>
                    </div>
                    <div className="h-1.5 bg-surface-soft rounded-full overflow-hidden border border-border">
                      <div 
                        className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (totalRefs / 20) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {!isSelectedActive ? (
                <Button 
                  onClick={() => setIsUsdtTeaserOpen(true)}
                  className="w-full font-black py-4 rounded-2xl active:scale-95 transition-all bg-surface border border-border text-ink "
                >
                  <Lock size={16} className="inline mr-2 -mt-1" />
                  Unlocking Soon
                </Button>
              ) : hasPendingSwap ? (
                <div className="w-full py-4 rounded-2xl bg-warning font-black text-white text-center ">
                  Pending Swap in Progress
                </div>
              ) : (
                <Button
                  onClick={handleSwap}
                  disabled={isSwapping || !isConnected || !swapAmount || Number(swapAmount) < minSwap || Number(swapAmount) > balance || !meetsSwapRequirements}
                  className={`w-full font-black py-4 rounded-2xl active:scale-95 transition-all  ${
                    (!isConnected || !swapAmount || Number(swapAmount) < minSwap || Number(swapAmount) > balance || !meetsSwapRequirements)
                      ? 'bg-surface border border-border text-ink-faint shadow-none'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                  }`}
                >
                  {isSwapping ? 'Processing...' : 
                   !isConnected ? 'Connect Wallet First' :
                   !meetsSwapRequirements ? 'Complete Requirements to Swap' :
                   !swapAmount ? 'Enter Amount' :
                   Number(swapAmount) < minSwap ? `Minimum ${minSwap} TASKY` :
                   Number(swapAmount) > balance ? 'Insufficient Balance' :
                   'Swipe to Swap →'}
                </Button>
              )}
            </div>

          </motion.div>
        ) : (
          history.length === 0 ? (
            <EmptyState title="No swaps yet" message="Your swap history will appear here after your first swap." />
          ) : (
            <motion.div    className="space-y-3 mt-4">
              {history.map((item, idx) => (
                <Card key={idx} className="flex flex-col gap-2 border-border rounded-3xl p-5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
                        <ArrowRightLeft size={18} />
                      </div>
                      <div className="pt-0.5">
                         <h3 className="font-black text-ink text-sm leading-tight">Swap to USDT</h3>
                        <p className="text-[10px] text-ink-soft leading-tight font-medium mt-1">{new Date(item.requested_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-ink text-sm">-{item.tasky_amount} TASKY</p>
                      {item.receive_amount && <p className="text-xs text-success font-black mt-0.5">+{Number(item.receive_amount).toFixed(4)} USDT</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <div>
                      {item.status === 'pending' && <span className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 bg-warning-soft text-warning rounded-lg uppercase tracking-widest font-black"><Clock size={10}/> Pending</span>}
                      {item.status === 'done' && <span className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 bg-success-soft text-success rounded-lg uppercase tracking-widest font-black"><CheckCircle2 size={10}/> Done</span>}
                    </div>
                    {item.tx_hash && (
                      <a href={`https://bscscan.com/tx/${item.tx_hash}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-black text-indigo-500 hover:text-indigo-400 transition-colors bg-indigo-500/5 px-2.5 py-1 rounded-lg">
                        View TX <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </Card>
              ))}
            </motion.div>
          )
        )}
      </div>

      {isUsdtTeaserOpen ? createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 "
              onClick={() => setIsUsdtTeaserOpen(false)}
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="relative w-full max-w-sm bg-surface rounded-[2.5rem] p-8 border border-border shadow-2xl flex flex-col z-10"
            >
              <button onClick={() => setIsUsdtTeaserOpen(false)} className="absolute top-5 right-5 p-2 bg-surface-soft rounded-full text-ink-soft active:scale-95 transition-transform">
                <X size={20} />
              </button>
              
              <div className="flex flex-col items-center mt-4 text-center">
                <div className="relative flex items-center justify-center w-24 h-24 mb-4">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    className="absolute inset-0 bg-indigo-500/20 rounded-full" 
                  />
                  <div className="w-16 h-16 bg-surface-soft border border-border rounded-full flex items-center justify-center relative z-10">
                    <Coins size={28} className="text-indigo-500" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-surface rounded-full p-1 z-20">
                    <div className="bg-indigo-500 text-white rounded-full p-1">
                      <Lock size={12} />
                    </div>
                  </div>
                </div>
                
                <h2 className="text-2xl font-black text-ink mb-2">USDT Swap — Coming Soon</h2>
                
                <div className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg mb-4 bg-indigo-500/10 text-indigo-500">
                  Unlocking in Phase 2
                </div>
                
                <p className="text-sm font-medium text-ink-soft mb-8 px-4 leading-relaxed">
                  Soon you'll be able to swap your TASKY directly for USDT. Stay tuned for the unlock.
                </p>

                <Button 
                  onClick={async () => {
                    if (isNotified) return;
                    if (window.Telegram?.WebApp?.HapticFeedback) {
                      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                    }
                    await notifyUsdtUnlock(user?.telegram_id || '123456');
                    setIsNotified(true);
                  }}
                  disabled={isNotified}
                  className={`w-full py-4 rounded-2xl font-black text-base transition-all ${
                    isNotified 
                      ? 'bg-success-soft text-success' 
                      : 'bg-ink text-surface active:scale-95'
                  }`}
                >
                  {isNotified ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 size={18} />
                      We'll notify you!
                    </div>
                  ) : (
                    'Notify Me When Live'
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      ) : null}
    </div>
  );
}

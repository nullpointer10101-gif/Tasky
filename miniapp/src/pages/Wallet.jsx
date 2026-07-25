import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRightLeft, History,
  CheckCircle2, Clock, Zap, Shield,
  BadgeCheck, Wallet as WalletIcon, ExternalLink, Coins,
  Lock, ChevronDown, ChevronUp, X
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { getSwapRates, requestSwap, getSwapHistory, saveWalletAddress, getWithdrawalSettings, notifyUsdtUnlock, watchWithdrawalAd } from '../api';
import { useToast } from '../App';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';

const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const KEY_POINTS = [
  {
    icon: Zap,
    accentColor: '#eab308',
    badgeBg: 'bg-yellow-100',
    badgeText: 'text-yellow-700',
    tag: '24/7',
    title: 'Fast Processing',
    desc: 'Swaps are processed quickly and sent to your connected wallet.',
    cardBg: 'bg-yellow-50',
  },
  {
    icon: Shield,
    accentColor: '#3b82f6',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    tag: 'TON ONLY',
    title: 'TON Network Only',
    desc: 'Swaps are securely powered by the TON blockchain.',
    cardBg: 'bg-blue-50',
  },
  {
    icon: BadgeCheck,
    accentColor: '#10b981',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    tag: 'TASKY',
    title: 'Direct to Wallet',
    desc: 'All payouts are made directly to your connected TON wallet address.',
    cardBg: 'bg-emerald-50',
  }
];

export default function Wallet({ user, refreshUser }) {
  const [activeTab, setActiveTab] = useState('withdraw');
  const [rates, setRates] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [swapAmount, setSwapAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [withdrawalSettings, setWithdrawalSettings] = useState(null);
  const [isRulesExpanded, setIsRulesExpanded] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState('DOGS');
  const [isUsdtTeaserOpen, setIsUsdtTeaserOpen] = useState(false);
  const [isNotified, setIsNotified] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [showAdRequirement, setShowAdRequirement] = useState(false);
  const { showToast } = useToast();
  
  // Lock body scroll when modal is open
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

  const [tonConnectUI] = useTonConnectUI();
  const walletAddress = useTonAddress();
  const isConnected = !!walletAddress;

  useEffect(() => { fetchData(); }, [user, activeTab]);

  // Sync wallet address to backend when connected, if user object doesn't have it
  useEffect(() => {
    if (walletAddress && user && user.wallet_address !== walletAddress) {
      try {
        saveWalletAddress(user.telegram_id || '123456', walletAddress).then(async ({ error }) => {
          if (error) {
            showToast(error, 'error');
            await tonConnectUI.disconnect();
          } else {
            refreshUser();
          }
        }).catch(err => {
          console.error('saveWalletAddress catch:', err);
          showToast(err.message || 'Error saving wallet address', 'error');
        });
      } catch (err) {
        console.error('saveWalletAddress outer catch:', err);
        showToast(err.message || 'Error saving wallet address', 'error');
      }
    }
  }, [walletAddress, user, tonConnectUI, showToast, refreshUser]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'swap') {
        const { data } = await getSwapRates();
        if (data) setRates(data);
      } else if (activeTab === 'withdraw') {
        const { data } = await getWithdrawalSettings();
        if (data) setWithdrawalSettings(data);
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
  const taskyPerUsdt = usdtRate ? Number(usdtRate.tasky_per_unit) : 1000;
  
  const currentRate = rates.find(r => r.token_name === selectedDestination) || usdtRate;
  const taskyPerUnit = currentRate ? Number(currentRate.tasky_per_unit) : 1000;
  const minSwap = currentRate ? Number(currentRate.min_tasky) : 3000;
  const isSelectedActive = currentRate ? Boolean(currentRate.is_active) : false;
  
  const balance = Number(user?.balance || 0);
  const amount = Number(swapAmount || 0);
  const feePercent = 30;
  const netAmount = amount - (amount * (feePercent / 100));
  const receiveAmount = swapAmount ? (netAmount / taskyPerUnit).toFixed(4) : '0.0000';

  const hasPendingSwap = history.some(h => h.status === 'pending');

  const handleSwap = async () => {
    if (!isConnected) return showToast('Connect your wallet first', 'error');
    if (!swapAmount || Number(swapAmount) < minSwap) {
      return showToast(`Minimum swap is ${minSwap} TASKY`, 'error');
    }
    if (Number(swapAmount) > balance) {
      return showToast('Insufficient balance', 'error');
    }
    
    if ((user?.withdrawal_ads_watched || 0) < 50) {
      setShowAdRequirement(true);
      return;
    }
    
    if (hasPendingSwap) return showToast('You already have a pending swap request.', 'error');

    try {
      setIsSwapping(true);
      // Send request without explicit wallet_address because the backend handles it securely based on the user's connection.
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
    if (typeof window.showGiga === 'undefined') {
      return showToast('Ad network not loaded. Please try again later.', 'error');
    }
    try {
      setIsWatchingAd(true);
      const adStartTime = Date.now();
      await window.showGiga("main");
      if (Date.now() - adStartTime < 12000) {
        showToast('You must watch the ad for at least 15 seconds.', 'error');
        setIsWatchingAd(false);
        return;
      }
      
      const { data, error } = await watchWithdrawalAd(user?.telegram_id);
      if (data && !error) {
        showToast(`Ad watched! ${data.withdrawal_ads_watched} / 50 completed`, 'success');
        refreshUser();
      } else {
        showToast(error || 'Failed to update ad progress', 'error');
      }
    } catch (e) {
      showToast('You must watch the entire ad to get credit.', 'error');
    } finally {
      setIsWatchingAd(false);
    }
  };

  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getSwapButtonState = () => {
    if (!isConnected) return { text: 'CONNECT WALLET FIRST', disabled: true };
    if (hasPendingSwap) return { text: 'PENDING SWAP IN PROGRESS', disabled: true };
    if (!swapAmount || Number(swapAmount) <= 0) return { text: 'ENTER AMOUNT', disabled: true };
    if (Number(swapAmount) < minSwap) return { text: `MINIMUM ${minSwap} TASKY`, disabled: true };
    if (Number(swapAmount) > balance) return { text: 'INSUFFICIENT BALANCE', disabled: true };
    if (isSwapping) return { text: 'PROCESSING...', disabled: true };
    return { text: 'REQUEST SWAP', disabled: false };
  };

  const btnState = getSwapButtonState();

  const tabs = [
    { id: 'withdraw', label: 'Withdraw', icon: WalletIcon },
    { id: 'swap', label: 'Swap', icon: ArrowRightLeft },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="p-4 space-y-4 pb-24 h-full flex flex-col">
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-ink">Wallet</h1>
        <p className="text-sm text-ink-soft">Swap your TASKY to USDT</p>
      </div>

      <div className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700" />
        
        <div className="relative z-10 p-5">
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Available Balance</p>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-black tracking-tight text-white">{Math.floor(balance).toLocaleString()}</span>
            <span className="text-base font-bold text-white/70">TASKY</span>
          </div>
          <div className="flex items-center justify-between bg-white/10 border border-white/20 rounded-2xl px-3.5 py-2.5 ">
            <div className="flex items-center gap-1.5">
              <Coins size={14} className="text-yellow-300" />
              <span className="text-white/70 text-[11px] font-bold uppercase tracking-wider">Live Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-sm">{taskyPerUnit} TASKY</span>
              <span className="text-white/40 text-xs">=</span>
              <span className="text-yellow-300 font-black text-sm">1 {selectedDestination}</span>
            </div>
            <span className="text-[9px] bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full font-black uppercase border border-emerald-400/30 tracking-wider">TON</span>
          </div>

          <p className="text-center text-white/40 text-[11px] mt-2 font-medium">
            Your balance ≈ <strong className="text-white/80">
              {(balance / taskyPerUnit).toLocaleString(undefined, { maximumFractionDigits: 4 })} {selectedDestination}
            </strong>
          </p>
        </div>
      </div>

      {/* TON Connect Row */}
      <Card className="flex items-center justify-between p-3.5 border-border rounded-2xl bg-surface">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isConnected ? 'bg-success-soft text-success' : 'bg-ink-faint text-ink-soft'}`}>
            <WalletIcon size={18} />
          </div>
          <div>
            <h3 className="font-bold text-ink text-sm">TON Wallet</h3>
            <p className="text-[11px] text-ink-soft font-medium">
              {isConnected ? 'Connected securely' : 'Connect to request swaps'}
            </p>
          </div>
        </div>
        {isConnected ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-soft border border-border rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-mono font-bold text-ink">{truncateAddress(walletAddress)}</span>
          </div>
        ) : (
          <Button onClick={() => tonConnectUI.openModal()} className="px-4 py-1.5 text-xs font-bold bg-ink text-surface rounded-lg active:scale-95 transition-all">
            Connect
          </Button>
        )}
      </Card>

      <div className="flex bg-surface-soft p-1 rounded-pill relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium z-10 transition-colors ${activeTab === tab.id ? 'text-ink' : 'text-ink-soft hover:text-ink'}`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
        <motion.div
          layoutId="walletTabIndicator"
          className="absolute top-1 bottom-1 w-[calc(33.333%-3px)] bg-surface rounded-2xl shadow-sm border border-border"
          initial={false}
          animate={{ left: activeTab === 'withdraw' ? '4px' : activeTab === 'swap' ? 'calc(33.333%)' : 'calc(66.666%)' }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {activeTab === 'withdraw' ? (
          <motion.div variants={containerVariants} initial="initial" animate="animate" className="flex flex-col items-center justify-center h-full px-6 text-center space-y-6 mt-6">
            <div className="relative flex items-center justify-center w-24 h-24">
              <div className="absolute inset-0 bg-indigo-500/10 rounded-full scale-[1.5]" />
              <div className="w-16 h-16 bg-surface-soft border border-border rounded-full flex items-center justify-center shadow-sm relative z-10">
                <Lock size={28} className="text-indigo-400" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-ink">TASKY Isn't Live On-Chain Yet</h2>
              <p className="text-sm text-ink-soft font-medium max-w-xs mx-auto leading-relaxed">
                {withdrawalSettings?.unlock_message || 'Withdrawals unlock when TASKY launches on-chain'}
              </p>
            </div>

            {/* Static Roadmap */}
            <div className="w-full max-w-sm mx-auto bg-surface border border-border rounded-2xl p-5 space-y-4 text-left shadow-sm">
              <h3 className="font-bold text-sm text-ink mb-3">Token Launch Roadmap</h3>
              
              <div className="space-y-4 relative before:absolute before:inset-y-2 before:left-[11px] before:w-[2px] before:bg-border">
                <div className="relative flex items-center gap-4 z-10">
                  <div className="w-6 h-6 rounded-full bg-success-soft border border-success flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={12} className="text-success" />
                  </div>
                  <span className="text-sm font-bold text-ink">Community Growth</span>
                </div>
                
                <div className="relative flex items-center gap-4 z-10">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
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
            </div>

            <div className="pt-4 pb-8">
              <p className="text-xs text-ink-soft font-medium leading-relaxed max-w-[280px] mx-auto mb-3">
                Your TASKY balance is safe and growing. Use Swap to convert small amounts to USDT right now.
              </p>
              <Button 
                onClick={() => setActiveTab('swap')}
                className="px-6 py-2.5 bg-ink text-surface rounded-xl font-bold text-sm active:scale-95 transition-all shadow-md"
              >
                Go to Swap
              </Button>
            </div>
          </motion.div>
        ) : activeTab === 'swap' ? (
          <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-3">
            
            {/* Dopamine Banner */}
            <Card className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20">
              <div className="flex gap-3 items-start">
                <div className="mt-0.5 animate-pulse text-orange-500">
                  <Zap size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-orange-500 mb-1">Early Adopter Rates</h3>
                  <p className="text-[11px] font-medium text-ink-soft leading-relaxed">
                    You are swapping before the mainnet launch! Current rates are lower than expected launch prices. <strong className="text-ink">Hold your TASKY</strong> for maximum gains, or swap small amounts now if you need quick USDT.
                  </p>
                </div>
              </div>
            </Card>

            {/* Key Points */}
            <div className="grid grid-cols-2 gap-3">
              {KEY_POINTS.slice(0,2).map((kp, i) => {
                const Icon = kp.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.07 }}
                    className={`flex flex-col gap-2.5 p-3.5 rounded-2xl border ${kp.cardBg} border-border shadow-sm`}
                  >
                    <div className="flex items-center justify-between w-full">
                       <div
                         className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                         style={{ backgroundColor: `${kp.accentColor}18` }}
                       >
                         <Icon size={18} style={{ color: kp.accentColor }} />
                       </div>
                    </div>
                    <div>
                       <p className="text-xs font-black text-ink leading-tight mb-1">{kp.title}</p>
                       <p className="text-[10px] text-ink-soft leading-relaxed">{kp.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Swap Rules & Info */}
            <Card className="border-red-500/20 rounded-2xl overflow-hidden bg-red-500/5">
              <button 
                onClick={() => setIsRulesExpanded(!isRulesExpanded)}
                className="w-full flex items-center justify-between p-3.5"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-red-500/10">
                    <Shield size={16} className="text-red-500" />
                  </div>
                  <h3 className="font-bold text-red-500 text-sm">Strict Swap Rules</h3>
                </div>
                {isRulesExpanded ? <ChevronUp size={16} className="text-red-400" /> : <ChevronDown size={16} className="text-red-400" />}
              </button>
              
              {isRulesExpanded && (
                <div className="px-4 pb-4 border-t border-red-500/10 pt-3.5">
                  <ul className="space-y-3 text-xs text-red-500/80">
                    <li className="flex items-start gap-2">
                      <div className="mt-1.5 min-w-[4px] h-[4px] rounded-full bg-red-500"></div>
                      <span><strong>Instant Processing.</strong> Swap requests are verified and processed in under 3 minutes. Accounts caught spamming will be banned.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="mt-1.5 min-w-[4px] h-[4px] rounded-full bg-red-500"></div>
                      <span>Swapped funds are sent directly to your connected TON wallet &mdash; absolutely no manual address changes allowed.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="mt-1.5 min-w-[4px] h-[4px] rounded-full bg-red-500"></div>
                      <span>Swap requests are processed in <strong>under 3min</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="mt-1.5 min-w-[4px] h-[4px] rounded-full bg-red-500"></div>
                      <span><strong>Swap availability:</strong> Open now for early adopters.</span>
                    </li>
                  </ul>
                </div>
              )}
            </Card>

            <Card className="space-y-4 relative overflow-hidden rounded-3xl border-border">
              <div className="relative z-10 space-y-4">
                <h3 className="font-black text-ink text-base">Swap TASKY to {selectedDestination}</h3>

                {/* Destination Toggle */}
                <div>
                  <label className="block text-[10px] font-black text-ink-soft uppercase tracking-widest mb-2">Select Destination</label>
                  <div className="flex bg-surface-soft p-1.5 rounded-2xl relative mb-6">
                    {['DOGS', 'USDT'].map((token) => {
                      const tokenData = rates.find(r => r.token_name === token);
                      const isActive = tokenData ? tokenData.is_active : false;
                      const isSelected = selectedDestination === token;
                      
                      return (
                        <motion.button
                          key={token}
                          onClick={() => {
                            setSelectedDestination(token);
                            if (!isActive) {
                              if (window.Telegram?.WebApp?.HapticFeedback) {
                                window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                              }
                              showToast(`${token} swap is coming soon`, 'info');
                              setTimeout(() => setIsUsdtTeaserOpen(true), 300);
                            }
                          }}
                          whileTap={!isActive ? { x: [-2, 2, -2, 2, 0], transition: { duration: 0.3 } } : {}}
                          className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-bold z-10 transition-all overflow-hidden rounded-xl ${
                            isSelected ? 'text-ink' : isActive ? 'text-ink-soft hover:text-ink' : 'text-ink-faint opacity-70'
                          }`}
                        >
                          {!isActive && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-[200%] h-full"
                              animate={{ x: ['-100%', '100%'] }}
                              transition={{ repeat: Infinity, duration: 2, repeatDelay: 4, ease: 'linear' }}
                            />
                          )}
                          {!isActive && <Lock size={14} className="relative z-10" />}
                          <span className="relative z-10">{token}</span>
                          {!isActive && <span className="relative z-10 ml-1 text-[9px] bg-ink-faint text-ink px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">Soon</span>}
                        </motion.button>
                      );
                    })}
                    <motion.div
                      layoutId="swapDestinationIndicator"
                      className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-surface rounded-xl shadow-sm border border-border"
                      initial={false}
                      animate={{ left: selectedDestination === 'DOGS' ? '6px' : '50%' }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  </div>
                </div>

                {/* Destination Wallet */}
                <div>
                  <label className="block text-[10px] font-black text-ink-soft uppercase tracking-widest mb-2">Destination Wallet Address</label>
                  {isConnected ? (
                    <div className="w-full bg-surface-soft border border-border rounded-2xl px-4 py-3 text-ink-soft font-mono text-xs break-all flex items-center gap-2">
                      <Shield size={14} className="text-success flex-shrink-0" />
                      {walletAddress}
                    </div>
                  ) : (
                    <div className="w-full bg-surface-soft border border-dashed border-indigo-400/40 rounded-2xl px-4 py-3 text-ink-faint text-sm text-center font-medium">
                      Wallet not connected — enter amount to preview
                    </div>
                  )}
                </div>

                {/* Amount — always enabled so user can preview */}
                <div>
                  <label className="block text-[10px] font-black text-ink-soft uppercase tracking-widest mb-2">Amount (TASKY)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={swapAmount}
                      onChange={e => setSwapAmount(e.target.value)}
                      placeholder={`Min. ${minSwap} TASKY`}
                      className="w-full bg-surface-soft border border-border rounded-2xl px-4 py-3 text-ink focus:outline-none focus:border-ink-faint transition-colors pr-16"
                    />
                    <button
                      onClick={() => setSwapAmount(String(balance || minSwap))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-white bg-gradient-to-r from-indigo-500 to-purple-600 px-2.5 py-1.5 rounded-lg"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Receive Calculation — always visible */}
                <div className="bg-surface-soft rounded-2xl p-4 border border-border text-center">
                  <span className="text-ink-soft text-xs font-bold block mb-1">You'll receive (after 30% fee)</span>
                  <span className="font-black text-success text-2xl">≈ {receiveAmount} {selectedDestination}</span>
                </div>
                <p className="text-center text-[10px] text-ink-soft font-medium mt-2">
                  A 30% processing fee is applied. Requests are processed in under 3 minutes.
                </p>

                {/* CTA — conditionally shown only when ready */}
                {!isSelectedActive ? (
                  <Button 
                    onClick={() => setIsUsdtTeaserOpen(true)}
                    className="w-full font-black py-4 rounded-2xl active:scale-95 transition-all bg-surface-soft border border-border text-ink-soft disabled:opacity-100"
                  >
                    <Lock size={16} className="inline mr-2 -mt-1" />
                    Unlocking Soon
                  </Button>
                ) : !isConnected ? (
                  <Button
                    onClick={() => tonConnectUI.openModal()}
                    className="w-full font-black py-4 rounded-2xl active:scale-95 transition-all bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 "
                  >
                    Connect Wallet to Swap
                  </Button>
                ) : hasPendingSwap ? (
                  <div className="w-full py-3.5 rounded-2xl bg-warning-soft border border-warning/20 text-warning text-sm font-bold text-center flex items-center justify-center gap-2">
                    <Clock size={14} />
                    Pending swap in progress
                  </div>
                ) : Number(swapAmount) >= minSwap && Number(swapAmount) <= balance ? (
                  showAdRequirement && (user?.withdrawal_ads_watched || 0) < 50 ? (
                    <div className="bg-surface-soft border border-border p-4 rounded-2xl flex flex-col items-center animate-fade-in">
                      <span className="text-ink text-sm font-bold block mb-2">Watch Ads to Unlock Swap</span>
                      <span className="text-ink-soft text-xs mb-3 text-center">You must complete 50 ads to request a swap.</span>
                      
                      <div className="w-full bg-ink-faint rounded-full h-2.5 mb-2 overflow-hidden">
                        <div className="bg-gradient-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, ((user?.withdrawal_ads_watched || 0) / 50) * 100)}%` }}></div>
                      </div>
                      <span className="text-xs font-bold text-ink mb-3">{user?.withdrawal_ads_watched || 0} / 50 Completed</span>
                      
                      <Button
                        onClick={handleWatchAd}
                        disabled={isWatchingAd}
                        className="w-full py-3 rounded-xl font-bold bg-indigo-500 text-white hover:bg-indigo-400 active:scale-95 transition-all"
                      >
                        {isWatchingAd ? 'Processing...' : 'Watch Ad'}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleSwap}
                      disabled={isSwapping}
                      className="w-full font-black py-4 rounded-2xl active:scale-95 transition-all bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500  disabled:opacity-70"
                    >
                      {isSwapping ? 'Processing...' : 'Request Swap →'}
                    </Button>
                  )
                ) : swapAmount && Number(swapAmount) > balance ? (
                  <div className="w-full py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold text-center">
                    Insufficient balance ({Math.floor(balance).toLocaleString()} TASKY available)
                  </div>
                ) : swapAmount && Number(swapAmount) < minSwap ? (
                  <div className="w-full py-3.5 rounded-2xl bg-surface-soft border border-border text-ink-soft text-sm font-medium text-center">
                    Minimum swap is {minSwap.toLocaleString()} TASKY
                  </div>
                ) : null}
              </div>
            </Card>
          </motion.div>
        ) : (
          history.length === 0 ? (
            <EmptyState title="No swaps yet" message="Your swap history will appear here after your first swap." />
          ) : (
            <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-3">
              {history.map((item, idx) => (
                <Card key={idx} className="flex flex-col gap-2 border-border rounded-2xl">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                        <ArrowRightLeft size={16} />
                      </div>
                      <div className="pt-0.5">
                         <h3 className="font-bold text-ink text-sm leading-tight">Swap</h3>
                        <p className="text-[10px] text-ink-soft leading-tight">{new Date(item.requested_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-ink text-sm">-{item.tasky_amount} TASKY</p>
                      {item.receive_amount && <p className="text-xs text-success font-bold">+{Number(item.receive_amount).toFixed(4)} {item.receive_token}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                    {item.status === 'pending' && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-warning-soft text-warning rounded-pill uppercase tracking-wider font-bold"><Clock size={10}/> Pending</span>}
                    {item.status === 'done' && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-success-soft text-success rounded-pill uppercase tracking-wider font-bold"><CheckCircle2 size={10}/> Done</span>}
                    
                    <span className="text-[10px] text-ink-faint font-mono font-bold ml-2">TON</span>

                    {item.tx_hash && (
                      <a href={`https://tonscan.org/tx/${item.tx_hash}`} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-400 transition-colors">
                        View on Tonscan <ExternalLink size={10} />
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
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsUsdtTeaserOpen(false)}
            />
            
            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="relative w-full max-w-sm max-h-[90dvh] overflow-y-auto bg-surface rounded-[2.5rem] p-8 border border-border shadow-2xl shadow-indigo-500/10 flex flex-col z-10 pointer-events-auto"
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
                    <Coins size={28} className="text-indigo-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-surface rounded-full p-1 z-20">
                    <div className="bg-indigo-500 text-white rounded-full p-1">
                      <Lock size={12} />
                    </div>
                  </div>
                </div>
                
                <h2 className="text-2xl font-black text-ink mb-2">USDT Swap — Coming Soon</h2>
                
                <div className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg mb-4 bg-indigo-500/10 text-indigo-500">
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
                      ? 'bg-success-soft text-success opacity-100' 
                      : 'bg-ink text-surface active:scale-95 hover:bg-ink/90'
                  }`}
                >
                  {isNotified ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 size={18} />
                      We'll notify you!
                    </div>
                  ) : (
                    'Notify Me'
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

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRightLeft, History,
  CheckCircle2, Clock, Wallet as WalletIcon, ExternalLink, Coins,
  Lock, X, ArrowDown
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { getSwapRates, requestSwap, getSwapHistory, saveWalletAddress, getWithdrawalSettings, notifyUsdtUnlock, watchWithdrawalAd } from '../api';
import { useToast } from '../App';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';

const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

export default function Wallet({ user, refreshUser }) {
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
  const { showToast } = useToast();

  useEffect(() => {
    if (user) {
      setLocalAdsWatched(user.withdrawal_ads_watched || 0);
    }
  }, [user?.withdrawal_ads_watched]);
  
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
  const taskyPerUnit = currentRate ? Number(currentRate.tasky_per_unit) : 20000;
  const minSwap = currentRate ? Number(currentRate.min_tasky) : 20000;
  
  const isUserAdmin = Boolean(user?.is_admin) || 
    ['8823265955', '5487109053'].includes(String(user?.telegram_id || ''));
    
  const isSelectedActive = currentRate ? (selectedDestination === 'USDT' && !isUserAdmin ? false : Boolean(currentRate.is_active)) : false;
  
  const balance = Number(user?.balance || 0);
  const amount = Number(swapAmount || 0);
  const receiveAmount = swapAmount ? (amount / taskyPerUnit).toFixed(4) : '0.0000';

  const hasPendingSwap = history.some(h => h.status === 'pending');

  const handleSwap = async () => {
    if (!isConnected) return showToast('Connect your wallet first', 'error');
    if (!swapAmount || Number(swapAmount) < minSwap) {
      return showToast(`Minimum swap is ${minSwap} TASKY`, 'error');
    }
    if (Number(swapAmount) > balance) {
      return showToast('Insufficient balance', 'error');
    }
    
    const hasEnoughAds = localAdsWatched >= 200;
    const hasEnoughRefs = (user?.valid_referrals || 0) >= 5;
    
    if (!hasEnoughAds && !hasEnoughRefs) {
      setShowAdRequirement(true);
      return;
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
    if (typeof window.showGiga === 'undefined') {
      return showToast('Ad network not loaded. Please try again later.', 'error');
    }
    try {
      setIsWatchingAd(true);
      await window.showGiga("main");
      
      setLocalAdsWatched(prev => prev + 1);
      
      const { data, error } = await watchWithdrawalAd(user?.telegram_id);
      if (data && !error) {
        showToast(`Ad watched! ${data.withdrawal_ads_watched} / 200 completed`, 'success');
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

  const tabs = [
    { id: 'withdraw', label: 'Withdraw', icon: WalletIcon },
    { id: 'swap', label: 'Swap', icon: ArrowRightLeft },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="p-4 space-y-4 pb-32 h-full flex flex-col relative">
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

      <div className="flex-1 overflow-y-auto hide-scrollbar relative">
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

            <div className="w-full max-w-sm mx-auto bg-surface border border-border rounded-3xl p-5 space-y-4 text-left shadow-sm">
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
              <Button 
                onClick={() => setActiveTab('swap')}
                className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black text-sm active:scale-95 transition-all shadow-lg shadow-indigo-500/25"
              >
                Swap to USDT Now
              </Button>
            </div>
          </motion.div>
        ) : activeTab === 'swap' ? (
          <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-4 flex flex-col h-full">
            
            {/* The Huge Input Card */}
            <div className="bg-surface border border-border rounded-[2rem] p-6 shadow-sm flex flex-col items-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
              
              <span className="text-xs font-bold text-ink-soft tracking-widest uppercase mb-1 z-10">You Send</span>
              
              <div className="flex flex-col items-center justify-center w-full z-10">
                <input
                  type="number"
                  value={swapAmount}
                  onChange={e => setSwapAmount(e.target.value)}
                  placeholder="0"
                  className="w-full text-center bg-transparent text-5xl font-black text-ink focus:outline-none placeholder:text-ink-faint py-2"
                />
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-black text-ink bg-surface-soft px-3 py-1 rounded-full border border-border">TASKY</span>
                  <button
                    onClick={() => setSwapAmount(String(Math.floor(balance)))}
                    className="text-xs font-bold text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-full active:scale-95 transition-all"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="text-xs font-medium text-ink-soft mt-4">
                Balance: {Math.floor(balance).toLocaleString()} TASKY
              </div>
            </div>

            <div className="flex justify-center -my-6 relative z-20 pointer-events-none">
              <div className="w-10 h-10 bg-surface border border-border rounded-full flex items-center justify-center shadow-md">
                <ArrowDown size={18} className="text-indigo-500" />
              </div>
            </div>

            {/* The Receive Card */}
            <div className="bg-surface-soft border border-border rounded-[2rem] p-6 flex flex-col items-center relative mt-0">
              <span className="text-xs font-bold text-ink-soft tracking-widest uppercase mb-2">You Receive</span>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl font-black text-success">≈ {receiveAmount}</span>
              </div>
              
              <div className="flex bg-surface p-1 rounded-2xl relative mt-4 w-full max-w-[200px] border border-border shadow-sm">
                {['USDT'].map((token) => {
                  const tokenData = rates.find(r => r.token_name === token);
                  let isActive = tokenData ? tokenData.is_active : false;
                  if (token === 'USDT' && !isUserAdmin) isActive = false;
                  
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
                      className={`relative w-full flex items-center justify-center gap-1.5 py-2 text-sm font-black z-10 transition-all rounded-xl text-ink`}
                    >
                      {!isActive && <Lock size={14} className="relative z-10 text-ink-soft" />}
                      <span className="relative z-10">{token} (TON)</span>
                    </motion.button>
                  );
                })}
              </div>
              <div className="text-[10px] text-ink-faint font-medium mt-3">
                Rate: {taskyPerUnit} TASKY = 1 {selectedDestination}
              </div>
            </div>

            {/* Wallet Connect / Action Area */}
            <div className="pt-2 flex-1 flex flex-col justify-end">
              {!isConnected ? (
                <div className="bg-surface border border-border rounded-[2rem] p-5 shadow-sm space-y-4 animate-fade-in">
                  <div className="text-center">
                    <h3 className="font-black text-ink text-sm mb-1">Bind Destination Wallet</h3>
                    <p className="text-xs text-ink-soft mb-4">Connect your TON wallet to receive funds</p>
                  </div>
                  <Button
                    onClick={() => tonConnectUI.openModal()}
                    className="w-full font-black py-4 rounded-2xl active:scale-95 transition-all bg-[#0098EA] text-white shadow-lg shadow-[#0098EA]/30"
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
              
              <div className="flex items-center justify-center gap-4 mt-6 mb-2 animate-fade-in">
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

            {/* Floating Action Button */}
            <div className="fixed bottom-20 left-4 right-4 z-30">
              {!isSelectedActive ? (
                <Button 
                  onClick={() => setIsUsdtTeaserOpen(true)}
                  className="w-full font-black py-4 rounded-2xl active:scale-95 transition-all bg-surface border border-border text-ink shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                >
                  <Lock size={16} className="inline mr-2 -mt-1" />
                  Unlocking Soon
                </Button>
              ) : hasPendingSwap ? (
                <div className="w-full py-4 rounded-2xl bg-warning font-black text-white text-center shadow-[0_8px_30px_rgb(245,158,11,0.3)]">
                  Pending Swap in Progress
                </div>
              ) : showAdRequirement && localAdsWatched < 200 && (user?.valid_referrals || 0) < 5 && Number(swapAmount) >= minSwap && Number(swapAmount) <= balance ? (
                <Button
                  onClick={handleWatchAd}
                  disabled={isWatchingAd}
                  className="w-full py-4 rounded-2xl font-black text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-[0_8px_30px_rgb(99,102,241,0.4)] active:scale-95 transition-all"
                >
                  {isWatchingAd ? 'Loading Ad...' : `Watch Ad (${localAdsWatched}/200)`}
                </Button>
              ) : (
                <Button
                  onClick={handleSwap}
                  disabled={isSwapping || !isConnected || !swapAmount || Number(swapAmount) < minSwap || Number(swapAmount) > balance}
                  className={`w-full font-black py-4 rounded-2xl active:scale-95 transition-all shadow-[0_8px_30px_rgb(99,102,241,0.4)] ${
                    (!isConnected || !swapAmount || Number(swapAmount) < minSwap || Number(swapAmount) > balance)
                      ? 'bg-surface border border-border text-ink-faint shadow-none'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                  }`}
                >
                  {isSwapping ? 'Processing...' : 
                   !isConnected ? 'Connect Wallet First' :
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
            <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-3 mt-4">
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
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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

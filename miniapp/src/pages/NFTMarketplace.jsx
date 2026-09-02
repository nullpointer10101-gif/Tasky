import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Rocket, ShieldCheck, Sparkles, Copy, Check, Clock, Wallet, ArrowDownLeft, Trophy, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import Card, { cardVariants } from '../components/Card';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { getNftMarketplace, buyNft, getMyNftCards, claimNftYield, autoVerifyDeposit } from '../api';
import { useToast } from '../App';

export default function NFTMarketplace({ user, refreshUser, tgUser }) {
  const telegramId = user?.telegram_id || tgUser?.id || tgUser?.telegram_id || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('marketplace'); // marketplace | inventory | deposit
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
        setCards(marketRes.data.cards);
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
      showToast(`Insufficient GRAM! Price is ${price} GRAM. Pay directly with Tonkeeper or Top Up!`, 'error');
      return;
    }

    setBuyingId(nft.id);
    try {
      const { data, error } = await buyNft(telegramId, nft.id);
      if (error) {
        showToast(error, 'error');
      } else if (data && data.success) {
        showToast(data.message || '🎉 Purchased NFT Miner successfully!', 'success');
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

    let url = '';
    if (walletType === 'tonkeeper') {
      url = `https://app.tonkeeper.com/transfer/${depositWallet}?amount=${nanoAmount}&text=${comment}`;
    } else {
      url = `ton://transfer/${depositWallet}?amount=${nanoAmount}&text=${comment}`;
    }

    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }

    showToast(`Opening ${walletType === 'tonkeeper' ? 'Tonkeeper' : 'TON Wallet'} with pre-filled deposit payload...`, 'success');
  };

  const handleClaim = async (instanceId) => {
    if (!telegramId) return;
    setClaimingId(instanceId);
    try {
      const { data, error } = await claimNftYield(telegramId, instanceId);
      if (error) {
        showToast(error, 'error');
      } else if (data && data.success) {
        showToast(data.message || '🎉 Daily yield claimed!', 'success');
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
        showToast(data.message || '🎉 Deposit verified! Balance updated.', 'success');
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
      showToast('Deposit wallet address copied!', 'success');
    } else {
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 2000);
      showToast('Deposit Memo comment copied!', 'success');
    }
  };

  const renderCountdown = (seconds) => {
    if (seconds <= 0) return 'Available Now!';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="p-4 space-y-4 pb-24 min-h-full relative">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-ink flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles size={20} />
            </span>
            NFT Digital Miners
          </h1>
          <p className="text-xs text-ink-soft font-medium">Own NFT miners & earn daily GRAM returns</p>
        </div>

        {/* GRAM Balance Capsule */}
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500/15 to-indigo-500/15 border border-purple-500/30 px-3 py-1.5 rounded-full shadow-sm">
          <Zap size={14} className="text-amber-400 animate-pulse" />
          <span className="text-xs font-black text-white">{gramBalance.toFixed(3)} GRAM</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-surface-soft p-1 rounded-2xl relative shadow-inner border border-border/50">
        {[
          { key: 'marketplace', label: '🛍️ Marketplace' },
          { key: 'inventory', label: `📦 My Miners (${myCards.length})` },
          { key: 'deposit', label: '⚡ Deposit GRAM' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-xs font-black z-10 transition-all flex items-center justify-center gap-1.5 relative ${
              activeTab === tab.key ? 'text-white' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <motion.div
          layoutId="nftTabIndicator"
          className="absolute top-1 bottom-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-md"
          initial={false}
          animate={{
            left: activeTab === 'marketplace' ? '4px' : activeTab === 'inventory' ? 'calc(33.33% + 2px)' : 'calc(66.66% + 0px)',
            width: 'calc(33.33% - 4px)'
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-purple-400 animate-pulse">
            <RefreshCw size={32} className="animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest">Loading NFT System...</p>
          </div>
        ) : activeTab === 'marketplace' ? (
          /* ========================================================= */
          /* TAB 1: NFT MARKETPLACE                                    */
          /* ========================================================= */
          <motion.div key="marketplace" variants={cardVariants} initial="initial" animate="animate" className="space-y-4">
            
            {/* Promo Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#1E1B4B] via-[#311042] to-[#0F0D24] border border-purple-500/40 text-center shadow-xl">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl" />
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 text-[10px] font-black px-3 py-1 rounded-full border border-amber-500/30 uppercase tracking-widest mb-2">
                  <Trophy size={12} /> High Yield NFT Miners
                </span>
                <h2 className="text-xl font-black text-white tracking-tight mb-1">Buy Once. Earn GRAM Daily for 10 Days!</h2>
                <p className="text-xs text-purple-200/80 max-w-xs mx-auto">Purchase limited NFT miners to automatically generate guaranteed daily GRAM returns directly to your vault balance.</p>
              </div>
            </div>

            {/* NFT Cards List */}
            <div className="grid grid-cols-1 gap-4">
              {cards.map((nft) => {
                const isTurbo = nft.id === 2;
                const price = parseFloat(nft.price_gram);

                return (
                  <motion.div
                    key={nft.id}
                    whileHover={{ scale: 1.01 }}
                    className={`relative overflow-hidden rounded-3xl p-5 border transition-all duration-300 ${
                      isTurbo
                        ? 'bg-gradient-to-br from-[#1E1B4B] via-[#4C1D95] to-[#1E1B4B] border-amber-500/50 shadow-xl shadow-purple-500/10'
                        : 'bg-surface-soft border-purple-500/30 hover:border-purple-500/60'
                    }`}
                  >
                    {/* Top Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isTurbo
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md shadow-amber-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}>
                        {isTurbo ? <Rocket size={12} /> : <Zap size={12} />}
                        {nft.rarity || 'LIMITED EDITION'}
                      </div>
                      <span className="text-[11px] font-bold text-ink-soft">10 Days Return</span>
                    </div>

                    {/* Card Title & Icon */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                        isTurbo
                          ? 'bg-gradient-to-tr from-amber-500/20 to-purple-600/30 border-amber-500/40 text-amber-300'
                          : 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                      }`}>
                        {isTurbo ? <Rocket size={28} /> : <Zap size={28} />}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white leading-tight">{nft.name}</h3>
                        <p className="text-xs text-ink-soft leading-snug mt-0.5">{nft.description}</p>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-black/20 p-3 rounded-2xl border border-white/10 mb-4 text-center">
                      <div>
                        <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">Price</p>
                        <p className="text-sm font-black text-amber-400">{nft.price_gram} GRAM</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">Daily Yield</p>
                        <p className="text-sm font-black text-emerald-400">+{nft.daily_yield_gram} GRAM</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">Total Return</p>
                        <p className="text-sm font-black text-purple-300">{nft.total_yield_gram} GRAM</p>
                      </div>
                    </div>

                    {/* Dual Action Buttons */}
                    <div className="space-y-2">
                      {/* Option 1: Buy with Vault Balance */}
                      <Button
                        onClick={() => handleBuy(nft)}
                        loading={buyingId === nft.id}
                        className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-0 shadow-lg ${
                          isTurbo
                            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-black hover:opacity-95'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-95'
                        }`}
                      >
                        <Zap size={14} />
                        <span>Buy with Vault ({nft.price_gram} GRAM)</span>
                      </Button>

                      {/* Option 2: Pay Directly via Tonkeeper */}
                      <button
                        onClick={() => handlePayViaWallet(nft.price_gram, 'tonkeeper')}
                        className="w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 transition-all active:scale-98"
                      >
                        <ExternalLink size={14} />
                        <span>Pay {nft.price_gram} GRAM via Tonkeeper 💎</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : activeTab === 'inventory' ? (
          /* ========================================================= */
          /* TAB 2: MY INVENTORY & CLAIM YIELD                         */
          /* ========================================================= */
          <motion.div key="inventory" variants={cardVariants} initial="initial" animate="animate" className="space-y-4">
            {myCards.length === 0 ? (
              <EmptyState
                icon={Zap}
                title="No NFT Miners Owned Yet"
                message="Purchase your first NFT Miner in the Marketplace to start earning daily GRAM passive returns!"
              />
            ) : (
              myCards.map((card) => {
                const claimsDone = card.claims_done || 0;
                const durationDays = card.duration_days || 10;
                const pct = Math.min((claimsDone / durationDays) * 100, 100);
                const isMaxedOut = claimsDone >= durationDays;

                return (
                  <Card key={card.instance_id} className="relative overflow-hidden border-purple-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                          {card.nft_id === 2 ? <Rocket size={18} /> : <Zap size={18} />}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">{card.name}</h4>
                          <p className="text-[11px] text-ink-soft">Yield: +{card.daily_yield_gram} GRAM / day</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        isMaxedOut
                          ? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          : card.can_claim
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse'
                          : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      }`}>
                        {isMaxedOut ? 'Completed' : card.can_claim ? 'Ready to Claim!' : 'Mining Active'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center text-xs font-bold mb-1">
                        <span className="text-ink-soft">Return Progress</span>
                        <span className="text-purple-300 font-mono">{claimsDone} / {durationDays} Days Claimed</span>
                      </div>
                      <div className="w-full h-2.5 bg-black/30 rounded-full overflow-hidden border border-white/10">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Earnings Summary & Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div>
                        <p className="text-[10px] font-bold text-ink-soft uppercase">Total Earned</p>
                        <p className="text-xs font-black text-emerald-400">+{Number(card?.total_earned_gram || 0).toFixed(3)} GRAM</p>
                      </div>

                      {isMaxedOut ? (
                        <span className="text-xs font-bold text-ink-soft/70">{claimsDone}/{durationDays} Days Complete</span>
                      ) : card.can_claim ? (
                        <Button
                          size="sm"
                          onClick={() => handleClaim(card.instance_id)}
                          loading={claimingId === card.instance_id}
                          className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs px-4 py-2 rounded-xl border-0 shadow-lg shadow-emerald-500/20"
                        >
                          <span>Claim +{card.daily_yield_gram} GRAM</span>
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                          <Clock size={12} />
                          <span>Next in {renderCountdown(card.next_claim_seconds)}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </motion.div>
        ) : (
          /* ========================================================= */
          /* TAB 3: INSTANT DEPOSIT & BLOCKCHAIN VERIFICATION          */
          /* ========================================================= */
          <motion.div key="deposit" variants={cardVariants} initial="initial" animate="animate" className="space-y-4">
            
            {/* Header info */}
            <div className="bg-gradient-to-br from-[#1E1B4B] to-[#311042] border border-purple-500/40 rounded-3xl p-5 text-center shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3">
                <ArrowDownLeft size={24} />
              </div>
              <h3 className="text-lg font-black text-white mb-1">Instant GRAM / TON Deposit</h3>
              <p className="text-xs text-purple-200/80 max-w-xs mx-auto">
                Transfer GRAM or TON directly using Tonkeeper or any TON wallet. The system automatically verifies your deposit on the blockchain with zero admin wait time!
              </p>
            </div>

            {/* Direct Pay Button Options (OPTION A) */}
            <Card className="bg-gradient-to-r from-blue-900/30 via-indigo-900/30 to-purple-900/30 border-blue-500/40">
              <p className="text-xs font-black text-blue-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ExternalLink size={14} className="text-blue-400" />
                ⚡ OPTION A: 1-TAP INSTANT WALLET PAYMENT
              </p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  onClick={() => handlePayViaWallet(0.5, 'tonkeeper')}
                  className="py-3 px-3 bg-blue-600/30 hover:bg-blue-600/40 text-white rounded-2xl border border-blue-500/40 text-xs font-black flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-md"
                >
                  <span className="text-[11px] text-blue-300">Pay 0.5 GRAM</span>
                  <span className="flex items-center gap-1 text-amber-300">Tonkeeper 💎</span>
                </button>
                <button
                  onClick={() => handlePayViaWallet(1.0, 'tonkeeper')}
                  className="py-3 px-3 bg-purple-600/30 hover:bg-purple-600/40 text-white rounded-2xl border border-purple-500/40 text-xs font-black flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-md"
                >
                  <span className="text-[11px] text-purple-300">Pay 1.0 GRAM</span>
                  <span className="flex items-center gap-1 text-amber-300">Tonkeeper 💎</span>
                </button>
              </div>
              <p className="text-[10px] text-blue-200/70 text-center font-medium">Auto-fills recipient address, amount & memo comment!</p>
            </Card>

            {/* Manual Transfer Options (OPTION B) */}
            <div className="pt-2 pb-1 text-center">
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                OR OPTION B: MANUAL TRANSFER
              </span>
            </div>

            {/* Step 1: Tasky Official Deposit Wallet Address */}
            <Card>
              <p className="text-xs font-black text-purple-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Wallet size={14} className="text-amber-400" />
                Step 1: Tasky Official Deposit Wallet Address
              </p>
              <div className="flex items-center justify-between bg-black/30 p-3 rounded-2xl border border-white/10 gap-2 mb-2">
                <p className="text-xs font-mono text-white truncate flex-1">{depositWallet}</p>
                <button
                  onClick={() => copyToClipboard(depositWallet, 'wallet')}
                  className="shrink-0 p-2 rounded-xl bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 transition-all active:scale-95"
                >
                  {copiedWallet ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-[11px] text-ink-soft">Send any amount of GRAM or TON to the official Tasky address above.</p>
            </Card>

            {/* Step 2: Deposit Comment / Memo */}
            <Card>
              <p className="text-xs font-black text-purple-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-amber-400" />
                Step 2: Include Your Unique Memo Comment
              </p>
              <div className="flex items-center justify-between bg-amber-500/10 p-3 rounded-2xl border border-amber-500/30 gap-2 mb-2">
                <p className="text-sm font-black font-mono text-amber-300 truncate">{memoText}</p>
                <button
                  onClick={() => copyToClipboard(memoText, 'memo')}
                  className="shrink-0 p-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-all active:scale-95"
                >
                  {copiedMemo ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="p-2.5 bg-warning-soft/60 text-warning text-[11px] font-medium rounded-xl border border-warning/20 leading-snug">
                ⚠️ <strong>Crucial:</strong> You MUST include <code>{memoText}</code> in the transfer comment/memo so the system auto-identifies your deposit!
              </div>
            </Card>

            {/* Step 3: Automatic Blockchain Verification */}
            <Card>
              <p className="text-xs font-black text-purple-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Zap size={14} className="text-emerald-400" />
                Step 3: Automatic Blockchain Verifier
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Paste Tonviewer Tx Hash (Optional)"
                  value={txHashInput}
                  onChange={(e) => setTxHashInput(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-ink-soft/60 focus:outline-none focus:border-purple-500"
                />
                <Button
                  onClick={handleAutoVerifyDeposit}
                  loading={verifyingDeposit}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-xs uppercase tracking-wider border-0 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Zap size={16} />
                  <span>Verify Deposit Automatically ⚡</span>
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

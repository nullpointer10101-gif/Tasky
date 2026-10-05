import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Rocket, Send, Bot, Globe, Copy, Check, Sparkles, ShieldCheck, AlertCircle, RefreshCw, Zap, CreditCard, ChevronRight, X, ExternalLink, Wallet } from 'lucide-react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { useToast } from '../App';
import { BACKEND_URL } from '../api';

const ADMIN_WALLET = 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR';

export default function PromoteProjectModal({ isOpen, onClose, userGramBalance = 0, telegramId, onSuccess }) {
  const { addToast } = useToast();
  const [tonConnectUI] = useTonConnectUI();

  const [step, setStep] = useState('configure'); // 'configure' | 'payment'
  const [promotionType, setPromotionType] = useState('channel'); // 'channel' | 'bot' | 'link'
  const [title, setTitle] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [targetUsers, setTargetUsers] = useState(1000);
  
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState(null);

  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);

  if (!isOpen) return null;

  // Rate: 500 users = 0.5 GRAM => 0.001 GRAM per user
  const requiredGram = (targetUsers / 500) * 0.5;
  const canPayInternal = userGramBalance >= requiredGram;

  const handleCreateInvoice = async () => {
    if (!title.trim()) {
      addToast('Please enter your project title', 'error');
      return;
    }
    if (!targetUrl.trim() || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('t.me/'))) {
      addToast('Please enter a valid link (e.g. https://t.me/yourchannel)', 'error');
      return;
    }
    if (targetUsers < 1000) {
      addToast('Minimum target is 1,000 users', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/partner/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: telegramId,
          promotion_type: promotionType,
          title: title.trim(),
          target_url: targetUrl.trim().startsWith('t.me/') ? `https://${targetUrl.trim()}` : targetUrl.trim(),
          target_users: targetUsers
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create campaign invoice');
      }

      setCampaign(data.campaign);
      setStep('payment');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePayInternal = async () => {
    if (!campaign) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/partner/pay-internal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: telegramId,
          campaign_id: campaign.id
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Payment failed');
      }

      addToast(data.message || 'Campaign launched successfully!', 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoOpenWallet = async () => {
    if (!campaign) return;
    const price = parseFloat(campaign.price_gram);
    const nanoAmount = Math.round(price * 1e9);
    const memo = campaign.memo;

    // Automatically copy memo to clipboard
    try {
      await navigator.clipboard.writeText(memo);
      addToast('Memo copied! Opening wallet...', 'info');
    } catch (e) {}

    const tonkeeperUrl = `https://app.tonkeeper.com/transfer/${ADMIN_WALLET}?amount=${nanoAmount}&text=${encodeURIComponent(memo)}`;

    // Try TON Connect UI transaction if connected
    if (tonConnectUI && tonConnectUI.connected) {
      try {
        setLoading(true);
        await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 600,
          messages: [
            {
              address: ADMIN_WALLET,
              amount: nanoAmount.toString()
            }
          ]
        });
        addToast('Transaction sent via wallet! Click Verify once confirmed.', 'success');
      } catch (err) {
        console.warn('[TonConnect] Send transaction cancelled or error, falling back to deep link:', err?.message);
        if (window.Telegram?.WebApp?.openLink) {
          window.Telegram.WebApp.openLink(tonkeeperUrl);
        } else {
          window.open(tonkeeperUrl, '_blank');
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Direct deep link fallback for Tonkeeper / Telegram Wallet
      if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(tonkeeperUrl);
      } else {
        window.open(tonkeeperUrl, '_blank');
      }
    }
  };

  const handleVerifyOnchain = async () => {
    if (!campaign) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/partner/verify-onchain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: telegramId,
          campaign_id: campaign.id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      if (data.success && data.status === 'active') {
        addToast(data.message, 'success');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        addToast(data.message || 'Payment not detected yet. Please check your wallet transfer.', 'error');
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'wallet') {
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    } else {
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 2000);
    }
    addToast(`Copied ${type} to clipboard!`, 'info');
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-md bg-[#121420] border border-indigo-500/30 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Background Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-5 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Rocket size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                Promote Your Project
              </h2>
              <p className="text-xs text-indigo-300/80 font-medium">
                {step === 'configure' ? 'Set up campaign & target users' : 'Complete automatic payment'}
              </p>
            </div>
          </div>

          {/* Body content scrollable */}
          <div className="overflow-y-auto pr-1 space-y-4 flex-1">
            {step === 'configure' ? (
              <>
                {/* Type Selection */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                    1. Promotion Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'channel', label: 'Channel', icon: Send },
                      { id: 'bot', label: 'Bot', icon: Bot },
                      { id: 'link', label: 'Website', icon: Globe },
                    ].map((type) => {
                      const Icon = type.icon;
                      const active = promotionType === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setPromotionType(type.id)}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                            active
                              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-500/20'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          <Icon size={20} className="mb-1" />
                          <span className="text-xs font-bold">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                    2. Project Name / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AlphaDrop Daily"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Target Link */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                    3. Target Link / URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://t.me/yourchannel"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Target Users / Preset Selector */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      4. Target Members / Users
                    </label>
                    <span className="text-xs font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      500 users = 0.5 GRAM
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[1000, 2000, 5000, 10000].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setTargetUsers(num)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          targetUsers === num
                            ? 'bg-indigo-600/20 border-indigo-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-sm font-bold text-white">{num.toLocaleString()} Users</div>
                        <div className="text-xs font-semibold text-indigo-400">
                          {((num / 500) * 0.5).toFixed(1)} GRAM
                        </div>
                      </button>
                    ))}
                  </div>

                  <input
                    type="range"
                    min="1000"
                    max="20000"
                    step="500"
                    value={targetUsers}
                    onChange={(e) => setTargetUsers(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-gray-500 mt-1 font-mono">
                    <span>1,000 (Min 1.0 GRAM)</span>
                    <span>20,000 (20.0 GRAM)</span>
                  </div>
                </div>

                {/* Price Breakdown Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 font-medium block">Total Price</span>
                    <span className="text-2xl font-black text-white">{requiredGram.toFixed(1)} GRAM</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-indigo-300 font-bold block">{targetUsers.toLocaleString()} Users</span>
                    <span className="text-[11px] text-gray-400">~0.001 GRAM / user</span>
                  </div>
                </div>
              </>
            ) : (
              /* PAYMENT STEP */
              <>
                {/* Summary Banner */}
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-white text-sm">{campaign?.title}</h4>
                    <p className="text-xs text-indigo-300 font-medium">{campaign?.target_users.toLocaleString()} Target Users</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-amber-400">{campaign?.price_gram} GRAM</span>
                  </div>
                </div>

                {/* Option 1: Pay with Vault Balance */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap size={14} className="text-amber-400" /> Option A: Pay from Vault
                    </span>
                    <span className="text-xs text-gray-400">
                      Balance: <strong className="text-white">{parseFloat(userGramBalance || 0).toFixed(4)} GRAM</strong>
                    </span>
                  </div>

                  <button
                    onClick={handlePayInternal}
                    disabled={!canPayInternal || loading}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                      canPayInternal
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black shadow-lg shadow-amber-500/20'
                        : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    {loading ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : canPayInternal ? (
                      <>⚡ Pay {campaign?.price_gram} GRAM Instantly</>
                    ) : (
                      <>Insufficient Vault Balance</>
                    )}
                  </button>
                </div>

                {/* Option 2: Pay On-Chain with Wallet & Memo */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard size={14} className="text-indigo-400" /> Option B: Pay On-Chain (TON)
                  </span>

                  {/* Auto-Open Wallet Button */}
                  <button
                    onClick={handleAutoOpenWallet}
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-black text-sm shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all group"
                  >
                    <Wallet size={18} className="group-hover:scale-110 transition-transform" />
                    <span>Pay {campaign?.price_gram} TON via Wallet (Auto-Open)</span>
                    <ExternalLink size={14} />
                  </button>

                  {/* Manual Details Fallback */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    {/* Wallet Address */}
                    <div>
                      <label className="text-[11px] text-gray-400 font-semibold block mb-1">Admin Wallet Address</label>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-gray-300">
                        <span className="truncate pr-2">{ADMIN_WALLET}</span>
                        <button
                          onClick={() => copyToClipboard(ADMIN_WALLET, 'wallet')}
                          className="p-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 transition-colors shrink-0"
                        >
                          {copiedWallet ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Memo Code */}
                    <div>
                      <label className="text-[11px] text-amber-400 font-bold block mb-1">
                        Required Deposit Memo / Comment (CRITICAL)
                      </label>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300">
                        <span className="font-bold tracking-wider">{campaign?.memo}</span>
                        <button
                          onClick={() => copyToClipboard(campaign?.memo, 'memo')}
                          className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 transition-colors shrink-0"
                        >
                          {copiedMemo ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>Send <strong>{campaign?.price_gram} TON/GRAM</strong> with the exact Memo code in your transfer comment!</span>
                  </div>

                  <button
                    onClick={handleVerifyOnchain}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck size={16} /> Verify On-Chain Payment
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 mt-2 border-t border-white/10 shrink-0">
            {step === 'configure' ? (
              <button
                onClick={handleCreateInvoice}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <>Continue to Payment <ChevronRight size={16} /></>}
              </button>
            ) : (
              <button
                onClick={() => setStep('configure')}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold transition-colors"
              >
                ← Back to Campaign Details
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

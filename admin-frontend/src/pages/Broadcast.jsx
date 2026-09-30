import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Send, AlertTriangle, Code, RefreshCw, Gift, Rocket, Image as ImageIcon, Gem, Clock, Play, CheckCircle, Zap, Coins } from 'lucide-react';

const StatusWidget = ({ status, themeColor = 'purple', onCancel, type }) => {
  if (!status) return null;

  const total = status.total || 0;
  const currentIdx = status.currentIdx || 0;
  const success = status.success || 0;
  const failed = status.failed || 0;
  const isRunning = status.status === 'running';
  const isCancelled = status.status === 'cancelled';
  const progressPct = total > 0 ? Math.min(100, Math.round((currentIdx / total) * 100)) : (isRunning ? 0 : 100);

  const themeMap = {
    purple: {
      border: 'border-purple-500/30',
      text: 'text-purple-300',
      bar: 'bg-gradient-to-r from-purple-500 to-indigo-500',
      percent: 'text-purple-400'
    },
    emerald: {
      border: 'border-emerald-500/30',
      text: 'text-emerald-300',
      bar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
      percent: 'text-emerald-400'
    },
    indigo: {
      border: 'border-indigo-500/30',
      text: 'text-indigo-300',
      bar: 'bg-gradient-to-r from-indigo-500 to-cyan-400',
      percent: 'text-indigo-400'
    },
    amber: {
      border: 'border-amber-500/30',
      text: 'text-amber-300',
      bar: 'bg-gradient-to-r from-amber-500 to-orange-500',
      percent: 'text-amber-400'
    }
  };

  const t = themeMap[themeColor] || themeMap.purple;

  return (
    <div className={`bg-black/40 border ${t.border} rounded-2xl p-3.5 space-y-2.5 shadow-inner transition-all`}>
      <div className="flex items-center justify-between text-[11px] font-bold">
        <span className={`${t.text} uppercase tracking-wider truncate max-w-[190px]`} title={status.lastError || ''}>
          {isRunning 
            ? '🚀 Broadcasting in progress...' 
            : isCancelled
              ? '⏹️ Broadcast Stopped'
              : failed > 0 && success === 0 
                ? `❌ ${status.lastError || 'Send Failed'}` 
                : '✅ Broadcast Completed'}
        </span>
        <div className="flex items-center gap-2">
          {isRunning && onCancel && (
            <button
              type="button"
              onClick={() => onCancel(type)}
              className="text-[10px] text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
            >
              Stop
            </button>
          )}
          <span className={`font-mono ${t.percent}`}>{progressPct}%</span>
        </div>
      </div>

      <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            failed > 0 && success === 0 ? 'bg-rose-500' : t.bar
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-center font-bold pt-0.5">
        <div className="bg-white/5 p-2 rounded-xl border border-white/5">
          <p className="text-ink-soft text-[10px] uppercase tracking-wider">Target Users</p>
          <p className="text-white text-xs font-mono font-black mt-0.5">{total}</p>
        </div>
        <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
          <p className="text-emerald-400 text-[10px] uppercase tracking-wider">Sent (Success)</p>
          <p className="text-emerald-300 text-xs font-mono font-black mt-0.5">{success}</p>
        </div>
        <div className="bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
          <p className="text-rose-400 text-[10px] uppercase tracking-wider">Failed</p>
          <p className="text-rose-300 text-xs font-mono font-black mt-0.5">{failed}</p>
        </div>
      </div>

      {status.lastError && failed > 0 && success === 0 && (
        <div className="text-[10px] text-rose-300/90 font-mono bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg truncate">
          Error: {status.lastError}
        </div>
      )}
    </div>
  );
};

export default function Broadcast() {
  // Custom Global Broadcast State
  const [message, setMessage] = useState('');
  const [customTarget, setCustomTarget] = useState('admin'); // 'admin' or 'all'
  const [customStatus, setCustomStatus] = useState(null);
  const [isBroadcastingCustom, setIsBroadcastingCustom] = useState(false);

  // Promo Code Broadcast State
  const [promoCode, setPromoCode] = useState('');
  const [target, setTarget] = useState('admin'); // 'admin' or 'all'
  const [promoStatus, setPromoStatus] = useState(null);
  const [isBroadcastingPromo, setIsBroadcastingPromo] = useState(false);

  // Cyber Flip (Heads or Tails) Broadcast State
  const [flipTarget, setFlipTarget] = useState('admin'); // 'admin' or 'all'
  const [flipStatus, setFlipStatus] = useState(null);
  const [isBroadcastingFlip, setIsBroadcastingFlip] = useState(false);
  const [flipTemplateIndex, setFlipTemplateIndex] = useState(0);
  const [flipButtonText, setFlipButtonText] = useState('🪙 Play Cyber Flip (1.90X) Now ⚡');

  // GRAM Currency Broadcast State
  const [gramTarget, setGramTarget] = useState('admin'); // 'admin' or 'all'
  const [gramStatus, setGramStatus] = useState(null);
  const [isBroadcastingGram, setIsBroadcastingGram] = useState(false);
  const [gramTemplateIndex, setGramTemplateIndex] = useState(0);
  const [autoGramSettings, setAutoGramSettings] = useState(null);
  const [isTogglingAutoGram, setIsTogglingAutoGram] = useState(false);

  const flipTemplates = [
    {
      label: 'Variant 1: 1.90X Game Launch 🪙',
      text: `🚀 <b>NEW GAME LAUNCH: CYBER FLIP (HEADS OR TAILS)!</b> 🪙\n\nTasky family, multiply your GRAM in just 3 seconds!\n\n🎲 <b>How to Play:</b>\n1. Pick <b>HEADS</b> or <b>TAILS</b>\n2. Bet 2+ GRAM\n3. Win <b>1.90X instant payout</b> directly into your balance!\n\n💎 <b>Instant Deposit via Tonkeeper:</b> 1-tap top up & auto-verification!\n\n👉 <b>Tap below to flip your coin now:</b>`
    },
    {
      label: 'Variant 2: Instant Payout Urgency 🔥',
      text: `🔥 <b>TEST YOUR LUCK: 1.90X INSTANT FLIP IS LIVE!</b> 🚀\n\nMultiply your crypto right now inside the Tasky Mini App!\n\n• <b>Instant 3-second rounds</b>\n• <b>1.90X Payout</b> on every win\n• Starts from just <b>2 GRAM</b>\n\n⚡️ <b>Tap below and make your first flip:</b>`
    },
    {
      label: 'Variant 3: Short & High-Converting 🎯',
      text: `🪙 <b>HEADS OR TAILS? WIN 1.90X NOW!</b> 💎\n\nCyber Flip is officially live on Tasky! Pick your side, place your bet, and collect instant GRAM winnings directly.\n\n👇 <b>Play Cyber Flip Now:</b>`
    },
    {
      label: 'Variant 4: Custom Message ✍️',
      text: `🪙 <b>CYBER FLIP SPECIAL ANNOUNCEMENT</b> ⚡️\n\nWrite your custom announcement message here...`
    }
  ];

  const [flipCustomText, setFlipCustomText] = useState(flipTemplates[0].text);

  const gramTemplates = [
    {
      label: 'Variant 1: Daily 0.02 GRAM Quest Reminder 💎',
      text: `⚠️ <b>You have not claimed your daily GRAM reward yet!</b>\n\nGo complete your 60 daily ads now and claim your <b>0.02 GRAM</b> reward directly to your TON wallet!\n\n💎 <b>Claim your GRAM now:</b>`
    },
    {
      label: 'Variant 2: Free GRAM Daily Payout 🎁',
      text: `🔥 <b>Free GRAM waiting to be claimed!</b>\n\nDon't miss out on your daily yield. Watch your 60 short ads now and unlock <b>0.02 GRAM</b> paid instantly to your wallet!\n\n⚡️ <b>Get your free GRAM tokens here:</b>`
    },
    {
      label: 'Variant 3: Ad Slots Refreshed ⚡️',
      text: `🚀 <b>Ad slots refreshed! Ready for GRAM?</b>\n\nWatch 60 ads inside the Tasky Mini App to grab your daily <b>0.02 GRAM</b> reward. Fast, easy, and direct to your TON wallet.\n\n👉 <b>Click below to start:</b>`
    },
    {
      label: 'Variant 4: High Demand Cap Urgency 🚨',
      text: `🚨 <b>URGENT: Gram rewards pool is active!</b>\n\nDaily cap is reaching limit. Finish your 60 ads right now and secure your <b>0.02 GRAM</b> direct payout before the reset!\n\n💰 <b>Secure your payout here:</b>`
    },
    {
      label: 'Variant 5: Claim & Rank Up 🏆',
      text: `🏆 <b>Boost your Tasky status with free GRAM!</b>\n\nDaily active miners are already claiming. Watch your 60 ads to unlock <b>0.02 GRAM</b> and increase your daily rank!\n\n💎 <b>Claim & Rank Up:</b>`
    },
    {
      label: 'Variant 6: Cyber Reactor Jackpot Special 💥',
      text: `💥 <b>2.00 GRAM Jackpot Vault is Charging!</b>\n\nCharge your Cyber Reactor! Every ad watched brings you closer to unlocking the <b>2.00 GRAM</b> jackpot vault + 20,000 TASKY bonus!\n\n⚡️ <b>Charge Core & Earn GRAM:</b>`
    },
    {
      label: 'Variant 7: Daily Bounty Refresh 💸',
      text: `🎁 <b>Fresh Daily Bounty Available!</b>\n\nYour 0.02 GRAM daily task reward is ready for pickup. Complete your short ad sessions and cash out straight to TON!\n\n💸 <b>Claim your bounty below:</b>`
    },
    {
      label: 'Variant 8: Exclusive Instant Payout 👑',
      text: `👑 <b>Exclusive GRAM Rewards Active!</b>\n\nDon't leave free crypto on the table! Tap below to open Tasky, complete your ads, and receive your <b>0.02 GRAM</b> reward instantly.\n\n💎 <b>Tap to launch Tasky:</b>`
    }
  ];

  const fetchAllStatuses = async () => {
    try {
      const [flipRes, promoRes, gramRes, customRes, autoGramRes] = await Promise.allSettled([
        api.get('/broadcast/flip-status'),
        api.get('/broadcast/promo-status'),
        api.get('/broadcast/gram-reminder-status'),
        api.get('/broadcast/custom-status'),
        api.get('/broadcast/auto-gram-status')
      ]);

      if (flipRes.status === 'fulfilled') {
        setFlipStatus(flipRes.value.data);
        setIsBroadcastingFlip(flipRes.value.data?.status === 'running');
      }
      if (promoRes.status === 'fulfilled') {
        setPromoStatus(promoRes.value.data);
        setIsBroadcastingPromo(promoRes.value.data?.status === 'running');
      }
      if (gramRes.status === 'fulfilled') {
        setGramStatus(gramRes.value.data);
        setIsBroadcastingGram(gramRes.value.data?.status === 'running');
      }
      if (customRes.status === 'fulfilled') {
        setCustomStatus(customRes.value.data);
        setIsBroadcastingCustom(customRes.value.data?.status === 'running');
      }
      if (autoGramRes.status === 'fulfilled' && autoGramRes.value.data) {
        setAutoGramSettings(autoGramRes.value.data);
      }
    } catch (_) {}
  };

  // Heartbeat background sync
  useEffect(() => {
    fetchAllStatuses();
    const anyRunning = isBroadcastingFlip || isBroadcastingPromo || isBroadcastingGram || isBroadcastingCustom;
    const interval = setInterval(fetchAllStatuses, anyRunning ? 1500 : 30000);
    return () => clearInterval(interval);
  }, [isBroadcastingFlip, isBroadcastingPromo, isBroadcastingGram, isBroadcastingCustom]);

  const handleCancel = async (type) => {
    if (!window.confirm(`Stop and cancel the ${type.toUpperCase()} broadcast?`)) return;
    try {
      await api.post(`/broadcast/cancel/${type}`);
      toast.success('Broadcast stop requested');
      fetchAllStatuses();
    } catch (err) {
      toast.error('Failed to cancel broadcast');
    }
  };

  const handleSelectFlipTemplate = (idx) => {
    setFlipTemplateIndex(idx);
    setFlipCustomText(flipTemplates[idx].text);
  };

  const handleSendCustom = async () => {
    if (!message.trim()) {
      toast.error('Message cannot be empty');
      return;
    }
    const confirmMsg = customTarget === 'admin'
      ? 'Send custom broadcast to ADMIN ONLY (8823265955)?'
      : 'Broadcast custom message to ALL active users?';

    if (!window.confirm(confirmMsg)) return;

    try {
      setCustomStatus({
        target: customTarget,
        total: 0,
        success: 0,
        failed: 0,
        status: 'running',
        currentIdx: 0
      });
      setIsBroadcastingCustom(true);
      await api.post('/broadcast', { message, target: customTarget });
      toast.success('Custom broadcast started!');
      setMessage('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send broadcast');
      setIsBroadcastingCustom(false);
      setCustomStatus(null);
    }
  };

  const handleSendPromo = async () => {
    if (!promoCode.trim()) {
      toast.error('Promo Code cannot be empty');
      return;
    }
    const confirmMsg = target === 'admin' 
      ? 'Send promo code to ADMIN ONLY (8823265955)?' 
      : 'Broadcast promo code to ALL active users?';

    if (!window.confirm(confirmMsg)) return;

    try {
      setPromoStatus({
        code: promoCode.toUpperCase(),
        target,
        total: 0,
        success: 0,
        failed: 0,
        status: 'running',
        currentIdx: 0
      });
      setIsBroadcastingPromo(true);
      await api.post('/broadcast/promo', { code: promoCode, target });
      toast.success('Promo code broadcast started!');
      setPromoCode('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start broadcast');
      setIsBroadcastingPromo(false);
      setPromoStatus(null);
    }
  };

  const handleSendFlip = async () => {
    if (!flipCustomText.trim()) {
      toast.error('Cyber Flip message content cannot be empty');
      return;
    }

    const confirmMsg = flipTarget === 'admin'
      ? 'Send Cyber Flip Broadcast preview to ADMIN ONLY (8823265955)?'
      : 'Broadcast Cyber Flip announcement to ALL active users?';

    if (!window.confirm(confirmMsg)) return;

    try {
      setFlipStatus({
        target: flipTarget,
        total: 0,
        success: 0,
        failed: 0,
        status: 'running',
        currentIdx: 0
      });
      setIsBroadcastingFlip(true);
      await api.post('/broadcast/flip', { 
        message: flipCustomText, 
        target: flipTarget,
        button_text: flipButtonText
      });
      toast.success('Cyber Flip broadcast started!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start Cyber Flip broadcast');
      setIsBroadcastingFlip(false);
      setFlipStatus(null);
    }
  };

  const handleSendGram = async () => {
    const confirmMsg = gramTarget === 'admin'
      ? 'Send GRAM Currency broadcast test to ADMIN ONLY (8823265955)?'
      : 'Broadcast GRAM Currency announcement to ALL eligible users?';

    if (!window.confirm(confirmMsg)) return;

    try {
      setGramStatus({
        target: gramTarget,
        total: 0,
        success: 0,
        failed: 0,
        status: 'running',
        currentIdx: 0
      });
      setIsBroadcastingGram(true);
      await api.post('/broadcast/gram-reminder', { 
        target: gramTarget,
        templateIndex: gramTemplateIndex
      });
      toast.success('GRAM Currency broadcast started!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start GRAM broadcast');
      setIsBroadcastingGram(false);
      setGramStatus(null);
    }
  };

  const handleToggleAutoGram = async (forceState) => {
    const nextEnabled = forceState !== undefined ? forceState : !autoGramSettings?.enabled;
    const actionText = nextEnabled
      ? 'Enable automated HOURLY broadcast reminder to all eligible users (unbanned users who have not claimed in 24h)?'
      : 'Disable automated HOURLY broadcast reminders?';

    if (!window.confirm(actionText)) return;

    try {
      setIsTogglingAutoGram(true);
      const { data } = await api.post('/broadcast/toggle-auto-gram', {
        enabled: nextEnabled,
        templateIndex: gramTemplateIndex
      });
      if (data.success) {
        setAutoGramSettings(data.settings);
        toast.success(nextEnabled ? 'Hourly Auto-Broadcast ENABLED! 🚀' : 'Hourly Auto-Broadcast DISABLED ⏹️');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to toggle Auto-Broadcast');
    } finally {
      setIsTogglingAutoGram(false);
    }
  };

  return (
    <div className="p-4 md:p-10 pb-20 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-ink mb-2 tracking-tight">Global Broadcasts</h1>
        <p className="text-ink-soft text-sm md:text-base">Push notifications and announcements directly to every user's Telegram account.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* CARD 1: CYBER FLIP (HEADS OR TAILS) BROADCASTER */}
        <div className="flex flex-col gap-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-4 flex gap-3 items-start shadow-sm shadow-amber-500/5">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 font-bold">
              <Coins size={18} />
            </div>
            <div>
              <h3 className="text-amber-400 font-bold mb-0.5 text-sm leading-tight">🪙 Cyber Flip (1.90X) Broadcaster</h3>
              <p className="text-amber-400/80 text-[11px]">
                Broadcast 1.90X instant payout Cyber Flip coin toss launch with direct Mini App deep link.
              </p>
            </div>
          </div>

          <div className="bg-surface-soft border border-amber-500/30 rounded-3xl p-5 shadow-xl shadow-black/20 relative overflow-hidden flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              
              {/* Target Selector */}
              <div>
                <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block mb-1.5">
                  1. Broadcast Target
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFlipTarget('admin')}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-black border transition-all ${
                      flipTarget === 'admin'
                        ? 'bg-amber-500 text-black border-amber-400 shadow-md font-black'
                        : 'bg-black/30 text-ink-soft border-white/10 hover:text-white'
                    }`}
                  >
                    🧪 Admin Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlipTarget('all')}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-black border transition-all ${
                      flipTarget === 'all'
                        ? 'bg-amber-500 text-black border-amber-400 shadow-md font-black'
                        : 'bg-black/30 text-ink-soft border-white/10 hover:text-white'
                    }`}
                  >
                    📢 All Users
                  </button>
                </div>
              </div>

              {/* Button Text Selector */}
              <div>
                <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <Zap size={12} className="text-amber-400" />
                  2. Telegram Inline Button Text
                </label>
                <input
                  type="text"
                  value={flipButtonText}
                  onChange={(e) => setFlipButtonText(e.target.value)}
                  placeholder="Button Label..."
                  className="w-full bg-[#0a0f1c] border border-border/50 rounded-xl px-3 py-2 text-ink text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Variant Selector */}
              <div>
                <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block mb-1.5">
                  3. Text Template Variant
                </label>
                <div className="space-y-1">
                  {flipTemplates.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectFlipTemplate(idx)}
                      className={`w-full text-left py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition-all ${
                        flipTemplateIndex === idx
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-black/20 text-ink-soft border-white/5 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Editor */}
              <div>
                <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block mb-1.5">
                  4. Message Content (HTML Supported)
                </label>
                <textarea
                  value={flipCustomText}
                  onChange={(e) => setFlipCustomText(e.target.value)}
                  rows={4}
                  className="w-full bg-[#0a0f1c] border border-border/50 rounded-xl p-3 text-ink text-[11px] font-mono focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Live Status Widget */}
              <StatusWidget status={flipStatus} themeColor="amber" onCancel={handleCancel} type="flip" />
            </div>

            {/* Action Button */}
            <button
              onClick={handleSendFlip}
              disabled={isBroadcastingFlip || !flipCustomText.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-95 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isBroadcastingFlip ? <RefreshCw size={14} className="animate-spin text-black" /> : <Send size={14} className="text-black" />}
              <span>{flipTarget === 'admin' ? 'Test Flip Broadcast (Admin)' : 'Broadcast Flip to ALL'}</span>
            </button>
          </div>
        </div>

        {/* CARD 2: GRAM CURRENCY BROADCASTER */}
        <div className="flex flex-col gap-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-4 flex gap-3 items-start shadow-sm shadow-emerald-500/5">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
              <Gem size={18} />
            </div>
            <div>
              <h3 className="text-emerald-400 font-bold mb-0.5 text-sm leading-tight">💎 GRAM Currency Broadcaster</h3>
              <p className="text-emerald-400/80 text-[11px]">
                Broadcast daily 0.02 GRAM quest rewards & 0.05 GRAM withdrawal limit updates.
              </p>
            </div>
          </div>

          <div className="bg-surface-soft border border-emerald-500/30 rounded-3xl p-5 shadow-xl shadow-black/20 relative overflow-hidden flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              
              {/* Target Selector */}
              <div>
                <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block mb-1.5">
                  1. Target Audience
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGramTarget('admin')}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-black border transition-all ${
                      gramTarget === 'admin'
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                        : 'bg-black/30 text-ink-soft border-white/10 hover:text-white'
                    }`}
                  >
                    🧪 Admin Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setGramTarget('all')}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-black border transition-all ${
                      gramTarget === 'all'
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                        : 'bg-black/30 text-ink-soft border-white/10 hover:text-white'
                    }`}
                  >
                    📢 All Active Users
                  </button>
                </div>
              </div>

              {/* Variant Selector */}
              <div>
                <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block mb-1.5">
                  2. Select Message Variant
                </label>
                <div className="space-y-1">
                  {gramTemplates.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setGramTemplateIndex(idx)}
                      className={`w-full text-left py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition-all ${
                        gramTemplateIndex === idx
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-black/20 text-ink-soft border-white/5 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Box */}
              <div>
                <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block mb-1.5">
                  3. Template Preview
                </label>
                <div className="bg-[#0a0f1c] border border-emerald-500/20 rounded-xl p-3 text-[11px] font-mono text-emerald-200/90 whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {gramTemplates[gramTemplateIndex]?.text}
                </div>
              </div>

              {/* Live Status Widget */}
              <StatusWidget status={gramStatus} themeColor="emerald" onCancel={handleCancel} type="gram" />

              {/* Hourly Auto-Broadcast Control Section */}
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${autoGramSettings?.enabled ? 'bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/50' : 'bg-slate-500'}`}></div>
                    <span className="text-[11px] font-black text-ink uppercase tracking-wider flex items-center gap-1">
                      <Clock size={12} className="text-emerald-400" />
                      Automated Hourly Broadcast
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    autoGramSettings?.enabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-white/5 text-ink-soft border-white/10'
                  }`}>
                    {autoGramSettings?.enabled ? '🟢 ACTIVE' : '🔴 OFF'}
                  </span>
                </div>

                <p className="text-[11px] text-emerald-200/70 leading-relaxed font-sans">
                  {autoGramSettings?.enabled 
                    ? `Auto-dispatches Variant #${(autoGramSettings.templateIndex ?? gramTemplateIndex) + 1} every 60 mins to unbanned users who haven't claimed in 24h.`
                    : 'Automatically sends GRAM reminder every hour to eligible users to boost ad views.'
                  }
                </p>

                {autoGramSettings?.enabled && (
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold bg-black/40 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 text-emerald-300">
                    <span>Runs: {autoGramSettings.runCount || 0}</span>
                    <span>Next: {autoGramSettings.nextRunAt ? new Date(autoGramSettings.nextRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleToggleAutoGram()}
                  disabled={isTogglingAutoGram}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    autoGramSettings?.enabled
                      ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40 shadow-md shadow-rose-500/10'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                  }`}
                >
                  {isTogglingAutoGram ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : autoGramSettings?.enabled ? (
                    <>
                      <span>⏹️ Disable Hourly Auto-Broadcast</span>
                    </>
                  ) : (
                    <>
                      <Clock size={13} className="text-emerald-400" />
                      <span>⏰ Enable Hourly Auto-Broadcast</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleSendGram}
              disabled={isBroadcastingGram}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isBroadcastingGram ? <RefreshCw size={14} className="animate-spin" /> : <Gem size={14} />}
              <span>{gramTarget === 'admin' ? 'Test GRAM Broadcast (Admin)' : 'Broadcast GRAM to ALL'}</span>
            </button>
          </div>
        </div>

        {/* CARD 3: PROMO CODE BROADCASTER */}
        <div className="flex flex-col gap-4">
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-4 flex gap-3 items-start shadow-sm shadow-indigo-500/5">
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 font-bold">
              <Code size={18} />
            </div>
            <div>
              <h3 className="text-indigo-400 font-bold mb-0.5 text-sm leading-tight">🎁 Promo Code Broadcaster</h3>
              <p className="text-indigo-400/80 text-[11px]">
                Broadcast promo reward codes directly to user Telegram accounts.
              </p>
            </div>
          </div>

          <div className="bg-surface-soft border border-indigo-500/30 rounded-3xl p-5 shadow-xl shadow-black/20 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block mb-1.5">
                  1. Promo Code
                </label>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="e.g. TASKY100"
                  className="w-full bg-[#0a0f1c] border border-border/50 rounded-xl p-3 text-ink text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block mb-1.5">
                  2. Target Audience
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTarget('admin')}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-black border transition-all ${
                      target === 'admin'
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                        : 'bg-black/30 text-ink-soft border-white/10 hover:text-white'
                    }`}
                  >
                    🧪 Admin Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setTarget('all')}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-black border transition-all ${
                      target === 'all'
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                        : 'bg-black/30 text-ink-soft border-white/10 hover:text-white'
                    }`}
                  >
                    📢 All Users
                  </button>
                </div>
              </div>

              {/* Live Status Widget */}
              <StatusWidget status={promoStatus} themeColor="indigo" onCancel={handleCancel} type="promo" />
            </div>

            <button
              onClick={handleSendPromo}
              disabled={isBroadcastingPromo || !promoCode.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:opacity-95 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isBroadcastingPromo ? <RefreshCw size={14} className="animate-spin" /> : <Gift size={14} />}
              <span>{target === 'admin' ? 'Test Promo Broadcast (Admin)' : 'Broadcast Promo Code to ALL'}</span>
            </button>
          </div>
        </div>

        {/* CARD 4: RAW CUSTOM BROADCASTER */}
        <div className="flex flex-col gap-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-4 flex gap-3 items-start shadow-sm shadow-amber-500/5">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 font-bold">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-amber-500 font-bold mb-0.5 text-sm leading-tight">Custom Global Broadcast</h3>
              <p className="text-amber-500/80 text-[11px]">
                Send custom raw HTML messages to active users in database.
              </p>
            </div>
          </div>

          <div className="bg-surface-soft border border-amber-500/30 rounded-3xl p-5 shadow-xl shadow-black/20 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block mb-1.5">
                  1. Target Audience
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomTarget('admin')}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-black border transition-all ${
                      customTarget === 'admin'
                        ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                        : 'bg-black/30 text-ink-soft border-white/10 hover:text-white'
                    }`}
                  >
                    🧪 Admin Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomTarget('all')}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-black border transition-all ${
                      customTarget === 'all'
                        ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                        : 'bg-black/30 text-ink-soft border-white/10 hover:text-white'
                    }`}
                  >
                    📢 All Users
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block mb-1.5">
                  2. Custom Message (HTML)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write custom message here..."
                  rows={5}
                  className="w-full bg-[#0a0f1c] border border-border/50 rounded-xl p-3 text-ink text-xs font-mono focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Live Status Widget */}
              <StatusWidget status={customStatus} themeColor="amber" onCancel={handleCancel} type="custom" />
            </div>

            <button
              onClick={handleSendCustom}
              disabled={isBroadcastingCustom || !message.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isBroadcastingCustom ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              <span>{customTarget === 'admin' ? 'Test Custom Broadcast (Admin)' : 'Broadcast Custom to ALL'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

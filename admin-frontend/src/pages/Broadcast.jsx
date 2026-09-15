import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Send, AlertTriangle, Code, RefreshCw, Gift, Rocket, Image as ImageIcon, Gem, Clock, Play, CheckCircle, Zap } from 'lucide-react';

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

  // NFT Miners Launch Broadcast State
  const [nftTarget, setNftTarget] = useState('admin'); // 'admin' or 'all'
  const [nftStatus, setNftStatus] = useState(null);
  const [isBroadcastingNft, setIsBroadcastingNft] = useState(false);
  const [nftTemplateIndex, setNftTemplateIndex] = useState(0);

  // GRAM Currency Broadcast State
  const [gramTarget, setGramTarget] = useState('admin'); // 'admin' or 'all'
  const [gramStatus, setGramStatus] = useState(null);
  const [isBroadcastingGram, setIsBroadcastingGram] = useState(false);
  const [gramTemplateIndex, setGramTemplateIndex] = useState(0);
  const [autoGramSettings, setAutoGramSettings] = useState(null);
  const [isTogglingAutoGram, setIsTogglingAutoGram] = useState(false);

  const bannerOptions = [
    {
      id: 'official',
      label: '🖼️ Official NFT Miners Promo Banner (0.7 & 1.5 GRAM)',
      url: 'https://tasky-ivho.onrender.com/uploads/nft_banner_official.jpg'
    },
    {
      id: 'none',
      label: '🚫 No Image (Text Only)',
      url: null
    }
  ];

  const [selectedImageUrl, setSelectedImageUrl] = useState(bannerOptions[0].url);

  const nftTemplates = [
    {
      label: 'Variant 1: High Yield Launch ⚡️',
      text: `🚀 <b>NEW FEATURE LAUNCH: TASKY NFT MINERS!</b> 💎\n\nTasky family, buy limited <b>Tasky NFT Digital Miners</b> and earn guaranteed daily GRAM returns!\n\n🚀 <b>Tasky Turbo Miner #02:</b> 1.0 GRAM ➔ 1.5 GRAM Total Return (10 Days)\n⚡️ <b>Tasky Mini Miner #01:</b> 0.5 GRAM ➔ 0.7 GRAM Total Return (10 Days)\n\n💎 <b>Instant Pay via Tonkeeper:</b> Direct 1-tap TON/GRAM deposit & instant on-chain verification!\n\n👉 <b>Tap below to claim your NFT Miner now:</b>`
    },
    {
      label: 'Variant 2: Passive Daily Income 📈',
      text: `🔥 <b>EARN PASSIVE GRAM EVERY DAY FOR 10 DAYS!</b> 🎁\n\nUnlock your personal Tasky NFT Miner and start mining daily GRAM rewards automatically!\n\n• <b>1.0 GRAM Turbo Miner:</b> Pays <b>+0.15 GRAM/day</b> for 10 Days (1.5 GRAM Total!)\n• <b>0.5 GRAM Mini Miner:</b> Pays <b>+0.07 GRAM/day</b> for 10 Days (0.7 GRAM Total!)\n\n⚡️ Transfer via Tonkeeper with zero admin wait time!\n\n💎 <b>Start Mining Today:</b>`
    },
    {
      label: 'Variant 3: Limited Stock Urgency 🚨',
      text: `🚨 <b>LIMITED NFT MINERS AVAILABLE - ACT FAST!</b> ⚡️\n\nOnly <b>100 Tasky NFT Miners</b> were generated for Season 2 launch!\n\n💰 Own a miner today to earn up to <b>1.5 GRAM</b> returned directly to your vault balance!\n\n👉 <b>Secure Your NFT Miner Before Stock Runs Out:</b>`
    },
    {
      label: 'Variant 4: Buy Once, Earn Daily 🏆',
      text: `🏆 <b>BUY ONCE. EARN GRAM DAILY FOR 10 DAYS!</b> 💎\n\nPurchase limited Tasky NFT miners to automatically generate guaranteed daily GRAM returns directly to your vault balance.\n\n✨ <b>140% Guaranteed ROI</b> over 10 days!\n\n👉 <b>Open Tasky & Activate Your Miner Now:</b>`
    },
    {
      label: 'Variant 5: Custom Message ✍️',
      text: `🚀 <b>TASKY SPECIAL ANNOUNCEMENT</b> 💎\n\nWrite your custom announcement message here...`
    }
  ];

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
      text: `🚨 <b>URGENT: Gram rewards are filling up fast!</b>\n\nDaily cap is reaching limit. Finish your 60 ads right now and secure your <b>0.02 GRAM</b> direct payout before it resets!\n\n💰 <b>Secure your payout here:</b>`
    },
    {
      label: 'Variant 5: Claim & Rank Up 🏆',
      text: `🏆 <b>Boost your Tasky status with free GRAM!</b>\n\nDaily active miners are already claiming. Watch your 60 ads to unlock <b>0.02 GRAM</b> and increase your daily rank!\n\n💎 <b>Claim & Rank Up:</b>`
    }
  ];

  const [nftCustomText, setNftCustomText] = useState(nftTemplates[0].text);

  const fetchAllStatuses = async () => {
    try {
      const [nftRes, promoRes, gramRes, customRes, autoGramRes] = await Promise.allSettled([
        api.get('/broadcast/nft-status'),
        api.get('/broadcast/promo-status'),
        api.get('/broadcast/gram-reminder-status'),
        api.get('/broadcast/custom-status'),
        api.get('/broadcast/auto-gram-status')
      ]);

      if (nftRes.status === 'fulfilled') {
        setNftStatus(nftRes.value.data);
        setIsBroadcastingNft(nftRes.value.data?.status === 'running');
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
    const anyRunning = isBroadcastingNft || isBroadcastingPromo || isBroadcastingGram || isBroadcastingCustom;
    const interval = setInterval(fetchAllStatuses, anyRunning ? 1500 : 4000);
    return () => clearInterval(interval);
  }, [isBroadcastingNft, isBroadcastingPromo, isBroadcastingGram, isBroadcastingCustom]);

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

  const handleSelectNftTemplate = (idx) => {
    setNftTemplateIndex(idx);
    setNftCustomText(nftTemplates[idx].text);
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

  const handleSendNft = async () => {
    if (!nftCustomText.trim()) {
      toast.error('NFT message content cannot be empty');
      return;
    }

    const confirmMsg = nftTarget === 'admin'
      ? 'Send NFT Miners Broadcast preview to ADMIN ONLY (8823265955)?'
      : 'Broadcast NFT Miners announcement to ALL active users?';

    if (!window.confirm(confirmMsg)) return;

    try {
      setNftStatus({
        target: nftTarget,
        total: 0,
        success: 0,
        failed: 0,
        status: 'running',
        currentIdx: 0
      });
      setIsBroadcastingNft(true);
      await api.post('/broadcast/nft', { 
        message: nftCustomText, 
        target: nftTarget,
        image_url: selectedImageUrl
      });
      toast.success('NFT Miners broadcast started!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start NFT broadcast');
      setIsBroadcastingNft(false);
      setNftStatus(null);
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
        
        {/* CARD 1: NFT DIGITAL MINERS LAUNCH BROADCASTER */}
        <div className="flex flex-col gap-4">
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-3xl p-4 flex gap-3 items-start shadow-sm shadow-purple-500/5">
            <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 font-bold">
              <Rocket size={18} />
            </div>
            <div>
              <h3 className="text-purple-400 font-bold mb-0.5 text-sm leading-tight">✨ NFT Miners Broadcaster</h3>
              <p className="text-purple-400/80 text-[11px]">
                Announce new NFT Miners with attached promo banners and deposit links.
              </p>
            </div>
          </div>

          <div className="bg-surface-soft border border-purple-500/30 rounded-3xl p-5 shadow-xl shadow-black/20 relative overflow-hidden flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              
              {/* Target Selector */}
              <div>
                <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block mb-1.5">
                  1. Broadcast Target
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNftTarget('admin')}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-black border transition-all ${
                      nftTarget === 'admin'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                        : 'bg-black/30 text-ink-soft border-white/10 hover:text-white'
                    }`}
                  >
                    🧪 Admin Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setNftTarget('all')}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-black border transition-all ${
                      nftTarget === 'all'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                        : 'bg-black/30 text-ink-soft border-white/10 hover:text-white'
                    }`}
                  >
                    📢 All Users
                  </button>
                </div>
              </div>

              {/* Banner Image Selector */}
              <div>
                <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <ImageIcon size={12} className="text-amber-400" />
                  2. Banner Image
                </label>
                <div className="space-y-1.5">
                  {bannerOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedImageUrl(opt.url)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl border text-[11px] font-bold transition-all ${
                        selectedImageUrl === opt.url
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                          : 'bg-black/20 text-ink-soft border-white/5 hover:text-white'
                      }`}
                    >
                      <span className="truncate pr-1">{opt.label}</span>
                      {opt.url && (
                        <img
                          src={opt.url}
                          alt="preview"
                          className="w-10 h-7 rounded-md object-cover border border-white/20 shrink-0"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variant Selector */}
              <div>
                <label className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block mb-1.5">
                  3. Text Variant
                </label>
                <div className="space-y-1">
                  {nftTemplates.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectNftTemplate(idx)}
                      className={`w-full text-left py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition-all ${
                        nftTemplateIndex === idx
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
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
                  4. Caption Editor (HTML)
                </label>
                <textarea
                  value={nftCustomText}
                  onChange={(e) => setNftCustomText(e.target.value)}
                  rows={4}
                  className="w-full bg-[#0a0f1c] border border-border/50 rounded-xl p-3 text-ink text-[11px] font-mono focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Live Status Widget */}
              <StatusWidget status={nftStatus} themeColor="purple" onCancel={handleCancel} type="nft" />
            </div>

            {/* Action Button */}
            <button
              onClick={handleSendNft}
              disabled={isBroadcastingNft || !nftCustomText.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isBroadcastingNft ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              <span>{nftTarget === 'admin' ? 'Test NFT Broadcast (Admin)' : 'Broadcast NFT to ALL'}</span>
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

import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Send, AlertTriangle, Sparkles, Code, CheckCircle2, AlertCircle, RefreshCw, Gift, Rocket, Zap, Image as ImageIcon } from 'lucide-react';

export default function Broadcast() {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

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

  const bannerOptions = [
    {
      id: 'banner1',
      label: '🖼️ Banner 1 (App Mockups)',
      url: 'https://tasky-ivho.onrender.com/uploads/nft_banner_1.png'
    },
    {
      id: 'banner2',
      label: '🖼️ Banner 2 (Neon Cyberpunk)',
      url: 'https://tasky-ivho.onrender.com/uploads/nft_banner_2.png'
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
      text: `🚀 <b>NEW FEATURE LAUNCH: NFT DIGITAL MINERS!</b> 💎\n\nTasky family, buy limited <b>NFT Digital Miners</b> and earn guaranteed daily GRAM returns!\n\n⚡️ <b>Gram Mini Miner #01:</b> 0.5 GRAM ➔ 1.0 GRAM Total Return (10 Days)\n🚀 <b>Gram Turbo Miner #02:</b> 1.0 GRAM ➔ 1.5 GRAM Total Return (10 Days)\n\n💎 <b>Instant Pay via Tonkeeper:</b> Direct 1-tap TON/GRAM deposit & instant on-chain verification!\n\n👉 <b>Tap below to claim your NFT Miner now:</b>`
    },
    {
      label: 'Variant 2: Passive Daily Income 📈',
      text: `🔥 <b>EARN PASSIVE GRAM EVERY DAY FOR 10 DAYS!</b> 🎁\n\nUnlock your personal NFT Miner and start mining daily GRAM rewards automatically!\n\n• <b>0.5 GRAM Miner:</b> Pays <b>+0.10 GRAM/day</b> for 10 Days (2x Return!)\n• <b>1.0 GRAM Miner:</b> Pays <b>+0.15 GRAM/day</b> for 10 Days (1.5x Return!)\n\n⚡️ Transfer via Tonkeeper with zero admin wait time!\n\n💎 <b>Start Mining Today:</b>`
    },
    {
      label: 'Variant 3: Limited Stock Urgency 🚨',
      text: `🚨 <b>LIMITED NFT MINERS AVAILABLE - ACT FAST!</b> ⚡️\n\nOnly <b>100 NFT Miners</b> were generated for Season 2 launch!\n\n💰 Own a miner today to earn up to <b>1.5 GRAM</b> returned directly to your vault balance!\n\n👉 <b>Secure Your NFT Miner Before Stock Runs Out:</b>`
    }
  ];

  const [nftCustomText, setNftCustomText] = useState(nftTemplates[0].text);

  // Poll Promo Status
  useEffect(() => {
    let interval;
    if (isBroadcastingPromo) {
      interval = setInterval(async () => {
        try {
          const res = await api.get('/broadcast/promo-status');
          if (res.data) {
            setPromoStatus(res.data);
            if (res.data.status === 'completed') {
              setIsBroadcastingPromo(false);
              toast.success('Promo Code Broadcast completed successfully!');
            }
          }
        } catch (_) {}
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isBroadcastingPromo]);

  // Poll NFT Status
  useEffect(() => {
    let interval;
    if (isBroadcastingNft) {
      interval = setInterval(async () => {
        try {
          const res = await api.get('/broadcast/nft-status');
          if (res.data) {
            setNftStatus(res.data);
            if (res.data.status === 'completed') {
              setIsBroadcastingNft(false);
              toast.success('NFT Broadcast completed successfully!');
            }
          }
        } catch (_) {}
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isBroadcastingNft]);

  const handleSelectNftTemplate = (idx) => {
    setNftTemplateIndex(idx);
    setNftCustomText(nftTemplates[idx].text);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Message cannot be empty');
      return;
    }
    if (!window.confirm('Are you sure you want to send this message to ALL unbanned users?')) return;

    setIsSending(true);
    try {
      const res = await api.post('/broadcast', { message });
      toast.success(res.data.message || 'Broadcast started successfully!');
      setMessage('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send broadcast');
    } finally {
      setIsSending(false);
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

  const promoProgressPct = promoStatus?.total > 0 
    ? Math.round((promoStatus.currentIdx / promoStatus.total) * 100) 
    : 0;

  const nftProgressPct = nftStatus?.total > 0
    ? Math.round((nftStatus.currentIdx / nftStatus.total) * 100)
    : 0;

  return (
    <div className="p-4 md:p-10 pb-20 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-ink mb-2 tracking-tight">Global Broadcasts</h1>
        <p className="text-ink-soft text-sm md:text-base">Push notifications and announcements directly to every user's Telegram.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* ========================================================= */}
        {/* CARD 1: NFT DIGITAL MINERS LAUNCH BROADCASTER             */}
        {/* ========================================================= */}
        <div className="flex flex-col gap-6">
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-3xl p-5 flex gap-4 items-start shadow-sm shadow-purple-500/5">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 font-bold">
              <Rocket size={20} />
            </div>
            <div>
              <h3 className="text-purple-400 font-bold mb-1 text-base leading-tight">✨ NFT Miners Broadcaster</h3>
              <p className="text-purple-400/80 text-xs">
                Announce new NFT Digital Miners with attached high-resolution promo banners and direct deposit links.
              </p>
            </div>
          </div>

          <div className="bg-surface-soft border border-purple-500/30 rounded-3xl p-6 shadow-xl shadow-black/20 relative overflow-hidden flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Target Selector */}
              <div>
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-2">
                  1. Broadcast Target
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNftTarget('admin')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all ${
                      nftTarget === 'admin'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                        : 'bg-black/30 text-ink-soft border-white/10 hover:text-white'
                    }`}
                  >
                    🧪 Admin Only (Test)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNftTarget('all')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all ${
                      nftTarget === 'all'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                        : 'bg-black/30 text-ink-soft border-white/10 hover:text-white'
                    }`}
                  >
                    📢 All Active Users
                  </button>
                </div>
              </div>

              {/* Banner Image Selector */}
              <div>
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-amber-400" />
                  2. Select Attached Banner Image
                </label>
                <div className="space-y-2">
                  {bannerOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedImageUrl(opt.url)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        selectedImageUrl === opt.url
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                          : 'bg-black/20 text-ink-soft border-white/5 hover:text-white'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {opt.url && (
                        <img
                          src={opt.url}
                          alt="preview"
                          className="w-12 h-8 rounded-lg object-cover border border-white/20"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variant Selector */}
              <div>
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-2">
                  3. Message Text Variant
                </label>
                <div className="space-y-1.5">
                  {nftTemplates.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectNftTemplate(idx)}
                      className={`w-full text-left py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
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
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-2">
                  4. Custom Caption Editor (HTML Format)
                </label>
                <textarea
                  value={nftCustomText}
                  onChange={(e) => setNftCustomText(e.target.value)}
                  rows={5}
                  className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl p-3.5 text-ink text-xs font-mono focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Live Status Widget */}
              {nftStatus && (
                <div className="bg-black/40 border border-purple-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-purple-300 uppercase tracking-wider">
                      {nftStatus.status === 'running' ? '🚀 Broadcasting Photo Announcement...' : '✅ Photo Broadcast Completed'}
                    </span>
                    <span className="font-mono text-purple-400">{nftProgressPct}%</span>
                  </div>

                  <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${nftProgressPct}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                    <div className="bg-white/5 p-2 rounded-xl">
                      <p className="text-ink-soft">Target</p>
                      <p className="text-white text-xs font-mono">{nftStatus.total}</p>
                    </div>
                    <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                      <p className="text-emerald-400">Sent</p>
                      <p className="text-emerald-300 text-xs font-mono">{nftStatus.success}</p>
                    </div>
                    <div className="bg-red-500/10 p-2 rounded-xl border border-red-500/20">
                      <p className="text-red-400">Failed</p>
                      <p className="text-red-300 text-xs font-mono">{nftStatus.failed}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleSendNft}
                disabled={isBroadcastingNft || !nftCustomText.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:opacity-95 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
              >
                {isBroadcastingNft ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                <span>{nftTarget === 'admin' ? 'Test NFT Broadcast with Image (Admin)' : 'Broadcast Photo Announcement to ALL'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 2: PROMO CODE BROADCASTER                            */}
        {/* ========================================================= */}
        <div className="flex flex-col gap-6">
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-5 flex gap-4 items-start shadow-sm shadow-indigo-500/5">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 font-bold">
              <Code size={20} />
            </div>
            <div>
              <h3 className="text-indigo-400 font-bold mb-1 text-base leading-tight">🎁 Promo Code Broadcaster</h3>
              <p className="text-indigo-400/80 text-xs">
                Broadcast promo reward codes directly to user Telegram accounts.
              </p>
            </div>
          </div>

          <div className="bg-surface-soft border border-border rounded-3xl p-6 shadow-xl shadow-black/20 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-2">
                  Promo Code
                </label>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="e.g. TASKY100"
                  className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl p-3.5 text-ink text-sm font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-2">
                  Target Audience
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTarget('admin')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all ${
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
                    className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all ${
                      target === 'all'
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                        : 'bg-black/30 text-ink-soft border-white/10 hover:text-white'
                    }`}
                  >
                    📢 All Active Users
                  </button>
                </div>
              </div>

              {promoStatus && (
                <div className="bg-black/40 border border-indigo-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-indigo-300 uppercase tracking-wider">
                      {promoStatus.status === 'running' ? '🚀 Broadcasting Code...' : '✅ Promo Broadcast Completed'}
                    </span>
                    <span className="font-mono text-indigo-400">{promoProgressPct}%</span>
                  </div>

                  <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 rounded-full transition-all duration-300"
                      style={{ width: `${promoProgressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSendPromo}
              disabled={isBroadcastingPromo || !promoCode.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-teal-600 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
            >
              {isBroadcastingPromo ? <RefreshCw size={16} className="animate-spin" /> : <Gift size={16} />}
              <span>{target === 'admin' ? 'Test Promo Broadcast (Admin)' : 'Broadcast Promo Code to ALL'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 3: RAW CUSTOM BROADCASTER                            */}
        {/* ========================================================= */}
        <div className="flex flex-col gap-6">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 flex gap-4 items-start shadow-sm shadow-amber-500/5">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 font-bold">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-amber-500 font-bold mb-1 text-base leading-tight">Custom Global Broadcast</h3>
              <p className="text-amber-500/80 text-xs">
                Send custom raw HTML messages to all active users in the database.
              </p>
            </div>
          </div>

          <div className="bg-surface-soft border border-border rounded-3xl p-6 shadow-xl shadow-black/20 flex-1 flex flex-col justify-between space-y-4">
            <div>
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-2">
                Custom Message (HTML)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write custom message here..."
                rows={9}
                className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl p-3.5 text-ink text-xs font-mono focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <button
              onClick={handleSend}
              disabled={isSending || !message.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
            >
              {isSending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              <span>Send Custom Broadcast</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

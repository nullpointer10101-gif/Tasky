import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Send, AlertTriangle, Sparkles, Code, CheckCircle2, AlertCircle, RefreshCw, Gift } from 'lucide-react';

export default function Broadcast() {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // New state variables for Promo Code Broadcast
  const [promoCode, setPromoCode] = useState('');
  const [target, setTarget] = useState('admin'); // 'admin' or 'all'
  const [promoStatus, setPromoStatus] = useState(null);
  const [isBroadcastingPromo, setIsBroadcastingPromo] = useState(false);

  // New state variables for GRAM Claim Reminder
  const [gramTarget, setGramTarget] = useState('admin'); // 'admin' or 'all'
  const [gramStatus, setGramStatus] = useState(null);
  const [isBroadcastingGram, setIsBroadcastingGram] = useState(false);

  // Special Promo Broadcast State
  const [isSendingSpecial, setIsSendingSpecial] = useState(false);

  const [gramTemplateIndex, setGramTemplateIndex] = useState(0);

  const gramTemplates = [
    {
      label: 'Template 1 ⚠️',
      text: (
        <>
          ⚠️ <b>You have not claimed your daily GRAM reward yet!</b>
          {"\n\n"}
          Go complete your 60 daily ads now and claim your <b>0.02 GRAM</b> reward directly to your TON wallet!
          {"\n\n"}
          💎 <b>Claim your GRAM now:</b>
        </>
      )
    },
    {
      label: 'Template 2 🔥',
      text: (
        <>
          🔥 <b>Free GRAM waiting to be claimed!</b>
          {"\n\n"}
          Don't miss out on your daily yield. Watch your 60 short ads now and unlock <b>0.02 GRAM</b> paid instantly to your wallet!
          {"\n\n"}
          ⚡️ <b>Get your free GRAM tokens here:</b>
        </>
      )
    },
    {
      label: 'Template 3 🚀',
      text: (
        <>
          🚀 <b>Ad slots refreshed! Ready for GRAM?</b>
          {"\n\n"}
          Watch 60 ads inside the Tasky Mini App to grab your daily <b>0.02 GRAM</b> reward. Fast, easy, and direct to your TON wallet.
          {"\n\n"}
          👉 <b>Click below to start:</b>
        </>
      )
    }
  ];

  const handleSendSpecialPromo = async () => {
    if (!window.confirm('Are you sure you want to send the special 1 USDT + 20K TASKY promo broadcast preview to Telegram Admin?')) {
      return;
    }
    setIsSendingSpecial(true);
    try {
      const res = await api.post('/broadcast/special-promo');
      toast.success(res.data.message || 'Broadcast preview sent successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to trigger promo broadcast');
    } finally {
      setIsSendingSpecial(false);
    }
  };

  useEffect(() => {
    // Check status on mount
    const checkStatus = async () => {
      try {
        const res = await api.get('/broadcast/promo-status');
        if (res.data) {
          setPromoStatus(res.data);
          if (res.data.status === 'running') {
            setIsBroadcastingPromo(true);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    const checkGramStatus = async () => {
      try {
        const res = await api.get('/broadcast/gram-reminder-status');
        if (res.data) {
          setGramStatus(res.data);
          if (res.data.status === 'running') {
            setIsBroadcastingGram(true);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkStatus();
    checkGramStatus();
  }, []);

  useEffect(() => {
    let interval;
    if (isBroadcastingPromo) {
      interval = setInterval(async () => {
        try {
          const res = await api.get('/broadcast/promo-status');
          if (res.data) {
            setPromoStatus(res.data);
            if (res.data.status === 'done') {
              setIsBroadcastingPromo(false);
              toast.success('Promo Code Broadcast Complete! 🎉');
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isBroadcastingPromo]);

  useEffect(() => {
    let interval;
    if (isBroadcastingGram) {
      interval = setInterval(async () => {
        try {
          const res = await api.get('/broadcast/gram-reminder-status');
          if (res.data) {
            setGramStatus(res.data);
            if (res.data.status === 'done') {
              setIsBroadcastingGram(false);
              toast.success('GRAM Claim Reminder Broadcast Complete! 🎉');
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isBroadcastingGram]);

  const handleSendGramReminder = async () => {
    const confirmMsg = gramTarget === 'admin' 
      ? 'Are you sure you want to send the daily GRAM reminder to the ADMIN ONLY?' 
      : 'Are you sure you want to broadcast the daily GRAM reminder to ALL active users?';

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
      await api.post('/broadcast/gram-reminder', { target: gramTarget, templateIndex: gramTemplateIndex });
      toast.success('GRAM claim reminder broadcast started!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start broadcast');
      setIsBroadcastingGram(false);
      setGramStatus(null);
    }
  };

  const handleResetGramStatus = () => {
    setGramStatus(null);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    if (!window.confirm('Are you sure you want to send this message to ALL unbanned users?')) {
      return;
    }

    setIsSending(true);
    try {
      const res = await api.post('/broadcast', { message });
      toast.success(res.data.message || 'Broadcast started successfully!');
      setMessage(''); // Clear on success
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
      ? 'Are you sure you want to send this promo code to the ADMIN ONLY?' 
      : 'Are you sure you want to broadcast this promo code to ALL active users?';

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
      setPromoCode(''); // Clear input
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start broadcast');
      setIsBroadcastingPromo(false);
      setPromoStatus(null);
    }
  };

  const handleResetPromoStatus = () => {
    setPromoStatus(null);
  };

  const progressPct = promoStatus?.total > 0 
    ? Math.round((promoStatus.currentIdx / promoStatus.total) * 100) 
    : 0;

  const gramProgressPct = gramStatus?.total > 0 
    ? Math.round((gramStatus.currentIdx / gramStatus.total) * 100) 
    : 0;

  return (
    <div className="p-4 md:p-10 pb-20 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-ink mb-2 tracking-tight">Global Broadcasts</h1>
        <p className="text-ink-soft text-sm md:text-base">Push notifications and rewards directly to every active user's Telegram.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        
        {/* LEFT COLUMN: RAW MESSAGE BROADCAST */}
        <div className="flex flex-col gap-6">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 flex gap-4 items-start shadow-sm shadow-amber-500/5">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-amber-500 font-bold mb-1 text-base leading-tight">Custom Global Broadcast</h3>
              <p className="text-amber-500/80 text-xs">
                This sends a raw text message to your entire database. HTML formatting is supported (e.g. &lt;b&gt;bold&lt;/b&gt;, &lt;a href=\"url\"&gt;links&lt;/a&gt;). Requires Telegram Bot manual confirmation.
              </p>
            </div>
          </div>

          <div className="bg-surface-soft border border-border rounded-3xl p-6 md:p-8 shadow-xl shadow-black/20 relative overflow-hidden flex-1">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-ink-soft uppercase tracking-wider mb-3 pl-1">
                  <Sparkles size={14} className="text-indigo-400" />
                  Message Content
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="🚀 Massive new airdrop available! Complete the new task to earn 500 TASKY instantly!"
                  rows={8}
                  className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl p-5 text-ink placeholder:text-ink-faint focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all mb-6 resize-none shadow-inner text-sm font-medium"
                />
              </div>

              <button
                onClick={handleSend}
                disabled={isSending || !message.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-base shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all mt-auto"
              >
                {isSending ? (
                  <div className="flex items-center gap-2 animate-pulse">
                    <Send size={18} />
                    Sending Preview...
                  </div>
                ) : (
                  <>
                    <Send size={18} />
                    Send Custom Broadcast
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PROMO CODE BROADCAST */}
        <div className="flex flex-col gap-6">
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-5 flex gap-4 items-start shadow-sm shadow-indigo-500/5">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Code size={20} />
            </div>
            <div>
              <h3 className="text-indigo-400 font-bold mb-1 text-base leading-tight">Promo Code Broadcaster</h3>
              <p className="text-indigo-400/80 text-xs">
                Broadcasts a code to users using a beautiful predefined template. Offers options to test on admins first or send directly to all users.
              </p>
            </div>
          </div>

          <div className="bg-surface-soft border border-border rounded-3xl p-6 md:p-8 shadow-xl shadow-black/20 relative overflow-hidden flex-1">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              
              {promoStatus ? (
                // ACTIVE BROADCAST RUNNING OR COMPLETED VIEW
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                        {promoStatus.status === 'running' ? 'Sending Live' : 'Broadcast Finished'}
                      </span>
                      <h3 className="text-lg font-black text-ink mt-1.5">Code: {promoStatus.code}</h3>
                    </div>
                    {promoStatus.status === 'done' && (
                      <button onClick={handleResetPromoStatus} className="p-2 bg-surface hover:bg-border text-ink rounded-xl border border-border transition-colors">
                        <RefreshCw size={16} />
                      </button>
                    )}
                  </div>

                  {/* PROGRESS BAR */}
                  {promoStatus.status === 'running' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-ink-soft">
                        <span>Progress</span>
                        <span>{promoStatus.currentIdx} / {promoStatus.total} ({progressPct}%)</span>
                      </div>
                      <div className="w-full h-3 bg-surface border border-border rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* SUMMARY LOG */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-surface border border-border rounded-2xl p-4 text-center">
                      <p className="text-2xl font-black text-ink">{promoStatus.total}</p>
                      <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">Total Targets</p>
                    </div>
                    <div className="bg-surface border border-emerald-500/20 rounded-2xl p-4 text-center">
                      <p className="text-2xl font-black text-emerald-400">{promoStatus.success}</p>
                      <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider">Delivered</p>
                    </div>
                    <div className="bg-surface border border-rose-500/20 rounded-2xl p-4 text-center">
                      <p className="text-2xl font-black text-rose-400">{promoStatus.failed}</p>
                      <p className="text-[10px] font-bold text-rose-500/80 uppercase tracking-wider">Failed</p>
                    </div>
                  </div>

                  {promoStatus.status === 'done' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex gap-3 items-center">
                      <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
                      <div className="text-xs">
                        <p className="text-emerald-400 font-bold">Successfully completed!</p>
                        <p className="text-ink-soft mt-0.5">{promoStatus.success} messages delivered out of {promoStatus.total}. Failed: {promoStatus.failed}.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // FORM INPUT VIEW
                <div className="flex flex-col gap-6 h-full justify-between">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-ink-soft uppercase tracking-wider mb-2.5 pl-1">
                      Promo Code
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. SUMMER500" 
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="w-full pl-4 pr-4 py-3 bg-[#0a0f1c] border border-border/50 rounded-2xl text-ink font-bold uppercase tracking-wider placeholder:normal-case placeholder:text-ink-faint focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all mb-4 text-sm"
                    />

                    <label className="flex items-center gap-2 text-xs font-bold text-ink-soft uppercase tracking-wider mb-3 pl-1">
                      Target Audience
                    </label>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <button
                        onClick={() => setTarget('admin')}
                        className={`py-3 rounded-2xl border text-xs font-black transition-colors ${
                          target === 'admin' 
                            ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' 
                            : 'bg-surface border-border text-ink-soft hover:text-ink'
                        }`}
                      >
                        🧪 Send Admin Only (Test)
                      </button>
                      <button
                        onClick={() => setTarget('all')}
                        className={`py-3 rounded-2xl border text-xs font-black transition-colors ${
                          target === 'all' 
                            ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' 
                            : 'bg-surface border-border text-ink-soft hover:text-ink'
                        }`}
                      >
                        📢 Send to All Users
                      </button>
                    </div>

                    {/* Predefined message template preview */}
                    <div className="bg-[#0a0f1c] border border-border/40 rounded-2xl p-4">
                      <p className="text-[10px] font-black uppercase text-ink-soft tracking-wider mb-2 border-b border-border/40 pb-1.5">Predefined Template Preview</p>
                      <div className="text-xs font-medium text-ink-soft space-y-2 whitespace-pre-line leading-relaxed">
                        🎉 <b>NEW PROMO CODE RELEASED!</b> 🎉
                        {"\n"}
                        Claim your reward now using this code inside the app:
                        👉 <b>{promoCode.toUpperCase() || 'CODE'}</b> 👈
                        {"\n"}
                        🚀 Open the app and enter the code to redeem!
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSendPromo}
                    disabled={isBroadcastingPromo || !promoCode.trim()}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-base shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all mt-6"
                  >
                    <Send size={18} />
                    Broadcast Promo Code
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* NEW THIRD COLUMN: GRAM CLAIM REMINDER */}
        <div className="flex flex-col gap-6">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 flex gap-4 items-start shadow-sm shadow-amber-500/5">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-amber-500 font-bold mb-1 text-base leading-tight">Gram Claim Reminder</h3>
              <p className="text-amber-500/80 text-xs">
                Broadcasts the daily GRAM claim reminder template. Offers options to test on admins first or send directly to all users.
              </p>
            </div>
          </div>

          <div className="bg-surface-soft border border-border rounded-3xl p-6 md:p-8 shadow-xl shadow-black/20 relative overflow-hidden flex-1">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              {gramStatus ? (
                // ACTIVE BROADCAST RUNNING OR COMPLETED VIEW
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                        {gramStatus.status === 'running' ? 'Sending Live' : 'Broadcast Finished'}
                      </span>
                      <h3 className="text-lg font-black text-ink mt-1.5">GRAM Reminder</h3>
                    </div>
                    {gramStatus.status === 'done' && (
                      <button onClick={handleResetGramStatus} className="p-2 bg-surface hover:bg-border text-ink rounded-xl border border-border transition-colors">
                        <RefreshCw size={16} />
                      </button>
                    )}
                  </div>

                  {/* PROGRESS BAR */}
                  {gramStatus.status === 'running' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-ink-soft">
                        <span>Progress</span>
                        <span>{gramStatus.currentIdx} / {gramStatus.total} ({gramProgressPct}%)</span>
                      </div>
                      <div className="w-full h-3 bg-surface border border-border rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full transition-all duration-300"
                          style={{ width: `${gramProgressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* SUMMARY LOG */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-surface border border-border rounded-2xl p-4 text-center">
                      <p className="text-2xl font-black text-ink">{gramStatus.total}</p>
                      <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">Total Targets</p>
                    </div>
                    <div className="bg-surface border border-emerald-500/20 rounded-2xl p-4 text-center">
                      <p className="text-2xl font-black text-emerald-400">{gramStatus.success}</p>
                      <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider">Delivered</p>
                    </div>
                    <div className="bg-surface border border-rose-500/20 rounded-2xl p-4 text-center">
                      <p className="text-2xl font-black text-rose-400">{gramStatus.failed}</p>
                      <p className="text-[10px] font-bold text-rose-500/80 uppercase tracking-wider">Failed</p>
                    </div>
                  </div>

                  {gramStatus.status === 'done' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex gap-3 items-center">
                      <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
                      <div className="text-xs">
                        <p className="text-emerald-400 font-bold">Successfully completed!</p>
                        <p className="text-ink-soft mt-0.5">{gramStatus.success} messages delivered out of {gramStatus.total}. Failed: {gramStatus.failed}.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // FORM INPUT VIEW
                <div className="flex flex-col gap-6 h-full justify-between">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-ink-soft uppercase tracking-wider mb-3 pl-1">
                      Target Audience
                    </label>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <button
                        onClick={() => setGramTarget('admin')}
                        className={`py-3 rounded-2xl border text-xs font-black transition-colors ${
                          gramTarget === 'admin' 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                            : 'bg-surface border-border text-ink-soft hover:text-ink'
                        }`}
                      >
                        🧪 Send Admin Only (Test)
                      </button>
                      <button
                        onClick={() => setGramTarget('all')}
                        className={`py-3 rounded-2xl border text-xs font-black transition-colors ${
                          gramTarget === 'all' 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                            : 'bg-surface border-border text-ink-soft hover:text-ink'
                        }`}
                      >
                        📢 Send to All Users
                      </button>
                    </div>

                    {/* Template Selector */}
                    <label className="flex items-center gap-2 text-xs font-bold text-ink-soft uppercase tracking-wider mb-3 pl-1">
                      Choose Template
                    </label>
                    <div className="grid grid-cols-3 gap-2 mb-6">
                      {gramTemplates.map((tmpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setGramTemplateIndex(idx)}
                          className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                            gramTemplateIndex === idx 
                              ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.2)]' 
                              : 'bg-surface border-border/50 text-ink-soft hover:text-ink hover:bg-white/5'
                          }`}
                        >
                          {tmpl.label}
                        </button>
                      ))}
                    </div>

                    {/* Predefined message template preview */}
                    <div className="bg-[#0a0f1c] border border-border/40 rounded-2xl p-4">
                      <p className="text-[10px] font-black uppercase text-ink-soft tracking-wider mb-2 border-b border-border/40 pb-1.5">Predefined Template Preview</p>
                      <div className="text-xs font-medium text-ink-soft space-y-2 whitespace-pre-line leading-relaxed">
                        {gramTemplates[gramTemplateIndex].text}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSendGramReminder}
                    disabled={isBroadcastingGram}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-black text-base shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all mt-6"
                  >
                    <Send size={18} />
                    One-Click Broadcast GRAM Reminder
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOURTH COLUMN: SPECIAL PROMO (1 USDT + 20K TASKY) BROADCAST */}
        <div className="flex flex-col gap-6">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-5 flex gap-4 items-start shadow-sm shadow-emerald-500/5">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <Gift size={20} />
            </div>
            <div>
              <h3 className="text-emerald-500 font-bold mb-1 text-base leading-tight">Special Promo</h3>
              <p className="text-emerald-500/80 text-xs">
                Broadcasts the premium "1 USDT + 20,000 TASKY" 10-referral offer with an attached campaign image and inline claim button.
              </p>
            </div>
          </div>

          <div className="bg-surface-soft border border-border rounded-3xl p-6 md:p-8 shadow-xl shadow-black/20 relative overflow-hidden flex-1 animate-in fade-in duration-200">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex flex-col gap-6">
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-ink-soft uppercase tracking-wider mb-3 pl-1">
                    Template Details
                  </label>
                  
                  {/* Photo & Template Preview */}
                  <div className="bg-[#0a0f1c] border border-border/40 rounded-2xl p-4 space-y-3">
                    <p className="text-[10px] font-black uppercase text-ink-soft tracking-wider mb-1 border-b border-border/40 pb-1.5">Campaign Info</p>
                    <div className="aspect-video w-full rounded-lg bg-surface border border-border/50 flex flex-col items-center justify-center text-ink-soft gap-2 p-4 text-center">
                      <Gift size={24} className="text-emerald-400" />
                      <span className="text-[10px] font-bold">Campaign Banner Attached</span>
                    </div>
                    <div className="text-xs font-medium text-ink-soft space-y-2 whitespace-pre-line leading-relaxed">
                      🚨 <b>NEW 24H OFFER UNLOCKED!</b> 🚨
                      {"\n\n"}
                      You can now instantly claim a massive reward!
                      🎁 <b>1 USDT + 20,000 TASKY!</b>
                      {"\n\n"}
                      All you need is <b>10 friends</b>! 🤯
                    </div>
                    <div className="pt-2 border-t border-border/40">
                      <div className="w-full py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-center text-[10px] font-black tracking-wider uppercase">
                        🎁 CLAIM 1 USDT + 20K TASKY 🚀
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSendSpecialPromo}
                disabled={isSendingSpecial}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-905 font-black text-base shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all mt-6"
              >
                {isSendingSpecial ? (
                  <div className="flex items-center gap-2 animate-pulse">
                    <RefreshCw size={18} className="animate-spin" />
                    Sending Preview...
                  </div>
                ) : (
                  <>
                    <Send size={18} />
                    1-Click Send Special Promo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

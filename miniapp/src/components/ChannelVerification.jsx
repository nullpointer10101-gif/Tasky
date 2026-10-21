import React, { useState, useEffect, useCallback, useRef } from 'react';
import { verifyChannels, getChannelStatus } from '../api';
import { Send, CheckCircle2, AlertCircle, Loader2, Sparkles, Gem, Users, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '../App';
import triggerConfetti from '../confetti';

export default function ChannelVerification({ user, setUser, refreshUser, tgUser }) {
  const telegramId = user?.telegram_id || tgUser?.id || tgUser?.telegram_id || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  
  // Real-time backend status for each channel
  const [channelStatus, setChannelStatus] = useState({
    tasky_official: false,
    tasky_payouts: false,
    alphadrop: false,
    community: false,
    all_joined: false
  });

  const { showToast } = useToast() || { showToast: (msg) => alert(msg) };

  const storageKey = `tasky_channels_clicked_${telegramId || 'guest'}`;
  const [clickedChannels, setClickedChannels] = useState(() => {
    try {
      const saved = localStorage.getItem(`tasky_channels_clicked_${telegramId || 'guest'}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleClaim = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data, error } = await verifyChannels(telegramId);
      triggerConfetti({ particleCount: 150, spread: 90 });
      if (data?.reward_granted) {
        showToast('🎉 Welcome bonus claimed! +200 TASKY added to your balance.', 'success');
      } else {
        showToast('🎉 Welcome to Tasky!', 'success');
      }
      if (setUser) {
        setUser(prev => ({
          ...prev,
          ...(data?.user || {}),
          has_verified_channels: true,
          balance: data?.new_balance !== undefined ? data.new_balance : (data?.user?.balance ?? (Number(prev?.balance || 0) + (data?.reward_granted ? 200 : 0)))
        }));
      }
      if (refreshUser) {
        refreshUser().catch(() => {});
      }
    } catch (err) {
      console.error('Claim error:', err);
      // Even if network blips, unlock locally
      if (setUser) {
        setUser(prev => ({
          ...prev,
          has_verified_channels: true
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const checkLiveStatus = useCallback(async (silent = false, retries = 1) => {
    if (!telegramId) return;
    if (!silent) setCheckingStatus(true);
    try {
      const { data, error } = await getChannelStatus(telegramId);
      if (data && !error) {
        setChannelStatus(data);
      }
    } catch (e) {
      console.error('Channel status check error:', e);
    } finally {
      setCheckingStatus(false);
    }
  }, [telegramId]);

  // Keep a ref to channelStatus so the interval can read it without being a dep
  const channelStatusRef = useRef(channelStatus);
  useEffect(() => { channelStatusRef.current = channelStatus; }, [channelStatus]);

  useEffect(() => {
    // Initial check
    checkLiveStatus(false);

    // Gentle background poll (30s) while verification modal is open.
    const pollInterval = setInterval(() => {
      if (!channelStatusRef.current.all_joined) {
        checkLiveStatus(true, 0);
      }
    }, 30000);

    // Recheck once whenever user comes back to window/app after opening Telegram links
    const handleRecheck = () => {
      if (document.visibilityState === 'visible' || document.visibilityState === undefined) {
        checkLiveStatus(true, 1);
      }
    };

    document.addEventListener('visibilitychange', handleRecheck);
    window.addEventListener('focus', handleRecheck);

    if (window.Telegram?.WebApp?.onEvent) {
      window.Telegram.WebApp.onEvent('viewportChanged', handleRecheck);
    }

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleRecheck);
      window.removeEventListener('focus', handleRecheck);
      if (window.Telegram?.WebApp?.offEvent) {
        window.Telegram.WebApp.offEvent('viewportChanged', handleRecheck);
      }
    };
  }, [checkLiveStatus]);

  const openChannelLink = (channelId, url) => {
    // Record click locally
    setClickedChannels(prev => {
      const updated = { ...prev, [channelId]: true };
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    try {
      if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(url);
      } else {
        window.open(url, '_blank');
      }
    } catch (_) {
      window.open(url, '_blank');
    }
    // Background status check after user returns
    setTimeout(() => checkLiveStatus(true), 3000);
  };

  const channels = [
    {
      id: 'tasky_official',
      title: 'Tasky Official Channel',
      desc: 'News, announcements & promo codes',
      url: 'https://t.me/Tasky_Official',
      icon: Send,
      color: 'indigo',
      isJoined: Boolean(channelStatus.tasky_official || clickedChannels.tasky_official)
    },
    {
      id: 'tasky_payouts',
      title: 'Tasky Payouts 💎',
      desc: 'Real-time blockchain payment proofs',
      url: 'https://t.me/TaskyPayouts',
      icon: Gem,
      color: 'amber',
      isJoined: Boolean(channelStatus.tasky_payouts || clickedChannels.tasky_payouts)
    },
    {
      id: 'alphadrop',
      title: 'AlphaDrop Daily',
      desc: 'Exclusive airdrops, alpha & guides',
      url: 'https://t.me/AlphaDropDaily',
      icon: Send,
      color: 'cyan',
      isJoined: Boolean(channelStatus.alphadrop || clickedChannels.alphadrop)
    },
    {
      id: 'community',
      title: 'Official Community Group',
      desc: 'Chat with 10k+ earners & admin team',
      url: 'https://t.me/TaskyOfficialCommunity',
      icon: Users,
      color: 'violet',
      isJoined: Boolean(channelStatus.community || clickedChannels.community)
    }
  ];

  const clickedCount = channels.filter(c => c.isJoined).length;
  const allClicked = clickedCount === 4;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-bg px-5 py-6 text-center relative overflow-y-auto hide-scrollbar">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[50%] bg-[#3F00E7]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="z-10 max-w-sm w-full space-y-4 my-auto">
        
        {/* Top Header */}
        <div className="space-y-2 pt-1">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#3F00E7] via-indigo-600 to-amber-500 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(99,102,241,0.3)] border border-white/20">
            <Send size={30} className="text-white transform -rotate-12 translate-x-0.5" />
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-indigo-400">
            <Sparkles size={13} />
            <span>Community Verification</span>
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight leading-tight">
            Join Our 4 Channels
          </h1>

          <p className="text-xs text-white/60 leading-relaxed px-2">
            Click all 4 channels below to join our official communities and unlock your <strong>+200 TASKY</strong> welcome bonus.
          </p>

          {/* Progress bar */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between text-xs font-bold text-white/70">
            <div className="flex items-center gap-2">
              <span>Progress:</span>
              <span className={allClicked ? 'text-emerald-400 font-black' : 'text-amber-400 font-black'}>
                {allClicked ? 'All 4 Channels Visited ✓' : `${clickedCount} / 4 Visited`}
              </span>
            </div>
            <div className="text-[11px] text-white/50">
              {allClicked ? 'Ready to Claim!' : `${4 - clickedCount} remaining`}
            </div>
          </div>
        </div>

        {/* Channels List */}
        <div className="space-y-2.5">
          {channels.map(ch => {
            const Icon = ch.icon;
            const isDone = ch.isJoined;

            return (
              <div
                key={ch.id}
                onClick={() => openChannelLink(ch.id, ch.url)}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                  isDone
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-white/5 hover:bg-white/10 active:bg-white/15 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    isDone 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : ch.color === 'amber'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : ch.color === 'cyan'
                      ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                      : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-black text-white leading-tight truncate">{ch.title}</p>
                    <p className="text-[10px] text-white/50 truncate mt-0.5">{ch.desc}</p>
                  </div>
                </div>

                <div className="shrink-0">
                  {isDone ? (
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Visited ✓
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openChannelLink(ch.id, ch.url);
                      }}
                      className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm flex items-center gap-1 transition-all active:scale-95"
                    >
                      Join <ExternalLink size={10} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Welcome Reward Box */}
        <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/25 rounded-2xl p-3 flex items-center justify-between">
          <div className="text-left">
            <p className="text-[9px] text-amber-400/80 font-black uppercase tracking-wider leading-none">Welcome Bonus</p>
            <p className="text-base font-black text-amber-300 mt-1 leading-none">+200 TASKY Reward</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
            <Sparkles size={16} />
          </div>
        </div>

        {/* Claim / Unlock Action Button - ONLY VISIBLE ONCE ALL 4 CHANNELS ARE CLICKED */}
        {allClicked ? (
          <button
            onClick={handleClaim}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 text-slate-950 shadow-emerald-500/25 animate-pulse"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Claiming Reward...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                🎁 Claim +200 TASKY & Enter App
              </>
            )}
          </button>
        ) : (
          <div className="w-full py-3.5 px-4 rounded-2xl border border-white/10 bg-white/5 text-white/50 text-xs font-semibold flex items-center justify-center gap-2">
            <AlertCircle size={14} className="text-amber-400 shrink-0" />
            <span>Click & join all 4 channels above to reveal the Claim button</span>
          </div>
        )}

        {/* Quick helper */}
        <p className="text-[10.5px] text-white/40 flex items-center justify-center gap-1 pb-1">
          <Sparkles size={11} className="text-amber-400" />
          <span>Click each link to open Telegram, then return to claim.</span>
        </p>
      </div>
    </div>
  );
}

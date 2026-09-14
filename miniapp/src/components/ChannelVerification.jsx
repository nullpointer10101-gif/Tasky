import React, { useState, useEffect, useCallback } from 'react';
import { verifyChannels, getChannelStatus } from '../api';
import { Send, CheckCircle2, AlertCircle, Loader2, Sparkles, Gem, Users, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '../App';
import triggerConfetti from '../confetti';

export default function ChannelVerification({ user, refreshUser, tgUser }) {
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

  const checkLiveStatus = useCallback(async (silent = false, retries = 2) => {
    if (!telegramId) return;
    if (!silent) setCheckingStatus(true);
    try {
      const { data, error } = await getChannelStatus(telegramId);
      if (data && !error) {
        setChannelStatus(data);
        if (data.all_joined) {
          await refreshUser();
        }
      } else if (retries > 0) {
        setTimeout(() => checkLiveStatus(silent, retries - 1), 1500);
        return;
      }
    } catch (e) {
      console.error('Channel status check error:', e);
      if (retries > 0) {
        setTimeout(() => checkLiveStatus(silent, retries - 1), 1500);
        return;
      }
    } finally {
      setCheckingStatus(false);
    }
  }, [telegramId, refreshUser]);

  useEffect(() => {
    // Initial check
    checkLiveStatus(false);

    // Gentle background poll (30s) while verification modal is open
    // 30s is enough — Telegram membership propagates within seconds anyway
    const pollInterval = setInterval(() => {
      if (!channelStatus.all_joined) {
        checkLiveStatus(true, 0);
      }
    }, 30000);

    // Recheck whenever user comes back to window/app after opening Telegram links
    const handleRecheck = () => {
      if (document.visibilityState === 'visible' || document.visibilityState === undefined) {
        checkLiveStatus(true, 1);
        setTimeout(() => checkLiveStatus(true, 1), 1200);
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
  }, [checkLiveStatus, channelStatus.all_joined]);

  const openChannelLink = (url) => {
    try {
      if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(url);
      } else {
        window.open(url, '_blank');
      }
    } catch (_) {
      window.open(url, '_blank');
    }
    // Single delayed recheck after user returns from Telegram — saves 2 extra API calls per tap
    setTimeout(() => checkLiveStatus(true), 4000);
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const { data, error } = await verifyChannels(telegramId);
      if (error) {
        showToast(typeof error === 'string' ? error : 'Please join all 4 channels to unlock!', 'error');
        await checkLiveStatus(true);
      } else if (data && data.success) {
        triggerConfetti({ particleCount: 150, spread: 90 });
        if (data.reward_granted) {
          showToast('🎉 All 4 communities verified! +200 TASKY added to your balance.', 'success');
        } else {
          showToast('🎉 All 4 communities verified! Welcome to Tasky.', 'success');
        }
        await refreshUser();
      } else {
        showToast('Please join all 4 channels before continuing.', 'error');
        await checkLiveStatus(true);
      }
    } catch (err) {
      showToast('Connection error. Please make sure you joined all 4 channels and try again!', 'error');
      await checkLiveStatus(true);
    } finally {
      setLoading(false);
    }
  };


  const channels = [
    {
      id: 'tasky_official',
      title: 'Tasky Official Channel',
      desc: 'News, announcements & promo codes',
      url: 'https://t.me/Tasky_Official',
      icon: Send,
      color: 'indigo',
      isJoined: Boolean(channelStatus.tasky_official)
    },
    {
      id: 'tasky_payouts',
      title: 'Tasky Payouts 💎',
      desc: 'Real-time blockchain payment proofs',
      url: 'https://t.me/TaskyPayouts',
      icon: Gem,
      color: 'amber',
      isJoined: Boolean(channelStatus.tasky_payouts)
    },
    {
      id: 'alphadrop',
      title: 'AlphaDrop Daily',
      desc: 'Exclusive airdrops, alpha & guides',
      url: 'https://t.me/AlphaDropDaily',
      icon: Send,
      color: 'cyan',
      isJoined: Boolean(channelStatus.alphadrop)
    },
    {
      id: 'community',
      title: 'Official Community Group',
      desc: 'Chat with 10k+ earners & admin team',
      url: 'https://t.me/TaskyOfficialCommunity',
      icon: Users,
      color: 'violet',
      isJoined: Boolean(channelStatus.community)
    }
  ];

  const joinedCount = channels.filter(c => c.isJoined).length;

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
            Join all official communities below to unlock the app and claim your <strong>+200 TASKY</strong> welcome bonus.
          </p>

          {/* Progress bar */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between text-xs font-bold text-white/70">
            <div className="flex items-center gap-2">
              <span>Status:</span>
              <span className={joinedCount === 4 ? 'text-emerald-400 font-black' : 'text-amber-400 font-black'}>
                {checkingStatus ? 'Checking live membership...' : `${joinedCount} / 4 Joined`}
              </span>
            </div>
            <button
              onClick={() => checkLiveStatus(false)}
              disabled={checkingStatus}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
              title="Refresh status"
            >
              <RefreshCw size={13} className={checkingStatus ? 'animate-spin' : ''} />
            </button>
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
                onClick={() => !isDone && openChannelLink(ch.url)}
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
                      <CheckCircle2 size={12} /> Joined ✓
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openChannelLink(ch.url);
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

        {/* Action Button */}
        <button
          onClick={handleVerify}
          disabled={loading || checkingStatus}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 ${
            joinedCount === 4
              ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 text-slate-950 shadow-emerald-500/25'
              : 'bg-gradient-to-r from-[#3F00E7] via-indigo-600 to-indigo-700 text-white shadow-indigo-500/25'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Verifying 4 Channels...
            </>
          ) : joinedCount === 4 ? (
            <>
              <CheckCircle2 size={18} />
              ✓ Enter Tasky App Now
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              Verify & Unlock Tasky
            </>
          )}
        </button>

        {/* Quick helper */}
        <p className="text-[10.5px] text-white/40 flex items-center justify-center gap-1 pb-1">
          <AlertCircle size={11} />
          <span>Tap Join on unjoined channels, then tap Verify.</span>
        </p>
      </div>
    </div>
  );
}

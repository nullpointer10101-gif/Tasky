import React, { useState } from 'react';
import { verifyChannels } from '../api';
import { Send, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '../App';

export default function ChannelVerification({ user, refreshUser, tgUser }) {
  const [loading, setLoading] = useState(false);
  const [clickedChannel, setClickedChannel] = useState(false);
  const [clickedCommunity, setClickedCommunity] = useState(false);
  const [clickedAlphaDrop, setClickedAlphaDrop] = useState(false);
  const { showToast } = useToast() || { showToast: (msg) => alert(msg) };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const { data, error } = await verifyChannels(tgUser.id);
      if (error) {
        showToast(error, 'error');
      } else {
        showToast('🎉 Joined successfully! 200 TASKY added to your balance.', 'success');
        await refreshUser();
      }
    } catch (err) {
      showToast('Connection failed. Please try again!', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-bg px-6 text-center relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[50%] bg-[#3F00E7]/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Header Container */}
      <div className="z-10 max-w-sm w-full space-y-6">
        {/* Logo Icon */}
        <div className="relative w-24 h-24 mx-auto animate-bounce duration-1000">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-md"></div>
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-[#3F00E7] to-indigo-500 flex items-center justify-center shadow-xl border border-white/20">
            <Send size={44} className="text-white transform -rotate-12 translate-x-0.5" />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest text-indigo-400">
            <Sparkles size={12} />
            <span>Important Verification</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Join Our Telegram Communities
          </h1>
          <p className="text-xs text-white/50 leading-relaxed px-4">
            To unlock the app and claim your welcome bonus, join the channels and community group.
          </p>
        </div>

        {/* Channels List */}
        <div className="space-y-3 pt-2">
          {/* Channel Card */}
          <a
            href="https://t.me/Tasky_Official"
            target="_blank"
            rel="noreferrer"
            onClick={() => setClickedChannel(true)}
            className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Send size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-white leading-tight">Official Channel</p>
                <p className="text-[10px] text-white/40">News, updates & promo codes</p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              clickedChannel 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-white/10 text-white border border-white/10 group-hover:bg-white/20'
            }`}>
              {clickedChannel ? 'Visited ✓' : 'Join'}
            </div>
          </a>

          {/* AlphaDrop Channel Card */}
          <a
            href="https://t.me/AlphaDropDaily"
            target="_blank"
            rel="noreferrer"
            onClick={() => setClickedAlphaDrop(true)}
            className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Send size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-white leading-tight">AlphaDrop Daily</p>
                <p className="text-[10px] text-white/40">Exclusive crypto airdrops & news</p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              clickedAlphaDrop 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-white/10 text-white border border-white/10 group-hover:bg-white/20'
            }`}>
              {clickedAlphaDrop ? 'Visited ✓' : 'Join'}
            </div>
          </a>

          {/* Group Card */}
          <a
            href="https://t.me/TaskyOfficialCommunity"
            target="_blank"
            rel="noreferrer"
            onClick={() => setClickedCommunity(true)}
            className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Send size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-white leading-tight">Community Group</p>
                <p className="text-[10px] text-white/40">Chat with members & admins</p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              clickedCommunity 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-white/10 text-white border border-white/10 group-hover:bg-white/20'
            }`}>
              {clickedCommunity ? 'Visited ✓' : 'Join'}
            </div>
          </a>
        </div>

        {/* Claim Reward Box */}
        <div className="bg-gradient-to-r from-amber-500/5 to-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
          <div className="text-left">
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider leading-none">Welcome Reward</p>
            <p className="text-xl font-black text-amber-400 mt-1 leading-none">+200 TASKY</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Sparkles size={18} className="animate-spin duration-3000" />
          </div>
        </div>

        {/* Verify Action Button */}
        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#3F00E7] to-indigo-500 hover:opacity-90 active:scale-[0.98] text-white font-black text-sm tracking-wide shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:scale-100"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Verifying Membership...
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              Verify & Claim 200 TASKY
            </>
          )}
        </button>

        {/* Help Tip */}
        <p className="text-[10px] text-white/30 flex items-center justify-center gap-1">
          <AlertCircle size={10} />
          <span>Click all "Join" links before claiming.</span>
        </p>
      </div>
    </div>
  );
}

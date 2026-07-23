import React, { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Send, AlertTriangle, Sparkles } from 'lucide-react';

export default function Broadcast() {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

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

  return (
    <div className="p-4 md:p-10 pb-20 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-ink mb-2 tracking-tight">Global Broadcast</h1>
        <p className="text-ink-soft text-sm md:text-base">Push notifications directly to every active user's Telegram.</p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 mb-8 flex gap-4 items-start shadow-sm shadow-amber-500/5">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h3 className="text-amber-500 font-bold mb-1 text-lg leading-tight">Use With Caution</h3>
          <p className="text-amber-500/80 text-sm">
            This sends a real message to your entire database instantly. HTML formatting is supported (e.g. &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;, &lt;a href="url"&gt;links&lt;/a&gt;).
          </p>
        </div>
      </div>

      <div className="bg-surface-soft border border-border rounded-3xl p-6 md:p-8 shadow-xl shadow-black/20 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <label className="flex items-center gap-2 text-xs font-bold text-ink-soft uppercase tracking-wider mb-3 pl-1">
            <Sparkles size={14} className="text-indigo-400" />
            Message Content
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="🚀 Massive new airdrop available! Complete the new task to earn 500 TASKY instantly!"
            rows={8}
            className="w-full bg-[#0a0f1c] border border-border/50 rounded-2xl p-5 text-ink placeholder:text-ink-faint focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all mb-6 resize-none shadow-inner"
          />

          <button
            onClick={handleSend}
            disabled={isSending || !message.trim()}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all"
          >
            {isSending ? (
              <div className="flex items-center gap-2 animate-pulse">
                <Send size={20} />
                Sending Broadcast...
              </div>
            ) : (
              <>
                <Send size={20} />
                Send Broadcast
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

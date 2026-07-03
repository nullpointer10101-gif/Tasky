import React, { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Send, Users, AlertTriangle } from 'lucide-react';

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
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">Global Broadcast</h1>
        <p className="text-ink-soft">Send a direct message via the Telegram Bot to all your active users instantly.</p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-8 flex gap-4 items-start">
        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="text-amber-500 font-bold mb-1">Use With Caution</h3>
          <p className="text-amber-500/80 text-sm">
            This will send a real push notification to every single user in the database. HTML formatting is supported (e.g. &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;, &lt;a href="url"&gt;links&lt;/a&gt;).
          </p>
        </div>
      </div>

      <div className="bg-surface-soft border border-border rounded-3xl p-6">
        <label className="block text-sm font-bold text-ink-soft mb-2">Message Content (HTML Supported)</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="🚀 Massive new airdrop available! Complete the new task to earn 500 TASKY instantly!"
          rows={8}
          className="w-full bg-surface-dark border border-border rounded-xl p-4 text-white placeholder:text-ink-faint focus:outline-none focus:border-indigo-500 transition-colors mb-6 resize-none"
        />

        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={isSending || !message.trim()}
            className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"
          >
            {isSending ? (
              'Sending...'
            ) : (
              <>
                <Send size={18} />
                Send Broadcast
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { CheckCircle2, Copy, Search, ExternalLink, Loader2, Sparkles, X, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ApprovePayoutModal({
  isOpen,
  onClose,
  onConfirm,
  walletAddress,
  amount,
  token = 'GRAM',
  userName = 'User',
  isProcessing = false
}) {
  const [txHash, setTxHash] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detectedSource, setDetectedSource] = useState(null); // 'clipboard' | 'blockchain' | null

  useEffect(() => {
    if (!isOpen) {
      setTxHash('');
      setDetectedSource(null);
      setDetecting(false);
      return;
    }

    let isMounted = true;

    // 1. Try reading clipboard automatically
    const checkClipboard = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const clipText = await navigator.clipboard.readText();
          if (clipText && (clipText.includes('tonviewer') || clipText.includes('tonscan') || clipText.includes('ton.cx') || /^[a-fA-F0-9]{64}$/.test(clipText.trim()))) {
            if (isMounted) {
              const formatted = clipText.trim().startsWith('http') ? clipText.trim() : `https://tonviewer.com/transaction/${clipText.trim()}`;
              setTxHash(formatted);
              setDetectedSource('clipboard');
              toast.success('📋 Auto-pasted transaction link from clipboard!');
              return true;
            }
          }
        }
      } catch (e) {
        // Clipboard read permission might be denied or un-focused
      }
      return false;
    };

    // 2. Auto-detect from TonAPI Blockchain
    const autoDetectFromBlockchain = async (silent = true) => {
      if (!walletAddress) return;
      if (silent) setDetecting(true);
      try {
        const cleanAddr = walletAddress.trim();
        const res = await fetch(`https://tonapi.io/v2/blockchain/accounts/${encodeURIComponent(cleanAddr)}/transactions?limit=3`);
        if (!res.ok) throw new Error('TonAPI request failed');
        const data = await res.json();
        
        if (data && Array.isArray(data.transactions) && data.transactions.length > 0) {
          const latestTx = data.transactions[0];
          const txTime = latestTx.utime * 1000;
          const now = Date.now();
          const diffMinutes = (now - txTime) / (1000 * 60);

          // Check if transaction happened within the last 30 minutes
          if (diffMinutes <= 30 && latestTx.hash) {
            const tonviewerUrl = `https://tonviewer.com/transaction/${latestTx.hash}`;
            if (isMounted) {
              setTxHash(tonviewerUrl);
              setDetectedSource('blockchain');
              toast.success('⚡ Auto-detected latest transaction from TON Blockchain!');
            }
            return;
          }
        }
        if (!silent && isMounted) {
          toast.error('No recent blockchain transactions found for this address in the last 30 minutes.');
        }
      } catch (err) {
        console.warn('TonAPI auto-detection note:', err.message);
        if (!silent && isMounted) {
          toast.error('Could not auto-detect on blockchain. Please paste the transaction link manually.');
        }
      } finally {
        if (isMounted) setDetecting(false);
      }
    };

    const initDetection = async () => {
      const foundClip = await checkClipboard();
      if (!foundClip) {
        autoDetectFromBlockchain(true);
      }
    };

    initDetection();

    return () => {
      isMounted = false;
    };
  }, [isOpen, walletAddress]);

  if (!isOpen) return null;

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const cleanText = text.trim();
          const formatted = cleanText.startsWith('http') ? cleanText : `https://tonviewer.com/transaction/${cleanText}`;
          setTxHash(formatted);
          setDetectedSource('clipboard');
          toast.success('Pasted from clipboard!');
        } else {
          toast.error('Clipboard is empty');
        }
      } else {
        toast.error('Clipboard API not supported');
      }
    } catch (e) {
      toast.error('Clipboard permission denied. Please paste manually into the input box.');
    }
  };

  const handleManualBlockchainDetect = async () => {
    setDetecting(true);
    try {
      const cleanAddr = walletAddress.trim();
      const res = await fetch(`https://tonapi.io/v2/blockchain/accounts/${encodeURIComponent(cleanAddr)}/transactions?limit=3`);
      if (!res.ok) throw new Error('TonAPI request failed');
      const data = await res.json();
      
      if (data && Array.isArray(data.transactions) && data.transactions.length > 0) {
        const latestTx = data.transactions[0];
        if (latestTx.hash) {
          const tonviewerUrl = `https://tonviewer.com/transaction/${latestTx.hash}`;
          setTxHash(tonviewerUrl);
          setDetectedSource('blockchain');
          toast.success('⚡ Auto-detected latest transaction from TON Blockchain!');
          return;
        }
      }
      toast.error('No recent blockchain transactions found for this address.');
    } catch (e) {
      toast.error('Failed to query TON Blockchain. Please paste transaction link manually.');
    } finally {
      setDetecting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!txHash || !txHash.trim()) {
      toast.error('Transaction hash or Tonviewer link is required!');
      return;
    }
    onConfirm(txHash.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0e1626] border border-amber-500/30 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative space-y-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-ink-soft hover:text-white rounded-xl transition-colors"
        >
          <X size={20} />
        </button>

        {/* Title Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              Mark as Paid
            </h2>
            <p className="text-xs text-ink-soft">Confirm payout and link transaction proof</p>
          </div>
        </div>

        {/* User & Wallet summary card */}
        <div className="bg-[#070b14] border border-border/40 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-ink-soft font-bold">Recipient:</span>
            <span className="text-white font-black">{userName}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-ink-soft font-bold">Amount to Send:</span>
            <span className="text-amber-400 font-black text-sm">{amount} {token}</span>
          </div>
          <div className="flex justify-between items-center text-xs pt-1 border-t border-border/20">
            <span className="text-ink-soft font-bold">Wallet Address:</span>
            <span className="text-indigo-400 font-mono text-[11px] truncate max-w-[200px]" title={walletAddress}>
              {walletAddress}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        {detectedSource === 'blockchain' && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs text-emerald-400 font-bold">
            <Sparkles size={16} className="text-emerald-400 shrink-0" />
            <span>⚡ Auto-detected latest transaction from TON Blockchain!</span>
          </div>
        )}
        {detectedSource === 'clipboard' && (
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs text-indigo-300 font-bold">
            <Copy size={16} className="text-indigo-400 shrink-0" />
            <span>📋 Auto-pasted link from your Clipboard!</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-amber-400/90 uppercase tracking-wider flex items-center justify-between">
              <span>Transaction Hash or Tonviewer Link</span>
              {detecting && (
                <span className="text-[10px] text-amber-400 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> Detecting on blockchain...
                </span>
              )}
            </label>

            <div className="relative">
              <input
                type="text"
                value={txHash}
                onChange={(e) => {
                  setTxHash(e.target.value);
                  setDetectedSource(null);
                }}
                placeholder="https://tonviewer.com/transaction/..."
                className="w-full bg-black/40 border border-border/60 rounded-xl px-4 py-3 text-white text-xs font-mono placeholder:text-ink-soft/40 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* Quick Helper Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="flex-1 py-2 px-3 rounded-xl bg-surface-soft hover:bg-border text-ink-soft hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-border/40"
            >
              <Copy size={13} /> Paste Clipboard
            </button>
            <button
              type="button"
              onClick={handleManualBlockchainDetect}
              disabled={detecting}
              className="flex-1 py-2 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {detecting ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              Auto-Detect Tx
            </button>
          </div>

          {/* Submit Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-surface-soft hover:bg-border text-ink-soft font-bold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || !txHash.trim()}
              className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-400 text-slate-900 font-black text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={18} />}
              Confirm & Mark Paid
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

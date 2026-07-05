import React, { useEffect, useState } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { saveWalletAddress, disconnectWallet } from '../api';
import { useToast } from '../App';
import { AlertTriangle } from 'lucide-react';

export default function WalletManager({ user, refreshUser }) {
  const [tonConnectUI] = useTonConnectUI();
  const walletAddress = useTonAddress();
  const { showToast } = useToast();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingWallet, setPendingWallet] = useState(null);
  const [oldWallet, setOldWallet] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [prevWalletAddress, setPrevWalletAddress] = useState(null);

  useEffect(() => {
    let isMounted = true;

    // Track disconnects
    if (prevWalletAddress && !walletAddress) {
      // Wallet was disconnected
      disconnectWallet(user?.telegram_id || '123456').catch(console.error);
    }

    if (walletAddress && walletAddress !== prevWalletAddress) {
      // A new wallet was connected (or first time)
      const bindWallet = async () => {
        try {
          const { data, error } = await saveWalletAddress(user?.telegram_id || '123456', walletAddress, false);
          if (error) {
            if (!isMounted) return;
            showToast(error, 'error');
            tonConnectUI.disconnect();
          } else if (data) {
            if (!isMounted) return;
            if (data.needs_confirmation) {
              setOldWallet(data.old_wallet);
              setPendingWallet(walletAddress);
              setShowConfirmModal(true);
            } else {
              if (data.reset) {
                showToast('Wallet updated. Progress reset.', 'info');
              } else {
                showToast('Wallet successfully bound to mining.', 'success');
              }
              refreshUser();
            }
          }
        } catch (err) {
          if (!isMounted) return;
          console.error(err);
          showToast('Failed to bind wallet.', 'error');
          tonConnectUI.disconnect();
        }
      };
      bindWallet();
    }

    setPrevWalletAddress(walletAddress);

    return () => { isMounted = false; };
  }, [walletAddress, user?.telegram_id]);

  const handleConfirmRebind = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await saveWalletAddress(user?.telegram_id || '123456', pendingWallet, true);
      if (error) {
        showToast(error, 'error');
        tonConnectUI.disconnect();
      } else if (data) {
        showToast('Wallet updated and progress reset.', 'info');
        refreshUser();
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to bind wallet.', 'error');
      tonConnectUI.disconnect();
    }
    setIsProcessing(false);
    setShowConfirmModal(false);
    setPendingWallet(null);
  };

  const handleCancelRebind = () => {
    tonConnectUI.disconnect();
    setShowConfirmModal(false);
    setPendingWallet(null);
  };

  if (!showConfirmModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="p-6">
          <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-4 text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-ink tracking-tight mb-2">Warning: Progress Reset</h3>
          <p className="text-sm text-ink-soft mb-4">
            You already have a wallet linked to this account: <span className="font-mono text-xs bg-bg px-1 py-0.5 rounded text-white">{oldWallet?.slice(0,6)}...{oldWallet?.slice(-4)}</span>. 
          </p>
          <p className="text-sm text-ink-soft mb-6 font-medium text-amber-400/80">
            Connecting a new wallet will <strong className="text-amber-400">reset your mining progress</strong> (level, efficiency, and vault history) to zero. Your off-chain TASKY balance will remain safe.
          </p>
          <p className="text-sm text-ink-soft font-bold mb-6">
            Do you want to continue?
          </p>
          
          <div className="flex gap-3">
            <button 
              onClick={handleCancelRebind}
              disabled={isProcessing}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-bg border border-border text-ink-soft active:scale-95 transition-transform"
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirmRebind}
              disabled={isProcessing}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-amber-500 text-white shadow-lg shadow-amber-500/30 active:scale-95 transition-transform disabled:opacity-50"
            >
              {isProcessing ? 'Resetting...' : 'Yes, Reset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

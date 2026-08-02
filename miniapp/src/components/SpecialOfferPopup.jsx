import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Zap, Clock } from 'lucide-react';
import { getSpecialOfferStatus, claimSpecialOffer } from '../api';
import { useToast } from '../App';

const OFFER_ID = 'invite_20_get_20k';
const REQUIRED_REFERRALS = 20;
const REWARD_TOKENS = 20000;

function isOfferDone() {
  try { return !!localStorage.getItem(`tasky_offer_${OFFER_ID}_done`); } catch { return false; }
}

function dismissOfferPermanently() {
  try { localStorage.setItem(`tasky_offer_${OFFER_ID}_done`, '1'); } catch {}
}

export default function SpecialOfferPopup({ user }) {
  const [showBubble, setShowBubble] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [offerStatus, setOfferStatus] = useState({ valid_referrals: 0, claim: null });
  const [claiming, setClaiming] = useState(false);
  const [claimDone, setClaimDone] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!user?.telegram_id) return;
    // If permanently dismissed/claimed, never show
    if (isOfferDone()) return;

    // Show bubble immediately — don't wait for API
    setTimeout(() => setShowBubble(true), 1500);

    // Load status in background — failure is non-fatal
    const load = async () => {
      try {
        const { data, error } = await getSpecialOfferStatus(user.telegram_id);
        if (error || !data) return; // silently ignore, bubble already shown
        if (data.claim?.status === 'approved') {
          dismissOfferPermanently();
          setShowBubble(false);
          return;
        }
        if (data.claim?.status === 'pending') {
          setClaimDone(true);
        }
        setOfferStatus(data);
      } catch {}
    };
    load();
  }, [user?.telegram_id]);

  const handleCloseModal = () => setModalOpen(false);

  const handleDismissBubble = (e) => {
    e.stopPropagation();
    setShowBubble(false);
    // Only permanently hide if claimed; otherwise just hide for session
  };

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const { data, error } = await claimSpecialOffer(user.telegram_id);
      if (error) { showToast('Failed to submit. Try again.', 'error'); return; }
      if (data?.error === 'already_claimed') { setClaimDone(true); dismissOfferPermanently(); showToast('Already submitted!', 'error'); return; }
      if (data?.error === 'not_enough_referrals') { showToast(`You need ${REQUIRED_REFERRALS} valid referrals!`, 'error'); return; }
      if (data?.success) { setClaimDone(true); dismissOfferPermanently(); showToast("Claim sent! You'll be notified on Telegram.", 'success'); }
    } catch { showToast('Network error. Try again.', 'error'); }
    finally { setClaiming(false); }
  };

  const handleInvite = () => {
    const refLink = `https://t.me/taskybot?start=${user.referral_code}`;
    const text = `Join Tasky and earn real TASKY tokens! ${refLink}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(text)}`;
    if (window.Telegram?.WebApp?.openTelegramLink) window.Telegram.WebApp.openTelegramLink(url);
    else window.open(url, '_blank');
  };

  const validRefs = offerStatus?.valid_referrals || 0;
  const progressPct = Math.min((validRefs / REQUIRED_REFERRALS) * 100, 100);
  const canClaim = validRefs >= REQUIRED_REFERRALS;
  const isPending = offerStatus?.claim?.status === 'pending';

  return (
    <>
      {/* ── FLOATING CIRCLE BUBBLE ── */}
      <AnimatePresence>
        {showBubble && (
          <motion.div
            initial={{ opacity: 0, scale: 0, x: 20, y: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0, x: 20, y: 20 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="fixed z-40 flex flex-col items-end gap-1.5"
            style={{ bottom: '88px', right: '14px' }}
          >
            {/* "24hr OFFER" pill label */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black text-black whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', boxShadow: '0 2px 10px rgba(245,158,11,0.55)' }}
            >
              🔥 24hr OFFER
            </motion.div>

            {/* Main circle */}
            <div className="relative">
              {/* Outer glow ring pulse */}
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.45, 0.08, 0.45] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', margin: '-10px' }}
              />

              {/* Circle button */}
              <motion.button
                onClick={() => setModalOpen(true)}
                animate={{ rotate: [0, -7, 7, -4, 4, 0], y: [0, -4, 0, -2, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', repeatDelay: 1.8 }}
                whileTap={{ scale: 0.88 }}
                className="relative w-16 h-16 rounded-full flex flex-col items-center justify-center overflow-hidden cursor-pointer"
                style={{
                  background: 'linear-gradient(145deg, #1a0a4e, #2d1a8a)',
                  border: '2.5px solid rgba(124,58,237,0.75)',
                  boxShadow: '0 4px 24px rgba(124,58,237,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                {/* Shimmer sweep */}
                <motion.div
                  animate={{ x: ['-120%', '250%'] }}
                  transition={{ repeat: Infinity, duration: 2.8, ease: 'linear', repeatDelay: 0.8 }}
                  className="absolute inset-0 w-1/2 pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }}
                />
                <span className="text-[22px] leading-none mb-0.5 select-none">🎁</span>
                <span className="text-[8px] font-black leading-none" style={{ color: '#fbbf24', letterSpacing: '0.03em' }}>20K TASKY</span>
              </motion.button>

              {/* RED URGENCY DOT */}
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 pointer-events-none">
                <motion.span
                  animate={{ scale: [1, 2, 1], opacity: [0.8, 0, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1.3, ease: 'easeOut' }}
                  className="absolute inline-flex h-full w-full rounded-full"
                  style={{ background: '#ef4444' }}
                />
                <span className="relative inline-flex rounded-full h-4 w-4" style={{ background: '#ef4444', border: '2px solid #0f0c29' }} />
              </span>

              {/* Dismiss X */}
              <button
                onClick={handleDismissBubble}
                className="absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center z-10"
                style={{ background: 'rgba(0,0,0,0.75)', border: '1.5px solid rgba(255,255,255,0.18)', color: '#fff' }}
              >
                <X size={9} strokeWidth={3} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FULL MODAL ── */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              onClick={handleCloseModal}
            />
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="relative z-10 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden"
              style={{ background: 'linear-gradient(145deg, #0f0c29, #1a1040, #24243e)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, #7c3aed, #f59e0b, #7c3aed)' }} />
              <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-20 pointer-events-none"
                style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-15 pointer-events-none"
                style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />

              <div className="relative p-6 pb-8">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <motion.div animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #f59e0b)' }}>🎁</motion.div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">🔥 Limited 24h Offer</p>
                      <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>Exclusive Milestone Reward</p>
                    </div>
                  </div>
                  {!claimDone && !isPending && (
                    <button onClick={handleCloseModal}
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <X size={16} />
                    </button>
                  )}
                </div>

                {claimDone || isPending ? (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center text-center py-4">
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                      className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                      style={{ background: 'rgba(124,58,237,0.15)', border: '2px solid rgba(124,58,237,0.4)' }}>
                      <Clock size={36} className="text-amber-400" />
                    </motion.div>
                    <h2 className="text-xl font-black text-white mb-2">Claim Submitted! 🚀</h2>
                    <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      Your request for <span className="text-amber-400 font-bold">20,000 TASKY</span> is under review.
                      You will get a Telegram message once approved!
                    </p>
                    <button onClick={() => { setModalOpen(false); setShowBubble(false); }}
                      className="px-8 py-3 rounded-2xl text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                      Got it! 🎉
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <div className="text-center mb-5">
                      <motion.div animate={{ scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
                        <div className="text-5xl font-black text-transparent bg-clip-text mb-1"
                          style={{ backgroundImage: 'linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b)' }}>
                          +{REWARD_TOKENS.toLocaleString()}
                        </div>
                        <div className="text-white font-black text-xl tracking-wide">TASKY</div>
                      </motion.div>
                      <p className="text-xs mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        Invite {REQUIRED_REFERRALS} valid friends to claim
                      </p>
                    </div>

                    <div className="rounded-2xl p-4 mb-4 space-y-3"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {['Share your referral link with friends', 'Each friend must complete at least 3 tasks'].map((s, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 text-white"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>{i + 1}</div>
                          <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>{s}</p>
                        </div>
                      ))}
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 text-black"
                          style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>3</div>
                        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
                          Hit 20 valid friends <span className="text-amber-400 font-bold">→ Claim 20,000 TASKY!</span>
                        </p>
                      </div>
                    </div>

                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Users size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Your Progress</span>
                        </div>
                        <span className="text-xs font-black" style={{ color: canClaim ? '#f59e0b' : '#a855f7' }}>
                          {validRefs} / {REQUIRED_REFERRALS}
                        </span>
                      </div>
                      <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${Math.max(progressPct, 3)}%` }}
                          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            background: canClaim ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#7c3aed,#a855f7)',
                            boxShadow: canClaim ? '0 0 12px rgba(245,158,11,0.5)' : '0 0 10px rgba(124,58,237,0.5)'
                          }}
                        />
                        <motion.div animate={{ x: ['-100%', '400%'] }}
                          transition={{ repeat: Infinity, duration: 2, ease: 'linear', delay: 1 }}
                          className="absolute inset-y-0 w-12 rounded-full opacity-30"
                          style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.7),transparent)' }} />
                      </div>
                      {canClaim && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="text-center text-xs font-bold text-amber-400 mt-2">
                          ✅ Reached 20 friends! Claim your reward!
                        </motion.p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {canClaim ? (
                        <motion.button onClick={handleClaim} disabled={claiming} whileTap={{ scale: 0.97 }}
                          animate={{ boxShadow: ['0 0 20px rgba(245,158,11,0.2)', '0 0 35px rgba(245,158,11,0.55)', '0 0 20px rgba(245,158,11,0.2)'] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="w-full py-4 rounded-2xl font-black text-base text-black flex items-center justify-center gap-2 disabled:opacity-70"
                          style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)' }}>
                          {claiming
                            ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full" /> Submitting...</>
                            : <><Zap size={18} fill="black" /> Claim {REWARD_TOKENS.toLocaleString()} TASKY!</>
                          }
                        </motion.button>
                      ) : (
                        <motion.button onClick={handleInvite} whileTap={{ scale: 0.97 }}
                          className="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2"
                          style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>
                          <Users size={18} /> Invite Friends Now
                        </motion.button>
                      )}
                      <button onClick={handleCloseModal} className="text-xs font-semibold py-1 transition-colors"
                        style={{ color: 'rgba(255,255,255,0.28)' }}>Remind me later</button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

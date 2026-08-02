import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Zap, Clock } from 'lucide-react';
import { getSpecialOfferStatus, claimSpecialOffer } from '../api';
import { useToast } from '../App';

const OFFER_ID = 'invite_20_get_20k';
const REQUIRED_REFERRALS = 20;
const REWARD_TOKENS = 20000;
const OFFER_DURATION_HOURS = 24;

function shouldShowOffer() {
  try {
    const done = localStorage.getItem(`tasky_offer_${OFFER_ID}_done`);
    if (done) return false;
    const seenAt = localStorage.getItem(`tasky_offer_${OFFER_ID}_seen`);
    if (!seenAt) return true;
    const hoursSinceSeen = (Date.now() - parseInt(seenAt, 10)) / (1000 * 60 * 60);
    return hoursSinceSeen >= OFFER_DURATION_HOURS;
  } catch { return true; }
}

function markOfferSeen() {
  try { localStorage.setItem(`tasky_offer_${OFFER_ID}_seen`, Date.now().toString()); } catch {}
}

function dismissOfferPermanently() {
  try { localStorage.setItem(`tasky_offer_${OFFER_ID}_done`, '1'); } catch {}
}

export default function SpecialOfferPopup({ user }) {
  const [visible, setVisible] = useState(false);
  const [offerStatus, setOfferStatus] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [claimDone, setClaimDone] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!user?.telegram_id) return;
    if (!shouldShowOffer()) return;
    const load = async () => {
      const { data, error } = await getSpecialOfferStatus(user.telegram_id);
      if (error) return;
      if (data.claim?.status === 'approved') { dismissOfferPermanently(); return; }
      if (data.claim?.status === 'pending') { setOfferStatus(data); setClaimDone(true); }
      else setOfferStatus(data);
      if (!localStorage.getItem(`tasky_offer_${OFFER_ID}_seen`)) markOfferSeen();
      setTimeout(() => setVisible(true), 1200);
    };
    load();
  }, [user?.telegram_id]);

  const handleDismiss = () => { setVisible(false); markOfferSeen(); };

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    const { data, error } = await claimSpecialOffer(user.telegram_id);
    setClaiming(false);
    if (error) { showToast('Failed to submit claim. Try again.', 'error'); return; }
    if (data.error === 'already_claimed') { showToast('Already submitted!', 'error'); setClaimDone(true); dismissOfferPermanently(); return; }
    if (data.error === 'not_enough_referrals') { showToast(`You need ${REQUIRED_REFERRALS} valid referrals!`, 'error'); return; }
    if (data.success) { setClaimDone(true); dismissOfferPermanently(); showToast("Claim sent to admin! You'll be notified soon.", 'success'); }
  };

  const handleInvite = () => {
    const refLink = `https://t.me/taskybot?start=${user.referral_code}`;
    const text = `Join Tasky and earn real TASKY tokens! ${refLink}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(text)}`;
    if (window.Telegram?.WebApp?.openTelegramLink) window.Telegram.WebApp.openTelegramLink(url);
    else window.open(url, '_blank');
  };

  if (!visible || !offerStatus) return null;

  const validRefs = offerStatus.valid_referrals || 0;
  const progressPct = Math.min((validRefs / REQUIRED_REFERRALS) * 100, 100);
  const canClaim = validRefs >= REQUIRED_REFERRALS;
  const isPending = offerStatus.claim?.status === 'pending';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
          onClick={!claimDone && !isPending ? handleDismiss : undefined}
        />
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
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
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #f59e0b)' }}
                >🎁</motion.div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">🔥 Limited 24h Offer</p>
                  <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>Exclusive Milestone Reward</p>
                </div>
              </div>
              {!claimDone && !isPending && (
                <button onClick={handleDismiss}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
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
                  style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(245,158,11,0.2))', border: '2px solid rgba(124,58,237,0.4)' }}>
                  <Clock size={36} className="text-amber-400" />
                </motion.div>
                <h2 className="text-xl font-black text-white mb-2">Claim Submitted! 🚀</h2>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Your request for <span className="text-amber-400 font-bold">20,000 TASKY</span> is under review.
                  You will receive a Telegram message once approved!
                </p>
                <button onClick={() => setVisible(false)}
                  className="px-8 py-3 rounded-2xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                  Got it! 🎉
                </button>
              </motion.div>
            ) : (
              <>
                <div className="text-center mb-5">
                  <motion.div animate={{ scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}>
                    <div className="text-5xl font-black text-transparent bg-clip-text mb-1"
                      style={{ backgroundImage: 'linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b)' }}>
                      +{REWARD_TOKENS.toLocaleString()}
                    </div>
                    <div className="text-white font-black text-xl tracking-wide">TASKY</div>
                  </motion.div>
                  <p className="text-xs mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    When you invite {REQUIRED_REFERRALS} valid friends
                  </p>
                </div>

                <div className="rounded-2xl p-4 mb-4 space-y-3"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {[
                    'Share your referral link with friends',
                    'Each friend must complete at least 3 tasks',
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 text-white"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>{i + 1}</div>
                      <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>{step}</p>
                    </div>
                  ))}
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 text-black"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>3</div>
                    <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      Reach 20 valid friends <span className="text-amber-400 font-bold">→ Claim 20,000 TASKY!</span>
                    </p>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Users size={14} style={{ color: 'rgba(255,255,255,0.45)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>Your Progress</span>
                    </div>
                    <span className="text-xs font-black" style={{ color: canClaim ? '#f59e0b' : '#a855f7' }}>
                      {validRefs}/{REQUIRED_REFERRALS} valid friends
                    </span>
                  </div>
                  <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        background: canClaim ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #7c3aed, #a855f7)',
                        boxShadow: canClaim ? '0 0 12px rgba(245,158,11,0.5)' : '0 0 12px rgba(124,58,237,0.5)'
                      }}
                    />
                    {progressPct > 5 && (
                      <motion.div animate={{ x: ['-100%', '400%'] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'linear', delay: 1 }}
                        className="absolute inset-y-0 w-12 rounded-full opacity-40"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }} />
                    )}
                  </div>
                  {canClaim && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-center text-xs font-bold text-amber-400 mt-2">
                      You have reached 20 friends! Claim your reward now!
                    </motion.p>
                  )}
                </div>

                <div className="flex flex-col gap-2.5">
                  {canClaim ? (
                    <motion.button onClick={handleClaim} disabled={claiming}
                      whileTap={{ scale: 0.97 }}
                      animate={{ boxShadow: ['0 0 20px rgba(245,158,11,0.25)', '0 0 35px rgba(245,158,11,0.55)', '0 0 20px rgba(245,158,11,0.25)'] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-full py-4 rounded-2xl font-black text-base text-black flex items-center justify-center gap-2 disabled:opacity-70"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
                      {claiming ? (
                        <>
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                            className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full" />
                          Submitting...
                        </>
                      ) : (
                        <><Zap size={18} fill="black" /> Claim {REWARD_TOKENS.toLocaleString()} TASKY Now!</>
                      )}
                    </motion.button>
                  ) : (
                    <motion.button onClick={handleInvite} whileTap={{ scale: 0.97 }}
                      className="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                      <Users size={18} /> Invite Friends Now
                    </motion.button>
                  )}
                  <button onClick={handleDismiss} className="text-xs font-semibold py-1 transition-colors"
                    style={{ color: 'rgba(255,255,255,0.28)' }}>Remind me later</button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

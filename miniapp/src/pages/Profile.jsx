import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n/I18nContext';
import {
  Flame, CheckCircle2, Calendar, Star,
  Users, Coins, TrendingUp, Trophy, Copy,
  Zap, Shield, Crown, Award, Target,
  MessageCircle, Globe, ChevronRight, HelpCircle,
  FileText, Lock, Bell, Languages, ExternalLink, X, RotateCw
} from 'lucide-react';
import Card from '../components/Card';
import { useToast } from '../App';
import ProfileGenesisCard from '../components/ProfileGenesisCard';
import { useIsAdmin } from '../AdminContext';

const TASKY_PER_USDT = 33333;

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'id', label: 'Bahasa', flag: '🇮🇩' },
];

const getRank = (totalEarned) => {
  const t = Number(totalEarned || 0);
  if (t >= 100000) return { label: 'Diamond', icon: Crown, color: '#67e8f9', next: null, progress: 100 };
  if (t >= 50000)  return { label: 'Platinum', icon: Shield, color: '#c4b5fd', next: 100000, progress: ((t-50000)/50000)*100 };
  if (t >= 20000)  return { label: 'Gold', icon: Trophy, color: '#fbbf24', next: 50000, progress: ((t-20000)/30000)*100 };
  if (t >= 5000)   return { label: 'Silver', icon: Award, color: '#94a3b8', next: 20000, progress: ((t-5000)/15000)*100 };
  return { label: 'Bronze', icon: Target, color: '#fb923c', next: 5000, progress: (t/5000)*100 };
};

function Profile({ user }) {
  const { lang, changeLanguage, t } = useTranslation();
  const { showToast } = useToast();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(() => localStorage.getItem('tasky_notifs') !== 'off');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showWhitepaper, setShowWhitepaper] = useState(false);
  const [showFaq, setShowFaq] = useState(false);

  const currentLangObj = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  const handleSelectLang = (code, label) => {
    changeLanguage(code);
    setShowLangPicker(false);
    showToast(`${t('profile.languageSet')} ${label}`);
  };

  const handleToggleNotifs = () => {
    const next = !notificationsOn;
    setNotificationsOn(next);
    localStorage.setItem('tasky_notifs', next ? 'on' : 'off');
  };

  if (!user) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-48 bg-surface-soft rounded-3xl w-full" />
        <div className="h-28 bg-surface-soft rounded-3xl w-full" />
        <div className="h-36 bg-surface-soft rounded-3xl w-full" />
      </div>
    );
  }

  const initials = user.first_name ? user.first_name.charAt(0).toUpperCase() : '?';
  const balance = Number(user.balance || 0);
  const totalEarned = Number(user.total_earned || 0);
  const rank = getRank(totalEarned);
  const RankIcon = rank.icon;
  const joinedDate = new Date(user.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

  const handleCopyId = () => {
    navigator.clipboard.writeText(String(user.telegram_id));
    showToast(t('profile.idCopied'));
  };

  const openLink = (url) => {
    if (window.Telegram?.WebApp) window.Telegram.WebApp.openLink(url);
    else window.open(url, '_blank');
  };

  const isUserAdmin = useIsAdmin();

  return (
    <motion.div
      className="pb-24 h-full overflow-y-auto hide-scrollbar"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {isUserAdmin && (
        <div className="p-4 pb-0">
          <ProfileGenesisCard
            user={user}
            totalEarned={user?.total_earned || 0}
            balance={user?.balance || 0}
          />
        </div>
      )}

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
        
        <div className="relative z-10 p-5 pb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  {initials}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-900" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white leading-tight">{user.first_name}</h1>
                <p className="text-slate-400 text-xs font-medium">@{user.username || user.telegram_id}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-slate-500 text-[10px]">ID:</span>
                  <span className="text-slate-400 text-[10px] font-mono">{user.telegram_id}</span>
                  <button onClick={handleCopyId} className="text-slate-500 hover:text-indigo-400 transition-colors">
                    <Copy size={10} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 items-end">
              {user.genesis_member && (
                <div className="flex items-center gap-1 bg-amber-400/15 border border-amber-400/30 px-2.5 py-1 rounded-full">
                  <Star size={10} className="text-amber-400 fill-amber-400" />
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">{t('profile.genesis')}</span>
                </div>
              )}
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full border" style={{ background: `${rank.color}15`, borderColor: `${rank.color}40`, color: rank.color }}>
                <RankIcon size={10} />
                <span className="text-[10px] font-black uppercase tracking-wider">{rank.label}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 mb-3">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">{t('profile.totalBalance')}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{Math.floor(balance).toLocaleString()}</span>
              <span className="text-slate-400 text-sm font-bold">TASKY</span>
              <span className="ml-auto text-emerald-400 text-sm font-black">≈ {(balance / TASKY_PER_USDT).toFixed(4)} USDT</span>
            </div>
          </div>

          {rank.next && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-slate-500 text-[10px] font-medium">{t('profile.rankProgress')}</span>
                <span className="text-slate-400 text-[10px] font-bold">{totalEarned.toLocaleString()} / {rank.next.toLocaleString()}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(rank.progress, 100)}%` }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${rank.color}, #fff6)` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { icon: Coins, label: t('profile.totalEarned'), value: Number(user.total_earned || 0).toLocaleString(), sub: 'TASKY', color: '#fbbf24', bg: 'bg-yellow-500/10' },
            { icon: Users, label: t('profile.referrals'), value: user.total_referrals || 0, sub: t('profile.invited'), color: '#818cf8', bg: 'bg-indigo-500/10' },
            { icon: Flame, label: t('profile.streak'), value: user.streak_days || 0, sub: t('profile.days'), color: '#fb923c', bg: 'bg-orange-500/10' },
            { icon: CheckCircle2, label: t('profile.tasksDone'), value: user.tasks_done || 0, sub: t('profile.completed'), color: '#34d399', bg: 'bg-emerald-500/10' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className={`${stat.bg} border border-border rounded-2xl p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} style={{ color: stat.color }} />
                  <span className="text-xs text-ink-soft font-medium">{stat.label}</span>
                </div>
                <p className="text-2xl font-black text-ink leading-none">{stat.value}</p>
                <p className="text-[10px] text-ink-faint mt-0.5 font-medium">{stat.sub}</p>
              </motion.div>
            );
          })}
        </div>



        {/* ── Achievements ── */}
        <Card className="rounded-2xl border-border p-4">
          <h3 className="text-sm font-black text-ink mb-3">{t('profile.achievements')}</h3>
          <div className="flex gap-2 flex-wrap">
            {user.genesis_member && <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full"><Star size={12} className="text-amber-400 fill-amber-400" /><span className="text-[11px] font-black text-amber-500">{t('profile.genesis')}</span></div>}
            {(user.total_referrals||0) >= 1 && <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 rounded-full"><Users size={12} className="text-indigo-400" /><span className="text-[11px] font-black text-indigo-500">{t('profile.referrer')}</span></div>}
            {(user.streak_days||0) >= 7 && <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-full"><Flame size={12} className="text-orange-400" /><span className="text-[11px] font-black text-orange-500">{t('profile.streak')}</span></div>}
            {(user.tasks_done||0) >= 1 && <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full"><CheckCircle2 size={12} className="text-emerald-400" /><span className="text-[11px] font-black text-emerald-500">{t('profile.taskCompleter')}</span></div>}
            {!(user.genesis_member) && (user.total_referrals||0) < 1 && (user.streak_days||0) < 7 && (user.tasks_done||0) < 1 && <p className="text-xs text-ink-faint">{t('profile.unlockBadges')}</p>}
          </div>
        </Card>

        {/* ── Settings ── */}
        <div>
          <p className="text-[10px] font-black text-ink-faint uppercase tracking-widest px-1 mb-2">{t('profile.settings')}</p>
          <Card className="rounded-2xl border-border p-0 overflow-hidden divide-y divide-border">

            {/* Language */}
            <button onClick={() => setShowLangPicker(true)} className="flex items-center gap-3 p-4 w-full hover:bg-surface-soft transition-colors">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Languages size={15} className="text-blue-400" />
              </div>
              <span className="text-sm text-ink font-medium flex-1 text-left">{t('profile.language')}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{currentLangObj.flag}</span>
                <span className="text-xs text-ink-soft font-medium">{currentLangObj.label}</span>
                <ChevronRight size={14} className="text-ink-faint" />
              </div>
            </button>

            {/* Notifications */}
            <div className="flex items-center gap-3 p-4">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Bell size={15} className="text-purple-400" />
              </div>
              <span className="text-sm text-ink font-medium flex-1">{t('profile.notifications')}</span>
              <button
                onClick={() => { setNotificationsOn(v => !v); handleToggleNotifs(); }}
                className={`relative w-11 h-6 rounded-full transition-colors ${notificationsOn ? 'bg-indigo-500' : 'bg-surface-soft border border-border'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${notificationsOn ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Joined */}
            <div className="flex items-center gap-3 p-4">
              <div className="w-8 h-8 rounded-xl bg-slate-500/10 flex items-center justify-center flex-shrink-0">
                <Calendar size={15} className="text-slate-400" />
              </div>
              <span className="text-sm text-ink font-medium flex-1">Member Since</span>
              <span className="text-xs font-bold text-ink-soft">{new Date(user.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>

            {/* Spins */}
            <div className="flex items-center gap-3 p-4">
              <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                <Zap size={15} className="text-yellow-400" />
              </div>
              <span className="text-sm text-ink font-medium flex-1">Spins Available</span>
              <span className="text-xs font-black text-yellow-500">{user.spins_available || 0} spins</span>
            </div>
          </Card>
        </div>

        {/* ── Feedback ── */}
        <div className="mb-2">
          <p className="text-[10px] font-black text-ink-faint uppercase tracking-widest px-1 mb-2">{t('profile.feedback')}</p>
          <Card className="rounded-3xl border-0 p-0 overflow-hidden relative shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-90" />
            
            <div className="relative z-10 p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center  flex-shrink-0 border border-white/20 shadow-inner">
                  <MessageCircle size={20} className="text-white" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white leading-tight mb-1">{t('profile.haveSuggestion')}</h4>
                  <p className="text-[11px] text-indigo-100 leading-relaxed font-medium">{t('profile.feedbackDesc')}</p>
                </div>
              </div>
              <div className="flex bg-black/20 p-1.5 rounded-2xl  border border-white/10 focus-within:bg-black/30 transition-colors shadow-inner">
                <input 
                  type="text" 
                  id="feedback-input"
                  placeholder={t('profile.feedbackPlaceholder')}
                  className="flex-1 bg-transparent px-3 py-1.5 text-sm text-white placeholder:text-white/50 focus:outline-none"
                />
                <button 
                  onClick={() => {
                    const input = document.getElementById('feedback-input');
                    if(input.value.trim()){
                      showToast('Thank you for your feedback! 💖');
                      input.value = '';
                    }
                  }}
                  className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-xs font-black shadow hover:scale-105 active:scale-95 transition-all"
                >
                  {t('profile.send')}
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Support & Legal ── */}
        <div>
          <p className="text-[10px] font-black text-ink-faint uppercase tracking-widest px-1 mb-2">{t('profile.supportLegal')}</p>
          <Card className="rounded-2xl border-border p-0 overflow-hidden divide-y divide-border">
            {[
              { icon: MessageCircle, label: t('profile.liveSupport'), sub: t('profile.liveSupportSub'), color: '#22d3ee', action: () => openLink('https://t.me/taskycs') },
              { icon: HelpCircle, label: t('profile.faq'), sub: t('profile.faqSub'), color: '#818cf8', action: () => setShowFaq(true) },
              { icon: Globe, label: t('profile.community'), sub: t('profile.communitySub'), color: '#34d399', action: () => openLink('https://t.me/TaskyOfficialCommunity') },
              { icon: Globe, label: t('profile.officialChannel'), sub: t('profile.officialChannelSub'), color: '#f59e0b', action: () => openLink('https://t.me/Tasky_Official') },
              { icon: FileText, label: t('profile.whitePaper'), sub: t('profile.whitePaperSub'), color: '#6366f1', action: () => setShowWhitepaper(true) },
              { icon: Lock, label: t('profile.privacyPolicy'), sub: t('profile.privacyPolicySub'), color: '#94a3b8', action: () => setShowPrivacy(true) },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <button key={i} onClick={item.action} className="flex items-center gap-3 p-4 w-full hover:bg-surface-soft transition-colors">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}18` }}>
                    <Icon size={15} style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm text-ink font-medium">{item.label}</p>
                    {item.sub && <p className="text-[10px] text-ink-faint">{item.sub}</p>}
                  </div>
                  <ChevronRight size={14} className="text-ink-faint" />
                </button>
              );
            })}
          </Card>
        </div>

        <p className="text-center text-[10px] text-ink-faint pb-2">Tasky v1.0.0 · Built with ❤️</p>
      </div>



      {/* ── Language Modal ── */}
      <AnimatePresence>
        {showLangPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: 'rgba(0,0,0,0.8)' }}
          >
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="mt-auto w-full bg-surface rounded-t-3xl border-t border-border flex flex-col"
              style={{ maxHeight: '88vh' }}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-border">
                <div className="flex items-center gap-2">
                  <Languages size={16} className="text-indigo-400" />
                  <h3 className="text-base font-black text-ink">{t('profile.language') || 'Language'}</h3>
                </div>
                <button onClick={() => setShowLangPicker(false)} className="p-1.5 rounded-full hover:bg-surface-soft"><X size={18} className="text-ink-soft" /></button>
              </div>
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-2 hide-scrollbar">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => handleSelectLang(l.code, l.label)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-colors ${lang === l.code ? 'bg-indigo-500/10 border border-indigo-500/30' : 'bg-surface-soft border border-border hover:bg-black/10'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{l.flag}</span>
                      <span className={`text-base font-medium ${lang === l.code ? 'text-indigo-400 font-bold' : 'text-ink'}`}>{l.label}</span>
                    </div>
                    {lang === l.code && <CheckCircle2 size={18} className="text-indigo-500" />}
                  </button>
                ))}
                <div className="pb-6" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAQ Modal ── */}
      <AnimatePresence>
        {showFaq && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: 'rgba(0,0,0,0.8)' }}
          >
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="mt-auto w-full bg-surface rounded-t-3xl border-t border-border flex flex-col"
              style={{ maxHeight: '88vh' }}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-border">
                <div className="flex items-center gap-2">
                  <HelpCircle size={16} className="text-indigo-400" />
                  <h3 className="text-base font-black text-ink">Frequently Asked Questions</h3>
                </div>
                <button onClick={() => setShowFaq(false)} className="p-1.5 rounded-full hover:bg-surface-soft"><X size={18} className="text-ink-soft" /></button>
              </div>
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6 hide-scrollbar">

                {[
                  {
                    q: 'What does a "valid referral" mean?',
                    a: 'A referral is only considered valid when the user you invited signs up using your link and successfully completes at least 3 tasks on the platform. Once they do, you will automatically receive your TASKY referral reward and a free spin on the wheel!'
                  },
                  {
                    q: 'How do I earn TASKY tokens?',
                    a: 'You can earn TASKY by completing daily tasks, weekly tasks, and one-time social bounties. You can also earn heavily by referring friends and spinning the daily wheel.'
                  },
                  {
                    q: 'When can I withdraw my tokens?',
                    a: 'Withdrawals to your TON Wallet will be enabled soon during our Token Generation Event (TGE). Keep stacking your TASKY until then!'
                  },
                  {
                    q: 'My task is stuck on pending. Why?',
                    a: 'Some tasks require manual verification or backend checks (like YouTube videos or Telegram group joins). Our system periodically verifies these, so please be patient!'
                  }
                ].map((faq, i) => (
                  <div key={i}>
                    <h4 className="text-sm font-bold text-ink mb-1">{faq.q}</h4>
                    <p className="text-sm text-ink-soft leading-relaxed">{faq.a}</p>
                  </div>
                ))}
                
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Privacy Policy Modal ── */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: 'rgba(0,0,0,0.8)' }}
          >
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="mt-auto w-full bg-surface rounded-t-3xl border-t border-border flex flex-col"
              style={{ maxHeight: '88vh' }}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-border">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-indigo-400" />
                  <h3 className="text-base font-black text-ink">Privacy Policy</h3>
                </div>
                <button onClick={() => setShowPrivacy(false)} className="p-1.5 rounded-full hover:bg-surface-soft"><X size={18} className="text-ink-soft" /></button>
              </div>
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5 hide-scrollbar">
                <p className="text-[10px] text-ink-faint">Last updated: June 2025</p>

                {[
                  {
                    title: '1. Information We Collect',
                    body: `Tasky collects the following information when you use our Telegram Mini App:\n\n• Telegram User ID, first name, last name, and username (provided by Telegram)
• Task completion activity and submission timestamps
• Referral relationships and counts
• Spin and check-in activity logs
• Withdrawal wallet addresses you voluntarily provide

We do NOT collect passwords, email addresses, or payment card information.`
                  },
                  {
                    title: '2. How We Use Your Information',
                    body: `• To operate and deliver the Tasky rewards platform
• To calculate and credit TASKY token balances
• To process withdrawals to your provided BSC wallet address
• To prevent fraud, abuse, and multiple-account exploitation
• To improve the platform based on usage patterns

We do not sell, rent, or share your personal data with third-party advertisers.`
                  },
                  {
                    title: '3. Data Storage & Security',
                    body: `Your data is stored on secured servers with industry-standard encryption at rest and in transit. Wallet addresses are stored only to process your requested withdrawals. We apply rate-limiting, transaction locking, and fraud detection mechanisms to protect your account.`
                  },
                  {
                    title: '4. Withdrawals & Wallet Addresses',
                    body: `When you submit a withdrawal request, your BSC wallet address is stored and associated with the transaction. You are solely responsible for providing a correct BEP20 USDT-compatible wallet address. Tasky is not liable for funds sent to incorrect addresses provided by users.`
                  },
                  {
                    title: '5. Third-Party Services',
                    body: `Tasky operates inside Telegram's Mini App environment. By using Tasky, you also agree to Telegram's Privacy Policy. We use Telegram's WebApp API solely to authenticate your identity. No data is shared with any other third party.`
                  },
                  {
                    title: '6. Your Rights',
                    body: `• You may request deletion of your account and associated data at any time by contacting support
• You may request a copy of data we hold about you
• You may withdraw consent by discontinuing use of the platform

To exercise any of these rights, contact us via the Live Support channel.`
                  },
                  {
                    title: '7. Changes to This Policy',
                    body: `We may update this Privacy Policy from time to time. When we do, we will post the updated version with a revised date. Continued use of Tasky after changes constitutes your acceptance of the updated policy.`
                  },
                  {
                    title: '8. Contact',
                    body: `For any privacy-related questions or requests, please reach us via our official Telegram support channel: @taskycs`
                  },
                ].map((section, i) => (
                  <div key={i}>
                    <h4 className="text-sm font-black text-ink mb-1.5">{section.title}</h4>
                    <p className="text-xs text-ink-soft leading-relaxed whitespace-pre-line">{section.body}</p>
                  </div>
                ))}
                <div className="pb-6" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── White Paper Modal ── */}
      <AnimatePresence>
        {showWhitepaper && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: 'rgba(0,0,0,0.8)' }}
          >
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="mt-auto w-full rounded-t-3xl border-t border-border flex flex-col overflow-hidden"
              style={{ maxHeight: '88vh', background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)' }}
            >
              {/* Top accent */}
              <div className="h-1 w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, #6366f1, #a78bfa, #6366f1)' }} />
              <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-indigo-400" />
                  <div>
                    <h3 className="text-base font-black text-white leading-tight">White Paper</h3>
                    <p className="text-[10px] text-slate-400">TASKY Token — v1.0</p>
                  </div>
                </div>
                <button onClick={() => setShowWhitepaper(false)} className="p-1.5 rounded-full hover:bg-white/10"><X size={18} className="text-slate-400" /></button>
              </div>
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6 hide-scrollbar">

                {/* Abstract */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">Abstract</p>
                  <p className="text-xs text-slate-300 leading-relaxed">Tasky is a decentralized, task-based micro-earning platform built on Telegram. Users earn TASKY tokens by completing verified social and promotional tasks, referring friends, and maintaining daily activity streaks. TASKY tokens are redeemable for USDT on the Binance Smart Chain (BEP20).</p>
                </div>

                {[
                  {
                    title: '1. Vision',
                    color: '#818cf8',
                    body: `Our mission is to bridge the gap between everyday internet users and the decentralized economy. Tasky enables anyone with a Telegram account to earn real crypto rewards through simple, verifiable tasks — no technical knowledge required. We believe the next billion crypto users will enter through micro-earning platforms, not exchanges.`
                  },
                  {
                    title: '2. TASKY Token',
                    color: '#fbbf24',
                    body: `TASKY is an off-chain reward token that tracks user earnings within the platform.\n\n• Ticker: TASKY
• Standard: BEP20 (BSC)
• Conversion Rate: 33,333 TASKY = 1 USDT
• Minimum Withdrawal: Configurable by admin
• Platform Fee: Applied at withdrawal (configurable)

TASKY tokens have no speculative value and are not tradeable on exchanges. They represent confirmed task-based earnings redeemable as USDT.`
                  },
                  {
                    title: '3. How Earning Works',
                    color: '#34d399',
                    body: `• Task Rewards: Complete social/promotional tasks to earn TASKY instantly
• Daily Check-in: Log in daily to receive streak-based bonus rewards (up to 7-day cycle)
• Spin Wheel: Earn 1 spin per successful referral (up to 5 spins/day), win bonus TASKY
• Referrals: Earn 200 TASKY + 1 spin for every verified referral

All reward mechanisms include anti-abuse controls including server-side locking, daily caps, and proof verification.`
                  },
                  {
                    title: '4. Withdrawal & Payout',
                    color: '#22d3ee',
                    body: `• Payouts are made exclusively in USDT on the Binance Smart Chain (BEP20)
• Processing time: Under 3 minutes after request submission
• Minimum withdrawal threshold is set and adjustable by admin
• A platform fee percentage is deducted from each withdrawal
• Users must provide a valid 0x BSC wallet address

Tasky is not responsible for funds lost due to incorrect wallet addresses or wrong networks provided by the user.`
                  },
                  {
                    title: '5. Anti-Fraud & Security',
                    color: '#f87171',
                    body: `• All task submissions are verified server-side before rewards are credited
• Daily spin and check-in limits are enforced via database-level transaction locks
• Referral rewards are only granted for unique, verified new users
• Multiple-account abuse is detected and accounts may be suspended
• Withdrawal requests are reviewed and processed through secure backend pipelines`
                  },
                  {
                    title: '6. Roadmap',
                    color: '#a78bfa',
                    body: `• Q1 2025: Platform launch on Telegram Mini Apps
• Q2 2025: Task marketplace expansion, multi-language support
• Q3 2025: Leaderboard & competitive rewards system
• Q4 2025: TASKY token on-chain deployment on BSC
• 2026: DEX listing, NFT achievement badges, partner integrations`
                  },
                  {
                    title: '7. Disclaimer',
                    color: '#94a3b8',
                    body: `TASKY tokens are utility-based reward points and do not constitute a financial instrument, security, or investment. Tasky makes no guarantees regarding the future value or exchange rate of TASKY tokens. Users participate at their own discretion.`
                  },
                ].map((section, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: section.color }} />
                      <h4 className="text-sm font-black text-white">{section.title}</h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line pl-3">{section.body}</p>
                  </div>
                ))}
                <div className="pb-6" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ProfileWithErrorBoundary(props) {
  return (
    <ErrorBoundary>
      <Profile {...props} />
    </ErrorBoundary>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 h-full flex items-center justify-center text-center bg-black">
          <div className="text-red-500 p-4 border border-red-500 bg-red-900/20 rounded-xl overflow-auto w-full">
            <h2 className="font-bold mb-2">Profile Render Error:</h2>
            <pre className="text-xs text-left text-red-300">{this.state.error?.toString()}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import { useState, useEffect, useRef, createContext, useContext } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Tasks from './pages/Tasks'
import Referral from './pages/Referral'
import Wallet from './pages/Wallet'
import Profile from './pages/Profile'
import Rig from './pages/Rig'
import Play from './pages/Play'
import Gram from './pages/Gram'
import NFTMarketplace from './pages/NFTMarketplace'
import Toast from './components/Toast'
import WalletManager from './components/WalletManager'
import WithdrawalPopup from './components/WithdrawalPopup'
import SpecialOfferPopup from './components/SpecialOfferPopup'
import CyberReactorModal, { CyberReactorFloatingBubble } from './components/CyberReactorModal'
import { registerUser } from './api'
import { initGigaAds, triggerStartupAd } from './adUtils'
import { AdminProvider } from './AdminContext'
import ChannelVerification from './components/ChannelVerification'

export const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);



// Resolve Telegram user or fallback for localhost dev
const getTelegramUser = () => {
  try {
    const tg = window.Telegram?.WebApp
    if (tg?.initDataUnsafe?.user?.id) {
      tg.ready()
      tg.expand()
      if (tg.disableVerticalSwipes) {
        tg.disableVerticalSwipes()
      }
      return tg.initDataUnsafe.user
    }
  } catch (_) {}
  return { id: 123456, first_name: 'Test', username: 'testuser' }
}

const PAGES = { home: Home, tasks: Tasks, referral: Referral, rig: Rig, wallet: Wallet, profile: Profile, play: Play, gram: Gram, nft: NFTMarketplace }

export default function App() {
  const [activePage, setActivePage] = useState('home')
  const [user, setUser] = useState(null)
  const [tgUser] = useState(getTelegramUser)
  const [toast, setToast] = useState(null)
  const [maintenance, setMaintenance] = useState(false)
  const [networkError, setNetworkError] = useState(false)
  const [isReactorModalOpen, setIsReactorModalOpen] = useState(false)
  const mainScrollRef = useRef(null)

  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [activePage])

  const boot = async () => {
    // Robust ref extraction supporting Telegram Mobile SDK, query params, and URL hash
    let ref = window.Telegram?.WebApp?.initDataUnsafe?.start_param || null;
    
    if (!ref) {
      const urlParams = new URLSearchParams(window.location.search);
      ref = urlParams.get('tgWebAppStartParam') || urlParams.get('startapp') || urlParams.get('start') || urlParams.get('ref') || null;
    }

    if (!ref && window.location.hash) {
      const hashClean = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
      const hashParams = new URLSearchParams(hashClean);
      ref = hashParams.get('tgWebAppStartParam') || hashParams.get('startapp') || hashParams.get('start') || hashParams.get('ref') || null;
    }

    if (ref) {
      ref = String(ref).trim();
    }
    
    setNetworkError(false);
    const { data, error } = await registerUser({
      telegram_id: tgUser.id,
      username: tgUser.username,
      first_name: tgUser.first_name,
      ref,
    })
    if (error) {
      console.error("Boot error:", error);
      if (error === 'MAINTENANCE_MODE' || String(error).includes('503')) {
        setMaintenance(true)
      } else if (String(error).includes('Network Error') || String(error).includes('timeout') || String(error).includes('502') || String(error).includes('504')) {
        setNetworkError(true)
      } else {
        // If it's another error, just set user to a fallback state so it doesn't hang infinitely
        setUser({ 
          ...tgUser, 
          telegram_id: tgUser.id,
          balance: 0,
          total_earned: 0,
          task_earnings: 0,
          referral_earnings: 0,
          streak_days: 0,
          created_at: new Date().toISOString(),
          tasks_done: 0,
          spins_available: 0,
          spins_used_today: 0,
          is_banned: false
        }) 
        setToast({ message: String(error), type: 'error' })
      }
    } else if (data) {
      setUser(data)
      setNetworkError(false)
    }
  }

  useEffect(() => {
    boot();
    initGigaAds();
  }, [tgUser]);


  const refreshUser = async () => {
    try {
      const { getUser } = await import('./api')
      const { data, error } = await getUser(tgUser.id)
      if (error === 'MAINTENANCE_MODE' || String(error).includes('503')) {
        setMaintenance(true)
      } else if (data) {
        setUser(data)
        setNetworkError(false)
      }
    } catch (e) {
      console.warn('[App] Background refreshUser error ignored:', e);
    }
  }

  useEffect(() => {
    console.log('[App] Mounted. Adding visibility change listener.');
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      if (window.Telegram.WebApp.disableVerticalSwipes) {
        window.Telegram.WebApp.disableVerticalSwipes();
      }
    }
    
    const handleVisibilityChange = () => {
      console.log(`[App] Visibility changed to: ${document.visibilityState}`);
      if (document.visibilityState === 'visible') {
        console.log('[App] App resumed from background. Triggering refreshUser()...');
        refreshUser();
      } else if (document.visibilityState === 'hidden') {
        console.log('[App] App backgrounded.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also bind to Telegram's viewportChanged as a fallback for older clients
    const handleViewportChanged = (e) => {
      if (!e.isStateStable) return;
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.expand();
      }
      console.log('[App] Telegram viewportChanged event fired.');
      if (window.Telegram?.WebApp?.isExpanded && document.visibilityState !== 'visible') {
        console.log('[App] Telegram expanded while document not visible, forcing refresh...');
        refreshUser();
      }
    };

    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.setHeaderColor?.('#090615');
      window.Telegram.WebApp.setBackgroundColor?.('#090615');
    }

    if (window.Telegram?.WebApp?.onEvent) {
      window.Telegram.WebApp.onEvent('viewportChanged', handleViewportChanged);
    }

    return () => {
      console.log('[App] Unmounting. Removing visibility listeners.');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (window.Telegram?.WebApp?.offEvent) {
        window.Telegram.WebApp.offEvent('viewportChanged', handleViewportChanged);
      }
    };
  }, []); // tgUser is stable from initial state

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  const ActivePage = PAGES[activePage]

  if (maintenance) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-bg px-6 text-center">
        <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-white mb-3">Under Maintenance</h1>
        <p className="text-ink-soft mb-8">Tasky is currently undergoing scheduled maintenance. Please check back later!</p>
        <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-full bg-white/10 text-white font-bold text-sm">
          Refresh Page
        </button>
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-bg px-6 text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-white mb-3">Connection Error</h1>
        <p className="text-ink-soft mb-8">We couldn't connect to the server. Please check your internet connection or disable any active VPN/Proxy and try again.</p>
        <button onClick={() => { setNetworkError(false); boot(); }} className="px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 transition-colors text-white font-bold text-sm shadow-lg shadow-indigo-600/30">
          Try Again
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-bg relative overflow-hidden px-6 text-center">
        <div className="absolute inset-0 bg-indigo-500/5 "></div>
        
        {/* Recreated Logo in CSS */}
        <div className="relative w-28 h-28 mb-8">
          <div className="absolute inset-0 rounded-full bg-indigo-500/30 "></div>
          <div className="absolute inset-1 rounded-full bg-[#3F00E7] flex items-center justify-center shadow-xl shadow-indigo-500/40 border-4 border-white">
            <span className="text-6xl font-black text-white" style={{ fontFamily: 'Impact, sans-serif', marginTop: '4px' }}>T</span>
          </div>
        </div>
        
        <h1 className="text-3xl font-black text-ink mb-3 tracking-tight">TASKY</h1>
        
        <div className="space-y-1 mb-8">
          <p className="text-base font-bold text-indigo-500">Complete Tasks. Earn Rewards.</p>
          <p className="text-sm font-medium text-ink-soft">Your journey to building real wealth starts here.</p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-ink-soft/50  bg-surface-soft px-4 py-2 rounded-full">
          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
          Syncing Vault...
        </div>
      </div>
    );
  }

  if (user.is_banned) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-bg px-6 text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-white mb-3">Account Banned</h1>
        <p className="text-ink-soft mb-8">Your account has been restricted by an administrator. You can no longer use this app.</p>
      </div>
    );
  }

  if (!user.has_verified_channels) {
    return (
      <ToastContext.Provider value={{ showToast }}>
        <div className="flex flex-col h-full overflow-hidden bg-bg">
          <AnimatePresence>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
          </AnimatePresence>
          <ChannelVerification user={user} refreshUser={refreshUser} tgUser={tgUser} />
        </div>
      </ToastContext.Provider>
    );
  }

  return (
    <AdminProvider user={user} tgUser={tgUser}>
      <ToastContext.Provider value={{ showToast }}>
        <div className="flex flex-col h-full w-full overflow-hidden bg-bg relative">
          <AnimatePresence>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
          </AnimatePresence>
          <WithdrawalPopup user={user} refreshUser={refreshUser} />
          <SpecialOfferPopup user={user} />
          <CyberReactorFloatingBubble user={user} onOpen={() => setIsReactorModalOpen(true)} />
          <CyberReactorModal isOpen={isReactorModalOpen} onClose={() => { setIsReactorModalOpen(false); refreshUser(); }} user={user} />
          <WalletManager user={user} refreshUser={refreshUser} />
          <Header user={user} navigate={setActivePage} activePage={activePage} />

          <main 
            ref={mainScrollRef}
            className="flex-1 w-full overflow-y-auto overflow-x-hidden hide-scrollbar pb-24 relative" 
            style={{ 
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y'
            }}
          >
            <motion.div
              key={activePage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="w-full"
            >
              <ActivePage
                user={user}
                tgUser={tgUser}
                refreshUser={refreshUser}
                navigate={setActivePage}
              />
            </motion.div>
          </main>

          <BottomNav active={activePage} onChange={setActivePage} user={user} />
        </div>
      </ToastContext.Provider>
    </AdminProvider>
  )
}

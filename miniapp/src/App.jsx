import { useState, useEffect, createContext, useContext } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Tasks from './pages/Tasks'
import Referral from './pages/Referral'
import Wallet from './pages/Wallet'
import Profile from './pages/Profile'
import Rig from './pages/Rig'
import Toast from './components/Toast'
import { registerUser } from './api'

export const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

const PAGE_VARIANTS = {
  initial:  { opacity: 0 },
  animate:  { opacity: 1 },
  exit:     { opacity: 0 },
}
const PAGE_TRANSITION = { duration: 0.15 }

// Resolve Telegram user or fallback for localhost dev
const getTelegramUser = () => {
  try {
    const tg = window.Telegram?.WebApp
    if (tg?.initDataUnsafe?.user?.id) {
      tg.ready()
      tg.expand()
      return tg.initDataUnsafe.user
    }
  } catch (_) {}
  return { id: 123456, first_name: 'Test', username: 'testuser' }
}

const PAGES = { home: Home, tasks: Tasks, referral: Referral, rig: Rig, wallet: Wallet, profile: Profile }

export default function App() {
  const [activePage, setActivePage] = useState('home')
  const [user, setUser] = useState(null)
  const [tgUser] = useState(getTelegramUser)
  const [toast, setToast] = useState(null)
  const [maintenance, setMaintenance] = useState(false)

  useEffect(() => {
    const boot = async () => {
      // Get ref code from Telegram start_param
      const ref = window.Telegram?.WebApp?.initDataUnsafe?.start_param || null
      const { data, error } = await registerUser({
        telegram_id: tgUser.id,
        username: tgUser.username,
        first_name: tgUser.first_name,
        ref,
      })
      if (error) {
        console.error("Boot error:", error);
        if (error === 'MAINTENANCE_MODE' || String(error).includes('503') || String(error).includes('Network Error')) {
          setMaintenance(true)
        } else {
          // If it's another error, just set user to a blank state so it doesn't hang infinitely
          setUser({ ...tgUser, balance: 0 }) 
          setToast({ message: String(error), type: 'error' })
        }
      } else if (data) {
        setUser(data)
      }
    }
    boot()
  }, [tgUser])

  const refreshUser = async () => {
    const { getUser } = await import('./api')
    const { data, error } = await getUser(tgUser.id)
    if (error === 'MAINTENANCE_MODE') {
      setMaintenance(true)
    } else if (data) {
      setUser(data)
    }
  }

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

  if (!user) {
    return <div className="h-screen flex items-center justify-center text-ink-soft bg-bg">Loading Vault...</div>
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

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="flex flex-col h-full bg-bg">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <Header />

        <main className="flex-1 overflow-y-auto hide-scrollbar pb-20">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activePage}
              variants={PAGE_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={PAGE_TRANSITION}
              className="h-full"
            >
              <ActivePage
                user={user}
                tgUser={tgUser}
                refreshUser={refreshUser}
                navigate={setActivePage}
              />
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNav active={activePage} onChange={setActivePage} />
      </div>
    </ToastContext.Provider>
  )
}

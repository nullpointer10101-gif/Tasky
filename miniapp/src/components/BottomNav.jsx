import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Home, ListChecks, Users, Wallet, Gamepad2, Gem, Coins } from 'lucide-react'
import { useTranslation } from '../i18n/I18nContext'
import { getGramStatus } from '../api'

const NAV_ITEMS = [
  { id: 'home',     key: 'nav.home',     Icon: Home },
  { id: 'rig',      key: 'nav.rig',      Icon: Gem },
  { id: 'play',     key: 'Play',         Icon: Gamepad2 },
  { id: 'tasks',    key: 'nav.tasks',    Icon: ListChecks },
  { id: 'gram',     key: 'Gram',         Icon: Coins },
  { id: 'referral', key: 'nav.referral', Icon: Users },
  { id: 'wallet',   key: 'nav.wallet',   Icon: Wallet },
]

export default function BottomNav({ active, onChange, user }) {
  const { t } = useTranslation();
  const [gramStatus, setGramStatus] = useState(null);

  useEffect(() => {
    if (user?.telegram_id) {
      const fetchGram = async () => {
        try {
          const res = await getGramStatus(user.telegram_id);
          if (res.data) {
            setGramStatus(res.data);
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchGram();
      
      // Refresh every 20 seconds to keep it sync'd
      const interval = setInterval(fetchGram, 20000);
      return () => clearInterval(interval);
    }
  }, [user?.telegram_id]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border pb-safe">
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ id, key, Icon }) => {
          const isActive = active === id;
          const showDot = id === 'gram' && gramStatus && !gramStatus.claimed_in_last_24h;

          return (
            <motion.button
              key={id}
              onClick={() => onChange(id)}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="flex-1 flex flex-col items-center justify-center gap-1 focus:outline-none relative"
            >
              {isActive && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-pill bg-brand"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className={isActive ? 'text-brand' : 'text-ink-faint'}
                />
                {showDot && (
                  <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border border-surface shadow-sm animate-pulse" />
                )}
              </div>

              <span 
                className={`text-[10px] font-bold mt-1 tracking-wide transition-colors ${
                  isActive ? 'text-indigo-400' : 'text-ink-faint'
                }`}
              >
                {t(key)}
              </span>
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}

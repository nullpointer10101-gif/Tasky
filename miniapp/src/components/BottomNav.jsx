import { motion } from 'framer-motion'
import { Home, ListChecks, Users, Wallet, Gamepad2, Gem } from 'lucide-react'
import { useTranslation } from '../i18n/I18nContext'

const NAV_ITEMS = [
  { id: 'home',     key: 'nav.home',     Icon: Home },
  { id: 'rig',      key: 'nav.rig',      Icon: Gem },
  { id: 'play',     key: 'Play',         Icon: Gamepad2 },
  { id: 'tasks',    key: 'nav.tasks',    Icon: ListChecks },
  { id: 'referral', key: 'nav.referral', Icon: Users },
  { id: 'wallet',   key: 'nav.wallet',   Icon: Wallet },
]

export default function BottomNav({ active, onChange }) {
  const { t } = useTranslation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border pb-safe">
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ id, key, Icon }) => {
          const isActive = active === id
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
              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.8}
                className={isActive ? 'text-brand' : 'text-ink-faint'}
              />
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

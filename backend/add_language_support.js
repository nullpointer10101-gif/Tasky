const fs = require('fs');
const path = require('path');

console.log('=== 1. Create LanguageContext.tsx ===');
const langContextPath = 'd:/antigravity/HashBee/miniapp/src/context/LanguageContext.tsx';
const langContextCode = `import React, { createContext, useContext, useState, useEffect } from 'react'

export interface LanguageOption {
  code: string
  name: string
  nativeName: string
  flag: string
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'uz', name: 'Uzbek', nativeName: "O'zbekcha", flag: '🇺🇿' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
]

const translations: Record<string, Record<string, string>> = {
  en: {
    mining_dashboard: 'MINING DASHBOARD',
    support: 'Support',
    total_ghs_power: 'TOTAL GHS POWER',
    add_ghs_boost: '⚡ Add GHS Boost',
    reinvest_balance: '🔄 Reinvest Mined',
    unclaimed_mined_balance: 'UNCLAIMED MINED BALANCE',
    ready_to_collect: 'READY TO COLLECT',
    collect_honey: 'COLLECT REWARDS',
    wallet_balance: 'BALANCE',
    miner_status: 'MINER STATUS',
    online_active: 'ONLINE ACTIVE',
    rate_per_sec: 'EARNING RATE',
    daily_estimated: 'ESTIMATED DAILY',
    per_day: 'per day',
    earn: 'EARN',
    miner: 'MINER',
    tasks: 'TASKS',
    withdraw: 'WITHDRAW',
    select_language: 'Select Language',
    invite_friends: 'INVITE FRIENDS',
    your_referral_link: 'YOUR REFERRAL LINK',
    copy_link: 'Copy Link',
    friends_invited: 'Friends Invited',
    earned_commissions: 'Earned Commissions',
    missions_board: 'MISSIONS BOARD',
    complete_tasks_earn: 'Complete sponsor tasks & boost your GH/s power',
    withdraw_funds: 'WITHDRAW REWARDS',
    payout_address: 'Enter Wallet Address',
    withdraw_btn: 'REQUEST WITHDRAWAL',
    min_withdrawal_notice: 'Minimum withdrawal: 0.05 USDT / GRAM'
  },
  ru: {
    mining_dashboard: 'МАЙНИНГ ПАНЕЛЬ',
    support: 'Поддержка',
    total_ghs_power: 'ОБЩАЯ МОЩНОСТЬ GHS',
    add_ghs_boost: '⚡ Добавить GHS',
    reinvest_balance: '🔄 Реинвестировать',
    unclaimed_mined_balance: 'ДОБЫТЫЙ БАЛАНС',
    ready_to_collect: 'ГОТОВО К СБОРУ',
    collect_honey: 'СОБРАТЬ НАГРАДУ',
    wallet_balance: 'БАЛАНС',
    miner_status: 'СТАТУС МАЙНЕРА',
    online_active: 'АКТИВЕН ОНЛАЙН',
    rate_per_sec: 'СКОРОСТЬ ДОБЫЧИ',
    daily_estimated: 'ПРИМЕРНО В СУТКИ',
    per_day: 'в день',
    earn: 'ДОХОД',
    miner: 'МАЙНЕР',
    tasks: 'ЗАДАНИЯ',
    withdraw: 'ВЫВОД',
    select_language: 'Выберите язык',
    invite_friends: 'ПРИГЛАСИТЬ ДРУЗЕЙ',
    your_referral_link: 'ВАША РЕФЕРАЛЬНАЯ ССЫЛКА',
    copy_link: 'Скопировать',
    friends_invited: 'Приглашено друзей',
    earned_commissions: 'Заработано на рефералах',
    missions_board: 'СПИСОК ЗАДАНИЙ',
    complete_tasks_earn: 'Выполняйте задания и увеличивайте мощность GH/s',
    withdraw_funds: 'ВЫВОД СРЕДСТВ',
    payout_address: 'Введите адрес кошелька',
    withdraw_btn: 'ЗАПРОСИТЬ ВЫВОД',
    min_withdrawal_notice: 'Минимальный вывод: 0.05 USDT / GRAM'
  },
  uz: {
    mining_dashboard: 'MAYNING PANELI',
    support: 'Yordam',
    total_ghs_power: 'UMUMIY GHS QUVVATI',
    add_ghs_boost: '⚡ GHS Oshirish',
    reinvest_balance: '🔄 Qayta kiritish',
    unclaimed_mined_balance: 'YIG‘ILGAN BALANS',
    ready_to_collect: 'YIG‘ISHGA TAYYOR',
    collect_honey: 'MUKOFOTNI OLISH',
    wallet_balance: 'BALANS',
    miner_status: 'MAYNER HOLATI',
    online_active: 'FAOL ONLAYN',
    rate_per_sec: 'ISHLASH TEZLIGI',
    daily_estimated: 'KUNLIK DAROMAD',
    per_day: 'kuniga',
    earn: 'DAROMAD',
    miner: 'MAYNER',
    tasks: 'VAZIFALAR',
    withdraw: 'YECHIB OLISH',
    select_language: 'Tilni tanlang',
    invite_friends: 'DO‘STARNI TAKLIF QILING',
    your_referral_link: 'SIZNING TAKLIF HAVOLANGIZ',
    copy_link: 'Nusxalash',
    friends_invited: 'Taklif qilinganlar',
    earned_commissions: 'Ishlangan komissiya',
    missions_board: 'VAZIFALAR RO‘YXATI',
    complete_tasks_earn: 'Vazifalarni bajaring va GH/s quvvatingizni oshiring',
    withdraw_funds: 'MABLAG‘NI YECHISH',
    payout_address: 'Hamyon manzilini kiriting',
    withdraw_btn: 'YECHIB OLISH',
    min_withdrawal_notice: 'Minimal yechib olish: 0.05 USDT / GRAM'
  },
  id: {
    mining_dashboard: 'DASHBOARD MINING',
    support: 'Bantuan',
    total_ghs_power: 'TOTAL DAYA GHS',
    add_ghs_boost: '⚡ Tambah GHS',
    reinvest_balance: '🔄 Reinvestasi',
    unclaimed_mined_balance: 'SALDO BELUM DIAMBIL',
    ready_to_collect: 'SIAP DIAMBIL',
    collect_honey: 'AMBIL HADIAH',
    wallet_balance: 'SALDO',
    miner_status: 'STATUS MINER',
    online_active: 'AKTIF ONLINE',
    rate_per_sec: 'KECEPATAN MINING',
    daily_estimated: 'ESTIMASI HARIAN',
    per_day: 'per hari',
    earn: 'PENGHASILAN',
    miner: 'MINER',
    tasks: 'TUGAS',
    withdraw: 'PENARIKAN',
    select_language: 'Pilih Bahasa',
    invite_friends: 'UNDANG TEMAN',
    your_referral_link: 'LINK REFERRAL ANDA',
    copy_link: 'Salin Link',
    friends_invited: 'Teman Diundang',
    earned_commissions: 'Komisi Diperoleh',
    missions_board: 'DAFTAR TUGAS',
    complete_tasks_earn: 'Selesaikan tugas & tingkatkan daya GH/s Anda',
    withdraw_funds: 'TARIK REWARD',
    payout_address: 'Masukkan Alamat Dompet',
    withdraw_btn: 'AJUKAN PENARIKAN',
    min_withdrawal_notice: 'Penarikan minimum: 0.05 USDT / GRAM'
  },
  vi: {
    mining_dashboard: 'BẢNG ĐIỀU KHIỂN ĐÀO',
    support: 'Hỗ trợ',
    total_ghs_power: 'TỔNG CÔNG SUẤT GHS',
    add_ghs_boost: '⚡ Tăng Tốc GHS',
    reinvest_balance: '🔄 Tái Đầu Tư',
    unclaimed_mined_balance: 'SỐ DƯ CHƯA NHẬN',
    ready_to_collect: 'SẴN SÀNG NHẬN',
    collect_honey: 'NHẬN THƯỞNG',
    wallet_balance: 'SỐ DƯ VÍ',
    miner_status: 'TRẠNG THÁI MÁY ĐÀO',
    online_active: 'ĐANG HOẠT ĐỘNG',
    rate_per_sec: 'TỐC ĐỘ ĐÀO',
    daily_estimated: 'ƯỚC TÍNH MỖI NGÀY',
    per_day: 'mỗi ngày',
    earn: 'KIẾM TIỀN',
    miner: 'MÁY ĐÀO',
    tasks: 'NHIỆM VỤ',
    withdraw: 'RÚT TIỀN',
    select_language: 'Chọn Ngôn Ngữ',
    invite_friends: 'MỜI BẠN BÈ',
    your_referral_link: 'LIÊN KẾT GIỚI THIỆU',
    copy_link: 'Sao chép liên kết',
    friends_invited: 'Bạn bè đã mời',
    earned_commissions: 'Hoa hồng nhận được',
    missions_board: 'DANH SÁCH NHIỆM VỤ',
    complete_tasks_earn: 'Hoàn thành nhiệm vụ để tăng công suất GH/s',
    withdraw_funds: 'RÚT PHẦN THƯỞNG',
    payout_address: 'Nhập địa chỉ ví',
    withdraw_btn: 'YÊU CẦU RÚT TIỀN',
    min_withdrawal_notice: 'Rút tối thiểu: 0.05 USDT / GRAM'
  },
  es: {
    mining_dashboard: 'PANEL DE MINERÍA',
    support: 'Soporte',
    total_ghs_power: 'POTENCIA TOTAL GHS',
    add_ghs_boost: '⚡ Añadir GHS',
    reinvest_balance: '🔄 Reinvertir',
    unclaimed_mined_balance: 'BALANCE SIN RECLAMAR',
    ready_to_collect: 'LISTO PARA RECLAMAR',
    collect_honey: 'RECLAMAR RECOMPENSA',
    wallet_balance: 'BALANCE',
    miner_status: 'ESTADO DEL MINERO',
    online_active: 'ACTIVO EN LÍNEA',
    rate_per_sec: 'VELOCIDAD DE MINADO',
    daily_estimated: 'ESTIMADO DIARIO',
    per_day: 'por día',
    earn: 'GANAR',
    miner: 'MINERO',
    tasks: 'TAREAS',
    withdraw: 'RETIRAR',
    select_language: 'Seleccionar idioma',
    invite_friends: 'INVITAR AMIGOS',
    your_referral_link: 'TU ENLACE DE REFERIDO',
    copy_link: 'Copiar Enlace',
    friends_invited: 'Amigos invitados',
    earned_commissions: 'Comisiones ganadas',
    missions_board: 'TABLÓN DE MISIONES',
    complete_tasks_earn: 'Completa tareas y aumenta tu potencia GH/s',
    withdraw_funds: 'RETIRAR FONDOS',
    payout_address: 'Introduce dirección de billetera',
    withdraw_btn: 'SOLICITAR RETIRO',
    min_withdrawal_notice: 'Retiro mínimo: 0.05 USDT / GRAM'
  },
  hi: {
    mining_dashboard: 'माइनिंग डैशबोर्ड',
    support: 'सहायता',
    total_ghs_power: 'कुल GHS पावर',
    add_ghs_boost: '⚡ GHS पावर बढ़ाएं',
    reinvest_balance: '🔄 पुनः निवेश करें',
    unclaimed_mined_balance: 'उपलब्ध कमाई',
    ready_to_collect: 'कलेक्ट करने के लिए तैयार',
    collect_honey: 'रिवॉर्ड प्राप्त करें',
    wallet_balance: 'वॉलेट बैलेंस',
    miner_status: 'माइनर स्थिति',
    online_active: 'ऑनलाइन सक्रिय',
    rate_per_sec: 'कमाई की दर',
    daily_estimated: 'दैनिक अनुमानित',
    per_day: 'प्रति दिन',
    earn: 'कमाई',
    miner: 'माइनर',
    tasks: 'टास्क',
    withdraw: 'निकासी',
    select_language: 'भाषा चुनें',
    invite_friends: 'मित्रों को आमंत्रित करें',
    your_referral_link: 'आपका रेफरल लिंक',
    copy_link: 'लिंक कॉपी करें',
    friends_invited: 'आमंत्रित मित्र',
    earned_commissions: 'अर्जित कमीशन',
    missions_board: 'मिशन बोर्ड',
    complete_tasks_earn: 'टास्क पूरे करें और GH/s पावर बढ़ाएं',
    withdraw_funds: 'रिवॉर्ड निकालें',
    payout_address: 'वॉलेट पता दर्ज करें',
    withdraw_btn: 'निकासी का अनुरोध करें',
    min_withdrawal_notice: 'न्यूनतम निकासी: 0.05 USDT / GRAM'
  }
}

interface LanguageContextType {
  language: string
  setLanguage: (lang: string) => void
  currentLanguage: LanguageOption
  t: (key: string, fallback?: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  currentLanguage: LANGUAGES[0],
  t: (key: string) => key,
})

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('hashbee_lang')
      if (saved && translations[saved]) return saved

      // Auto detect from Telegram WebApp
      const tgLang = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.language_code
      if (tgLang) {
        const langLower = tgLang.toLowerCase()
        if (translations[langLower]) return langLower
        const short = langLower.split('-')[0]
        if (translations[short]) return short
      }
    } catch (e) {}
    return 'en'
  })

  const setLanguage = (lang: string) => {
    if (translations[lang]) {
      setLanguageState(lang)
      try {
        localStorage.setItem('hashbee_lang', lang)
      } catch (e) {}
    }
  }

  const currentLanguage = LANGUAGES.find(l => l.code === language) || LANGUAGES[0]

  const t = (key: string, fallback?: string): string => {
    const langDict = translations[language] || translations.en
    return langDict[key] || translations.en[key] || fallback || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, currentLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
`;

fs.writeFileSync(langContextPath, langContextCode, 'utf8');
console.log('✅ LanguageContext.tsx created!');

console.log('=== 2. Create LanguageModal.tsx ===');
const langModalPath = 'd:/antigravity/HashBee/miniapp/src/components/LanguageModal.tsx';
const langModalCode = `import React from 'react'
import { LANGUAGES, useLanguage } from '../context/LanguageContext'

interface LanguageModalProps {
  isOpen: boolean
  onClose: () => void
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ isOpen, onClose }) => {
  const { language, setLanguage, t } = useLanguage()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-sm bg-[#141e1b] border border-[#23332e] rounded-t-3xl sm:rounded-3xl p-6 text-stone-100 shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌐</span>
            <h2 className="text-base font-extrabold uppercase tracking-wider text-stone-100">
              {t('select_language', 'Select Language')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1b2824] hover:bg-[#23332e] flex items-center justify-center text-stone-400 hover:text-stone-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === language
            return (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code)
                  onClose()
                }}
                className={\`flex items-center justify-between p-3.5 rounded-2xl border transition-all \${
                  isSelected
                    ? 'bg-[#10b981]/15 border-[#10b981] text-emerald-300 font-extrabold shadow-sm'
                    : 'bg-[#182320] border-[#22332c] text-stone-300 hover:bg-[#1f2d29] hover:border-stone-600'
                }\`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{lang.flag}</span>
                  <div className="text-left">
                    <div className="text-sm font-bold leading-none">{lang.nativeName}</div>
                    <div className="text-[10px] text-stone-400 mt-1">{lang.name}</div>
                  </div>
                </div>
                {isSelected && (
                  <span className="text-emerald-400 font-black text-sm">✓</span>
                )}
              </button>
            )
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 rounded-2xl bg-[#1b2824] border border-[#2a3c36] text-stone-300 font-bold text-xs uppercase tracking-wider hover:bg-[#23332e]"
        >
          Close
        </button>
      </div>
    </div>
  )
}
`;
fs.writeFileSync(langModalPath, langModalCode, 'utf8');
console.log('✅ LanguageModal.tsx created!');

console.log('=== 3. Update Navbar.tsx to use translations ===');
const navbarPath = 'd:/antigravity/HashBee/miniapp/src/components/Navbar.tsx';
const navbarCode = `import React from 'react'
import { NavLink } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

export const Navbar: React.FC = () => {
  const { t } = useLanguage()

  const navItems = [
    {
      to: '/earn',
      label: t('earn', 'EARN'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      ),
    },
    {
      to: '/',
      label: t('miner', 'MINER'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M11 4a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2V4zm-6 8a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2v-1zm12 0a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2v-1z" />
        </svg>
      ),
    },
    {
      to: '/tasks',
      label: t('tasks', 'TASKS'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      to: '/withdraw',
      label: t('withdraw', 'WITHDRAW'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#121b18]/95 border-t border-[#23332e] px-3 py-2.5">
      <div className="max-w-md mx-auto flex justify-between items-center gap-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              \`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 \${
                isActive
                  ? 'bg-[#93b3a6] text-[#0f1614] font-extrabold shadow-md'
                  : 'text-[#6e8a7e] hover:text-[#b5cdc4]'
              }\`
            }
          >
            {item.icon}
            <span className="text-[10px] font-bold mt-1 tracking-wider">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  )
}
`;
fs.writeFileSync(navbarPath, navbarCode, 'utf8');
console.log('✅ Navbar.tsx updated!');

console.log('=== 4. Update App.tsx to include LanguageProvider ===');
const appTsxPath = 'd:/antigravity/HashBee/miniapp/src/App.tsx';
let appTsx = fs.readFileSync(appTsxPath, 'utf8');
if (!appTsx.includes('LanguageProvider')) {
  appTsx = `import React, { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { Navbar } from './components/Navbar'
import { Home } from './pages/Home'
import { Referrals } from './pages/Referrals'
import { Missions } from './pages/Missions'
import { Withdraw } from './pages/Withdraw'
import { BannedScreen } from './components/BannedScreen'

const AppContent: React.FC = () => {
  const { user, isBanned, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101715] flex flex-col items-center justify-center text-stone-300">
        <div className="w-10 h-10 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Loading HashBee...</p>
      </div>
    )
  }

  if (isBanned || user?.status === 'banned') {
    return <BannedScreen />
  }

  return (
    <div className="min-h-screen bg-[#101715] text-[#e6f0ec] font-sans antialiased selection:bg-[#93b3a6] selection:text-[#0f1614]">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/earn" element={<Referrals />} />
        <Route path="/tasks" element={<Missions />} />
        <Route path="/withdraw" element={<Withdraw />} />
      </Routes>
      <Navbar />
    </div>
  )
}

export const App: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready()
      window.Telegram.WebApp.expand()
    }

    // Trigger AdExium ad on opening the mini app
    const timer = setTimeout(() => {
      if (typeof (window as any).showAdexiumAdNow === 'function') {
        (window as any).showAdexiumAdNow()
      }
    }, 1200)

    return () => clearTimeout(timer)
  }, [])

  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
`;
  fs.writeFileSync(appTsxPath, appTsx, 'utf8');
  console.log('✅ App.tsx updated with LanguageProvider!');
}

console.log('=== 5. Update Home.tsx header with Language Button left to CS Support ===');
const homePath = 'd:/antigravity/HashBee/miniapp/src/pages/Home.tsx';
let homeCode = fs.readFileSync(homePath, 'utf8');

// Inject Language imports if needed
if (!homeCode.includes('useLanguage')) {
  homeCode = homeCode.replace(
    /import { useAuth } from '\.\.\/context\/AuthContext'/,
    `import { useAuth } from '../context/AuthContext'\nimport { useLanguage } from '../context/LanguageContext'\nimport { LanguageModal } from '../components/LanguageModal'`
  );
}

// Add state for showLangModal inside Home component
if (!homeCode.includes('showLangModal')) {
  homeCode = homeCode.replace(
    /const { user, refreshUser } = useAuth\(\)/,
    `const { user, refreshUser } = useAuth()\n  const { t, currentLanguage } = useLanguage()\n  const [showLangModal, setShowLangModal] = useState<boolean>(false)`
  );
}

// Replace header with Language button left to Support
const oldHeaderRegex = /\{\/\* Centered Page Header with Support Link \*\/\}[\s\S]*?<a[\s\S]*?href="https:\/\/t\.me\/kiopajje"[\s\S]*?<\/a>\s*<\/div>/;

const newHeader = `{/* Centered Page Header with Language Switcher & Support Link */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-extrabold text-stone-100 uppercase tracking-wider">
          {t('mining_dashboard', 'MINING DASHBOARD')}
        </h1>
        <div className="flex items-center gap-1.5">
          {/* Language Switcher Option Left to CS Support */}
          <button
            onClick={() => setShowLangModal(true)}
            className="flex items-center gap-1 text-[11px] font-extrabold text-stone-200 bg-[#1e2d27] hover:bg-[#283d35] px-2.5 py-1.5 rounded-full border border-[#334d42] transition-all shadow-sm active:scale-95"
            title="Change Language"
          >
            <span className="text-xs">{currentLanguage.flag}</span>
            <span className="uppercase tracking-wider">{currentLanguage.code}</span>
          </button>

          {/* CS Support Button */}
          <a
            href="https://t.me/kiopajje"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 px-2.5 py-1.5 rounded-full border border-emerald-400/20 transition-all active:scale-95"
          >
            <span>🎧</span>
            <span>{t('support', 'Support')}</span>
          </a>
        </div>
      </div>`;

if (oldHeaderRegex.test(homeCode)) {
  homeCode = homeCode.replace(oldHeaderRegex, newHeader);
}

// Update card labels to use t()
homeCode = homeCode.replace(
  /<div className="text-\[11px\] font-extrabold text-stone-400 uppercase tracking-widest">\s*TOTAL GHS POWER\s*<\/div>/,
  `<div className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest">{t('total_ghs_power', 'TOTAL GHS POWER')}</div>`
);
homeCode = homeCode.replace(
  /<div className="text-\[11px\] font-extrabold text-stone-400 uppercase tracking-widest">\s*UNCLAIMED MINED BALANCE\s*<\/div>/,
  `<div className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest">{t('unclaimed_mined_balance', 'UNCLAIMED MINED BALANCE')}</div>`
);
homeCode = homeCode.replace(
  /⚡ Add GHS Boost/g,
  `{t('add_ghs_boost', '⚡ Add GHS Boost')}`
);
homeCode = homeCode.replace(
  /🔄 Reinvest Mined/g,
  `{t('reinvest_balance', '🔄 Reinvest Mined')}`
);
homeCode = homeCode.replace(
  /COLLECT HONEY/g,
  `{t('collect_honey', 'COLLECT REWARDS')}`
);

// Append LanguageModal at the end of Home before closing tag
if (!homeCode.includes('<LanguageModal')) {
  homeCode = homeCode.replace(
    /<\/div>\s*\)\s*\}\s*export default Home/,
    `  <LanguageModal isOpen={showLangModal} onClose={() => setShowLangModal(false)} />\n    </div>\n  )\n}\n\nexport default Home`
  );
}

fs.writeFileSync(homePath, homeCode, 'utf8');
console.log('✅ Home.tsx updated with Language switcher left to CS Support!');

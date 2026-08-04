import { TonConnectButton } from '@tonconnect/ui-react'

export default function Header({ title, right, user, navigate }) {
  return (
    <header className="sticky top-0 z-30 bg-surface border-b border-border h-14 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        {user && navigate ? (
          <button 
            onClick={() => navigate('profile')}
            className="flex items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[1.5px] shadow-sm">
              <div className="w-full h-full bg-surface rounded-full flex items-center justify-center border border-surface">
                <span className="font-black text-xs text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 uppercase">
                  {user.first_name ? user.first_name.charAt(0) : 'U'}
                </span>
              </div>
            </div>
            <span className="text-brand font-black text-lg tracking-tight truncate max-w-[140px] text-left">
              {user.first_name || 'TASKY'}
            </span>
          </button>
        ) : (
          <span className="text-brand font-black text-xl tracking-tight">TASKY</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {right}
        <TonConnectButton className="ton-connect-button-compact" />
      </div>
    </header>
  )
}

import { TonConnectButton } from '@tonconnect/ui-react'

export default function Header({ title, right }) {
  return (
    <header className="sticky top-0 z-30 bg-surface border-b border-border h-14 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-brand font-black text-xl tracking-tight">TASKY</span>
      </div>
      <div className="flex items-center gap-2">
        {right}
        <TonConnectButton className="ton-connect-button-compact" />
      </div>
    </header>
  )
}

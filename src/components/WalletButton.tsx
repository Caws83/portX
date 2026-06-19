import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export function WalletButton() {
  const isCompact = useMediaQuery('(max-width: 639px)')

  return (
    <div className="navbar-wallet shrink-0">
      <ConnectButton
        showBalance={false}
        chainStatus={{ largeScreen: 'icon', smallScreen: 'none' }}
        accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
        label={isCompact ? 'Connect' : 'Connect Wallet'}
      />
    </div>
  )
}

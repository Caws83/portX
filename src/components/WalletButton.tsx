import { ConnectButton } from '@rainbow-me/rainbowkit'

export function WalletButton() {
  return (
    <ConnectButton
      showBalance={false}
      chainStatus="icon"
      accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
    />
  )
}

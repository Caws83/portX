import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useRequiredTradeChain } from '@/hooks/useRequiredTradeChain'
import { usePortfolioTradeContextOptional } from '@/context/PortfolioTradeProvider'
import { truncateAddress } from '@/utils/format'

interface WalletChainControlProps {
  className?: string
}

export function WalletChainControl({ className = '' }: WalletChainControlProps) {
  const isCompact = useMediaQuery('(max-width: 639px)')
  const trade = usePortfolioTradeContextOptional()

  const {
    requiredChain,
    walletChainLabel,
    walletAddress,
    isConnected,
    isWrongChain,
    isSwitching,
    switchToRequiredChain,
  } = useRequiredTradeChain({
    plan: trade?.plan ?? null,
    selectedBasket: trade?.selectedBasket ?? null,
    modalOpen: trade?.modalOpen ?? false,
  })

  if (!isConnected) {
    return (
      <div className={`navbar-wallet shrink-0 ${className}`.trim()}>
        <ConnectButton
          showBalance={false}
          chainStatus={{ largeScreen: 'icon', smallScreen: 'none' }}
          accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
          label={isCompact ? 'Connect' : 'Connect Wallet'}
        />
      </div>
    )
  }

  return (
    <div className={`navbar-wallet shrink-0 flex items-center gap-2 ${className}`.trim()}>
      <div className="hidden sm:flex flex-col items-end text-right min-w-0 max-w-[9rem]">
        <span className="text-[10px] font-mono text-white/90 truncate w-full">
          {walletAddress ? truncateAddress(walletAddress, 3) : '—'}
        </span>
        <span
          className={`text-[10px] truncate w-full ${
            isWrongChain ? 'text-portx-warning' : 'text-portx-muted'
          }`}
          title={`Wallet: ${walletChainLabel} · Required: ${requiredChain.name}`}
        >
          {walletChainLabel}
          {!isWrongChain ? ` · ${requiredChain.shortName}` : ''}
        </span>
      </div>

      {isWrongChain ? (
        <button
          type="button"
          onClick={switchToRequiredChain}
          disabled={isSwitching}
          className="btn-secondary text-xs px-2.5 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap disabled:opacity-50"
        >
          {isSwitching ? 'Switching…' : isCompact ? requiredChain.shortName : `Switch to ${requiredChain.name}`}
        </button>
      ) : null}

      <ConnectButton
        showBalance={false}
        chainStatus={{ largeScreen: 'icon', smallScreen: 'none' }}
        accountStatus={{ smallScreen: 'avatar', largeScreen: isCompact ? 'avatar' : 'address' }}
      />
    </div>
  )
}

import { useState } from 'react'
import type { NotablePortfolio } from '@/types/whale'
import type { Basket } from '@/types/basket'
import { withDefaultChainMetadata } from '@/types/basketChain'
import type { Token } from '@/types/token'
import { BUTTON_LABELS } from '@/config/uiCopy'
import { useBasketStore } from '@/store/basketStore'
import { useTokens } from '@/hooks/useTokens'

function notablePortfolioToBasket(
  portfolio: NotablePortfolio,
  getTokenBySymbol: (symbol: string) => Token | undefined
): Basket {
  const allocations = portfolio.tokens.map(({ symbol, allocationPercent }) => {
    const token = getTokenBySymbol(symbol) ?? {
      symbol,
      name: symbol,
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      priceUsd: 1,
      change24h: 0,
    }
    return { token, weightPercent: allocationPercent }
  })

  const chainMeta = withDefaultChainMetadata(portfolio)

  return {
    id: `copied-${portfolio.id}-${Date.now()}`,
    name: `${portfolio.name} (Copy)`,
    description: `Copied from Discover — ${portfolio.description}`,
    tag: portfolio.category,
    chain: chainMeta.chain,
    chainLabel: chainMeta.chainLabel,
    chainStatus: chainMeta.chainStatus,
    allocations,
    totalValueUsd: portfolio.estimatedValueUsd,
    isCustom: true,
  }
}

interface CopyPortfolioButtonProps {
  portfolio: NotablePortfolio
  className?: string
  onCopied?: () => void
}

export function CopyPortfolioButton({ portfolio, className = '', onCopied }: CopyPortfolioButtonProps) {
  const addCustomBasket = useBasketStore((s) => s.addCustomBasket)
  const { getTokenBySymbol } = useTokens()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!portfolio.isCopyable || copied) return

    // Converts discovery template → Zustand basket — no trade execution
    // Future: optional on-chain snapshot before copy via wallet intelligence API
    const basket = notablePortfolioToBasket(portfolio, getTokenBySymbol)
    addCustomBasket(basket)
    setCopied(true)
    onCopied?.()
    setTimeout(() => setCopied(false), 4000)
  }

  if (!portfolio.isCopyable) {
    return (
      <button type="button" disabled className={`btn-secondary opacity-50 cursor-not-allowed ${className}`}>
        Not copyable
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={copied}
      className={`${copied ? 'btn-secondary border-portx-green text-portx-green' : 'btn-primary'} ${className}`}
    >
      {copied ? `${BUTTON_LABELS.copiedBasket} ✓` : BUTTON_LABELS.copyBasket}
    </button>
  )
}

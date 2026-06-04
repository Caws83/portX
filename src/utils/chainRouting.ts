import type { Basket } from '@/types/basket'
import type { BasketChain } from '@/types/basketChain'

/** Live 0x quote preview is only available for Ethereum mainnet active baskets. */
export function canPreviewQuoteForBasket(basket: Basket): boolean {
  return basket.chain === 'ethereum' && basket.chainStatus === 'active'
}

const PLANNED_CHAIN_MESSAGES: Partial<Record<BasketChain, string>> = {
  base: 'Base baskets are planned. Live routing is currently available for Ethereum baskets only.',
  solana: 'Solana baskets are planned. Jupiter routing coming soon.',
  avalanche: 'Avalanche baskets are planned. Avalanche routing coming soon.',
  bsc: 'BSC baskets are planned. Live routing is currently available for Ethereum baskets only.',
}

export function getPlannedChainMessage(basket: Basket): string {
  if (basket.chainStatus === 'planned' && PLANNED_CHAIN_MESSAGES[basket.chain]) {
    return PLANNED_CHAIN_MESSAGES[basket.chain]!
  }

  if (basket.chain !== 'ethereum') {
    const label = basket.chainLabel || basket.chain
    return `${label} baskets are planned. Live routing is currently available for Ethereum baskets only.`
  }

  if (basket.chainStatus === 'planned') {
    return 'This basket is planned. Live routing is currently available for Ethereum baskets only.'
  }

  return 'Live routing is currently available for Ethereum baskets only.'
}

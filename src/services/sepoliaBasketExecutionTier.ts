import type { Basket } from '@/types/basket'
import { ENABLE_TESTNET_MODE } from '@/config/features'
import { resolveTestnetBasketToken } from '@/config/testnetBasketTokens'
import { isTestnetMultiTokenBasket } from '@/data/testnetMultiTokenBasket'
import { shouldUseMultiTokenTestnetQuote } from '@/services/testnetMultiTokenQuote'
import { canPreviewQuoteForBasket } from '@/utils/chainRouting'

export type SepoliaBasketExecutionTier = 'executable' | 'stub' | 'template'

export const SEPOLIA_TIER_LABELS: Record<SepoliaBasketExecutionTier, string> = {
  executable: 'Sepolia executable',
  stub: 'Routing coming soon',
  template: 'Preview template',
}

export const SEPOLIA_STUB_NOTICE =
  'Sepolia preview — swaps to USDC only, not displayed tokens.'

export const SEPOLIA_TEMPLATE_NOTICE = 'Template only — routing coming soon.'

export const SEPOLIA_STUB_BUTTON_LABEL = 'Routing not ready'

function isTemplateOnlyBasket(basket: Basket): boolean {
  return (
    basket.templateOnly === true ||
    basket.category === 'sport-fan' ||
    basket.chainStatus === 'planned' ||
    basket.chain !== 'ethereum'
  )
}

/** True when Sepolia routing buys each displayed allocation token (not USDC-only stub). */
function basketAcquiresDisplayedTokens(basket: Basket): boolean {
  if (isTestnetMultiTokenBasket(basket.id)) return true
  if (!shouldUseMultiTokenTestnetQuote(basket.allocations)) return false

  return basket.allocations.every((allocation) => {
    const resolved = resolveTestnetBasketToken(allocation.token.symbol)
    return resolved !== null && resolved.symbol !== 'USDC'
  })
}

export function getSepoliaBasketExecutionTier(basket: Basket): SepoliaBasketExecutionTier {
  if (!ENABLE_TESTNET_MODE) {
    return isTemplateOnlyBasket(basket) ? 'template' : 'stub'
  }

  if (isTemplateOnlyBasket(basket)) return 'template'

  if (basketAcquiresDisplayedTokens(basket)) return 'executable'

  if (canPreviewQuoteForBasket(basket)) return 'stub'

  return 'template'
}

export function canExecuteSepoliaBasket(basket: Basket): boolean {
  return getSepoliaBasketExecutionTier(basket) === 'executable'
}

export function getSepoliaBasketTierLabel(tier: SepoliaBasketExecutionTier): string {
  return SEPOLIA_TIER_LABELS[tier]
}

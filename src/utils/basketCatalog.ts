import type { Basket, BasketCategory } from '@/types/basket'
import { ENABLE_TESTNET_MODE } from '@/config/features'
import { TESTNET_MULTI_TOKEN_BASKET_ID } from '@/data/testnetMultiTokenBasket'
import { SPORT_FAN_BASKETS } from '@/data/sportFanBaskets'
import { canPreviewQuoteForBasket } from '@/utils/chainRouting'
import { isTestnetMultiTokenBasket } from '@/data/testnetMultiTokenBasket'

export type BasketCatalogSection =
  | 'my-portfolios'
  | 'featured'
  | 'community'
  | 'sport-fan'
  | 'testnet'

export const BASKET_SECTION_LABELS: Record<BasketCatalogSection, string> = {
  'my-portfolios': 'My Portfolios',
  featured: 'Featured Portfolios',
  community: 'Community Portfolios',
  'sport-fan': 'Sport & Fan Tokens',
  testnet: 'Testnet Portfolios',
}

export const DISCOVER_CATEGORY_PILLS: { id: BasketCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'defi', label: 'DeFi' },
  { id: 'ai', label: 'AI' },
  { id: 'meme', label: 'Meme' },
  { id: 'bitcoin', label: 'Bitcoin' },
  { id: 'stable', label: 'Stable' },
  { id: 'sport-fan', label: 'Sport & Fan Tokens' },
  { id: 'whale', label: 'Whale' },
  { id: 'institutional', label: 'Institutional' },
]

const HIDDEN_TESTNET_IDS = new Set(['mainnet-pilot-link'])

export function dedupeBaskets(baskets: Basket[]): Basket[] {
  const seen = new Set<string>()
  return baskets.filter((basket) => {
    if (!basket.id || !basket.name?.trim()) return false
    if (seen.has(basket.id)) return false
    seen.add(basket.id)
    return true
  })
}

export function mergeCatalogBaskets(base: Basket[]): Basket[] {
  const merged = dedupeBaskets([...base, ...SPORT_FAN_BASKETS])
  return merged
}

/** Hide pilot fixtures and duplicate/invalid entries in testnet product mode */
export function filterBasketsForAppMode(baskets: Basket[]): Basket[] {
  const deduped = dedupeBaskets(baskets)

  if (!ENABLE_TESTNET_MODE) {
    return deduped.filter((b) => !isTestnetMultiTokenBasket(b.id) || b.id === TESTNET_MULTI_TOKEN_BASKET_ID)
  }

  return deduped.filter((basket) => {
    if (HIDDEN_TESTNET_IDS.has(basket.id)) return false
    if (basket.templateOnly) return true
    if (isTestnetMultiTokenBasket(basket.id)) return true
    if (basket.isCustom) return true
    if (basket.category === 'sport-fan') return true
    if (basket.chainStatus === 'planned') return false
    return basket.chainStatus === 'active' || basket.category === 'featured'
  })
}

export function canShowBasketQuotes(basket: Basket): boolean {
  if (basket.templateOnly) return false
  if (ENABLE_TESTNET_MODE && isTestnetMultiTokenBasket(basket.id)) return true
  return canPreviewQuoteForBasket(basket)
}

export function resolveBasketSection(
  basket: Basket,
  ownedIds: Set<string>,
): BasketCatalogSection | null {
  if (ownedIds.has(basket.id)) return 'my-portfolios'
  if (isTestnetMultiTokenBasket(basket.id)) return 'featured'
  if (basket.category === 'sport-fan' || basket.templateOnly) return 'sport-fan'
  if (basket.isCustom) return 'community'
  return 'featured'
}

export function groupBasketsBySection(
  baskets: Basket[],
  ownedIds: Set<string>,
): Record<BasketCatalogSection, Basket[]> {
  const sections: Record<BasketCatalogSection, Basket[]> = {
    'my-portfolios': [],
    featured: [],
    community: [],
    'sport-fan': [],
    testnet: [],
  }

  const assigned = new Set<string>()

  for (const basket of baskets) {
    if (ownedIds.has(basket.id)) {
      sections['my-portfolios'].push(basket)
      assigned.add(basket.id)
    }
  }

  sections['my-portfolios'].sort((a, b) => {
    if (a.id === TESTNET_MULTI_TOKEN_BASKET_ID) return -1
    if (b.id === TESTNET_MULTI_TOKEN_BASKET_ID) return 1
    return 0
  })

  for (const basket of baskets) {
    if (assigned.has(basket.id)) continue
    const section = resolveBasketSection(basket, ownedIds)
    if (!section || section === 'my-portfolios') continue
    sections[section].push(basket)
    assigned.add(basket.id)
  }

  return sections
}

export function estimateBasketHoldingsValueUsd(
  basket: Basket,
  walletAssets: Array<{ symbol: string; estimatedValueUsd: number }>,
): number {
  const symbols = new Set(basket.allocations.map((a) => a.token.symbol.toUpperCase()))
  return walletAssets
    .filter((asset) => symbols.has(asset.symbol.toUpperCase()))
    .reduce((sum, asset) => sum + asset.estimatedValueUsd, 0)
}

export function inferBasketCategoryFromTag(tag: string): BasketCategory {
  const normalized = tag.toLowerCase()
  if (normalized.includes('defi')) return 'defi'
  if (normalized.includes('meme')) return 'meme'
  if (normalized.includes('yield') || normalized.includes('stable')) return 'stable'
  if (normalized.includes('thematic') || normalized.includes('ai')) return 'ai'
  if (normalized.includes('pilot')) return 'pilot'
  if (normalized.includes('testnet')) return 'testnet'
  if (normalized.includes('sport')) return 'sport-fan'
  return 'featured'
}

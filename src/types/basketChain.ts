/** Chain scope for a PortX basket template (planning + UI labels). */
export type BasketChain = 'ethereum' | 'base' | 'avalanche' | 'bsc' | 'solana'

/** Whether quotes / execution are live on that chain today. */
export type ChainStatus = 'active' | 'planned'

export const BASKET_CHAIN_LABELS: Record<BasketChain, string> = {
  ethereum: 'Ethereum',
  base: 'Base',
  avalanche: 'Avalanche',
  bsc: 'BSC',
  solana: 'Solana',
}

export const DEFAULT_BASKET_CHAIN: BasketChain = 'ethereum'

export const DEFAULT_CHAIN_STATUS: ChainStatus = 'active'

/** Human-readable badge text, e.g. "Ethereum (Active)". */
export function formatChainBadgeLabel(chainLabel: string, chainStatus: ChainStatus): string {
  const status = chainStatus === 'active' ? 'Active' : 'Planned'
  return `${chainLabel} (${status})`
}

export function getChainLabel(chain: BasketChain): string {
  return BASKET_CHAIN_LABELS[chain]
}

/** Fill chain metadata when loading baskets from API without chain fields. */
export function withDefaultChainMetadata<T extends Partial<ChainFields>>(
  basket: T
): T & ChainFields {
  const chain = basket.chain ?? DEFAULT_BASKET_CHAIN
  return {
    ...basket,
    chain,
    chainLabel: basket.chainLabel ?? getChainLabel(chain),
    chainStatus: basket.chainStatus ?? DEFAULT_CHAIN_STATUS,
  }
}

export interface ChainFields {
  chain: BasketChain
  chainLabel: string
  chainStatus: ChainStatus
}

/** Discover page filter options (BSC omitted from filter bar per product spec). */
export type DiscoverChainFilter = 'all' | 'ethereum' | 'base' | 'avalanche' | 'solana'

export const DISCOVER_CHAIN_FILTERS: { id: DiscoverChainFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'base', label: 'Base' },
  { id: 'avalanche', label: 'Avalanche' },
  { id: 'solana', label: 'Solana' },
]

export function matchesDiscoverChainFilter(
  chain: BasketChain,
  filter: DiscoverChainFilter
): boolean {
  return filter === 'all' || chain === filter
}

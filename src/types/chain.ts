/**
 * Multi-chain basket planning types.
 * Not wired into quote or execution flows yet — see docs/MULTICHAIN_ARCHITECTURE.md.
 */

/** Chains PortX may support for baskets (Phase 1+). */
export type SupportedChain = 'ethereum' | 'base' | 'avalanche' | 'bsc' | 'solana'

/** Per-chain basket capability in the product roadmap. */
export type ChainBasketSupport = {
  chain: SupportedChain
  /** Whether users can create or buy baskets on this chain today */
  status: 'active' | 'planned' | 'tracking_only'
  /** Example basket symbols documented for this chain (not enforced at runtime) */
  exampleSymbols: string[]
  /** Product phase when this chain is expected to go live */
  phase: 1 | 2 | 3 | 4
}

/** On-chain swap aggregator for a single chain (no bridge). */
export type RouterProvider =
  | '0x'
  | '1inch'
  | 'uniswap'
  | 'jupiter'
  | 'trader_joe'
  | 'aerodrome'
  | 'none'

/** Cross-chain liquidity bridge aggregator (Phase 3+). */
export type BridgeProvider = 'lifi' | 'socket' | 'debridge' | 'none'

/**
 * How far PortX goes across chains for a given feature slice.
 * Matches phases in docs/MULTICHAIN_ARCHITECTURE.md.
 */
export type CrossChainExecutionMode =
  | 'single_chain_only'
  | 'multi_chain_tracking'
  | 'bridge_execution'
  | 'full_cross_chain'

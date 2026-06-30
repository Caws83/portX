import type { BasketChain, ChainStatus } from './basketChain'
import type { TokenAllocation } from './token'

/** Product category for catalog sections and Discover filters */
export type BasketCategory =
  | 'featured'
  | 'community'
  | 'sport-fan'
  | 'testnet'
  | 'pilot'
  | 'defi'
  | 'ai'
  | 'meme'
  | 'stable'
  | 'bitcoin'
  | 'whale'
  | 'institutional'

export interface Basket {
  id: string
  name: string
  description: string
  tag: string
  /** Chain this basket is scoped to */
  chain: BasketChain
  chainLabel: string
  chainStatus: ChainStatus
  allocations: TokenAllocation[]
  totalValueUsd?: number
  isCustom?: boolean
  createdAt?: number
  /** Catalog section / theme */
  category?: BasketCategory
  /** Display tags (SportFi, Fan Tokens, etc.) */
  tags?: string[]
  /** Preview-only template — no live routing */
  templateOnly?: boolean
}

export interface BasketPurchase {
  basketId: string
  amountUsd: number
  purchasedAt: number
  entryValueUsd: number
}

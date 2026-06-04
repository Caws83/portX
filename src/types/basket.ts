import type { BasketChain, ChainStatus } from './basketChain'
import type { TokenAllocation } from './token'

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
}

export interface BasketPurchase {
  basketId: string
  amountUsd: number
  purchasedAt: number
  entryValueUsd: number
}

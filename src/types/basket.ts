import type { TokenAllocation } from './token'

export interface Basket {
  id: string
  name: string
  description: string
  tag: string
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

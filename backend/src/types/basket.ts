import type { Token } from './token.js'

export interface TokenAllocation {
  token: Token
  weightPercent: number
}

export interface Basket {
  id: string
  name: string
  description: string
  tag: string
  allocations: TokenAllocation[]
  totalValueUsd?: number
}

export interface Token {
  symbol: string
  name: string
  address: string
  decimals: number
  logoUrl?: string
  priceUsd: number
  change24h: number
}

export interface TokenAllocation {
  token: Token
  weightPercent: number
}

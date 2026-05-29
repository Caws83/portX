export const APP_NAME = 'PortX'
export const TAGLINE = 'Trade portfolios like a single asset.'

export const DEFAULT_SLIPPAGE_BPS = 50
export const DEFAULT_STABLECOIN = 'USDC'

export const SLIPPAGE_OPTIONS = [10, 30, 50, 100, 300]

export const STABLECOIN_OPTIONS = ['USDC', 'USDT', 'DAI'] as const

export type StablecoinOption = (typeof STABLECOIN_OPTIONS)[number]

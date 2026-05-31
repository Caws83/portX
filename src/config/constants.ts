export const APP_NAME = 'PortX'
export const TAGLINE = 'Trade portfolios like a single asset.'

export const DEFAULT_SLIPPAGE_BPS = 50
export const DEFAULT_STABLECOIN = 'USDC'
export const DEFAULT_BUY_AMOUNT_USD = 1000

export const SLIPPAGE_OPTIONS = [10, 30, 50, 100, 300]

export const STABLECOIN_OPTIONS = ['USDC', 'USDT', 'DAI'] as const

export type StablecoinOption = (typeof STABLECOIN_OPTIONS)[number]

/** PortX backend quote API — frontend never exposes DEX API keys */
export const PORTX_API_URL = import.meta.env.VITE_PORTX_API_URL ?? 'http://localhost:8080'

/** When true, use local mocked quote providers; when false, prefer backend API */
export const ENABLE_DEMO_QUOTES = import.meta.env.VITE_ENABLE_DEMO_QUOTES !== 'false'

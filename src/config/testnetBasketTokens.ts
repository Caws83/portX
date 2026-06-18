import type { Address } from 'viem'
import {
  TESTNET_SEPOLIA_CHAIN_ID,
  TESTNET_UNISWAP_POOL_FEE,
  TESTNET_USDC_ADDRESS,
  TESTNET_WETH_ADDRESS,
} from '@/config/testnetExecution'

/** Uniswap V3 pool fee tier per Sepolia pair (verified via QuoterV2) */
export type TestnetPoolFee = 500 | 3000 | 10000

export interface TestnetBasketToken {
  symbol: string
  name: string
  address: Address
  decimals: number
  poolFee: TestnetPoolFee
  /** Rough USD price for preview valuation only */
  priceUsd: number
}

export const TESTNET_BASKET_TOKENS = {
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: TESTNET_WETH_ADDRESS,
    decimals: 18,
    poolFee: 3000,
    priceUsd: 2500,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: TESTNET_USDC_ADDRESS,
    decimals: 6,
    poolFee: 500,
    priceUsd: 1,
  },
  LINK: {
    symbol: 'LINK',
    name: 'Chainlink',
    address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
    decimals: 18,
    poolFee: 500,
    priceUsd: 18.5,
  },
  UNI: {
    symbol: 'UNI',
    name: 'Uniswap',
    address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    decimals: 18,
    poolFee: 3000,
    priceUsd: 12.2,
  },
  AAVE: {
    symbol: 'AAVE',
    name: 'Aave',
    address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
    decimals: 18,
    poolFee: 3000,
    priceUsd: 285,
  },
} as const satisfies Record<string, TestnetBasketToken>

export type TestnetBasketTokenSymbol = keyof typeof TESTNET_BASKET_TOKENS

const TOKEN_BY_SYMBOL = new Map<string, TestnetBasketToken>(
  Object.values(TESTNET_BASKET_TOKENS).map((token) => [token.symbol.toUpperCase(), token]),
)

export function resolveTestnetBasketToken(symbol: string): TestnetBasketToken | null {
  const normalized = symbol.toUpperCase()
  if (normalized === 'ETH') {
    return TESTNET_BASKET_TOKENS.WETH
  }
  return TOKEN_BY_SYMBOL.get(normalized) ?? null
}

export function isTestnetBasketTokenSupported(symbol: string): boolean {
  return TOKEN_BY_SYMBOL.has(symbol.toUpperCase())
}

export function toQuoteToken(token: TestnetBasketToken) {
  return {
    symbol: token.symbol,
    name: token.name,
    address: token.address,
    decimals: token.decimals,
    priceUsd: token.priceUsd,
    change24h: 0,
  }
}

export const TESTNET_MULTI_TOKEN_BASKET_CHAIN_ID = TESTNET_SEPOLIA_CHAIN_ID

/** Default pool fee when token-specific fee is unavailable */
export const TESTNET_DEFAULT_POOL_FEE = TESTNET_UNISWAP_POOL_FEE

import type { Basket } from '@/types/basket'
import { TESTNET_MULTI_TOKEN_BASKET_CHAIN_ID } from '@/config/testnetBasketTokens'

/** Internal Sepolia beta fixture — 40% LINK / 30% UNI / 20% WETH / 10% AAVE */
export const TESTNET_MULTI_TOKEN_BASKET_ID = 'sepolia-multi-token-beta'

export const TESTNET_MULTI_TOKEN_BASKET: Basket = {
  id: TESTNET_MULTI_TOKEN_BASKET_ID,
  name: 'Sepolia Multi-Token Beta',
  description:
    'Internal testnet basket for true multi-leg execution. Each leg acquires a distinct Sepolia asset via Uniswap V3.',
  tag: 'Testnet',
  chain: 'ethereum',
  chainLabel: 'Ethereum Sepolia',
  chainStatus: 'active',
  allocations: [
    { token: { symbol: 'LINK', name: 'Chainlink', address: '0x779877A7B0D9E8603169DdbD7836e478b4624789', decimals: 18, priceUsd: 18.5, change24h: 0 }, weightPercent: 40 },
    { token: { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', decimals: 18, priceUsd: 12.2, change24h: 0 }, weightPercent: 30 },
    { token: { symbol: 'WETH', name: 'Wrapped Ether', address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', decimals: 18, priceUsd: 2500, change24h: 0 }, weightPercent: 20 },
    { token: { symbol: 'AAVE', name: 'Aave', address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', decimals: 18, priceUsd: 285, change24h: 0 }, weightPercent: 10 },
  ],
  totalValueUsd: 100,
}

export function isTestnetMultiTokenBasket(basketId?: string | null): boolean {
  return basketId === TESTNET_MULTI_TOKEN_BASKET_ID
}

export function isTestnetMultiTokenBasketAllocations(allocations: { token: { symbol: string } }[]): boolean {
  if (allocations.length < 2) return false
  const symbols = new Set(allocations.map((allocation) => allocation.token.symbol.toUpperCase()))
  if (symbols.size < 2) return false
  return allocations.every((allocation) =>
    ['LINK', 'UNI', 'WETH', 'AAVE'].includes(allocation.token.symbol.toUpperCase()),
  )
}

export function getTestnetMultiTokenBasketChainId(): number {
  return TESTNET_MULTI_TOKEN_BASKET_CHAIN_ID
}

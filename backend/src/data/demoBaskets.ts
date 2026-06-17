import type { Basket } from '../types/basket.js'
import { requireToken } from './tokens.js'

function alloc(symbols: string[], weights: number[]) {
  return symbols.map((symbol, i) => ({
    token: requireToken(symbol),
    weightPercent: weights[i],
  }))
}

export const DEMO_BASKETS: Basket[] = [
  {
    id: 'mainnet-pilot-link',
    name: 'Mainnet Pilot — LINK',
    description:
      'Internal single-leg pilot fixture. 100% LINK bought with USDC on Ethereum mainnet. For gated testing only.',
    tag: 'Pilot',
    allocations: alloc(['LINK'], [100]),
    totalValueUsd: 100,
  },
  {
    id: 'top-5-crypto',
    name: 'Top 5 Crypto',
    description: 'Weighted exposure to the largest assets by market cap.',
    tag: 'Core',
    allocations: alloc(['BTC', 'ETH', 'SOL', 'LINK', 'UNI'], [35, 30, 15, 10, 10]),
    totalValueUsd: 10000,
  },
  {
    id: 'defi-blue-chips',
    name: 'DeFi Blue Chips',
    description: 'Leading DeFi protocols and infrastructure tokens.',
    tag: 'DeFi',
    allocations: alloc(['UNI', 'AAVE', 'LINK', 'ETH'], [25, 25, 25, 25]),
    totalValueUsd: 7500,
  },
  {
    id: 'ai-tokens',
    name: 'AI Tokens',
    description: 'Basket focused on AI and compute narrative tokens.',
    tag: 'Thematic',
    allocations: alloc(['FET', 'RNDR', 'ETH', 'LINK'], [30, 30, 25, 15]),
    totalValueUsd: 5000,
  },
  {
    id: 'meme-basket',
    name: 'Meme Basket',
    description: 'High-volatility meme exposure.',
    tag: 'Meme',
    allocations: alloc(['PEPE', 'DOGE', 'SOL'], [40, 35, 25]),
    totalValueUsd: 2500,
  },
  {
    id: 'stable-basket',
    name: 'Stable Basket',
    description: 'Stablecoin-heavy basket for lower volatility.',
    tag: 'Yield',
    allocations: alloc(['USDC', 'USDT', 'DAI', 'ETH'], [40, 30, 20, 10]),
    totalValueUsd: 15000,
  },
]

export function getBasketById(id: string): Basket | undefined {
  return DEMO_BASKETS.find((b) => b.id === id)
}

export function requireBasket(id: string): Basket {
  const basket = getBasketById(id)
  if (!basket) throw new Error(`Unknown basket: ${id}`)
  return basket
}

import type { Basket } from '@/types/basket'

import { DEMO_TOKENS } from './tokens'

function alloc(symbols: string[], weights: number[]) {
  return symbols.map((symbol, i) => {
    const token = DEMO_TOKENS.find((t) => t.symbol === symbol)!
    return { token, weightPercent: weights[i] }
  })
}

export const DEMO_BASKETS: Basket[] = [
  {
    id: 'top-5-crypto',
    name: 'Top 5 Crypto',
    description: 'Weighted exposure to the largest assets by market cap.',
    tag: 'Core',
    chain: 'ethereum',
    chainLabel: 'Ethereum',
    chainStatus: 'active',
    allocations: alloc(['BTC', 'ETH', 'SOL', 'LINK', 'UNI'], [35, 30, 15, 10, 10]),
    totalValueUsd: 10000,
  },
  {
    id: 'base-ai-basket',
    name: 'Base AI Basket',
    description: 'AI and agent narrative tokens on Base — quotes planned for a future release.',
    tag: 'Thematic',
    chain: 'base',
    chainLabel: 'Base',
    chainStatus: 'planned',
    allocations: alloc(['ETH', 'USDC', 'LINK', 'UNI'], [35, 25, 20, 20]),
    totalValueUsd: 5000,
  },
  {
    id: 'defi-blue-chips',
    name: 'DeFi Blue Chips',
    description: 'Leading DeFi protocols and infrastructure tokens.',
    tag: 'DeFi',
    chain: 'ethereum',
    chainLabel: 'Ethereum',
    chainStatus: 'active',
    allocations: alloc(['UNI', 'AAVE', 'LINK', 'ETH'], [25, 25, 25, 25]),
    totalValueUsd: 7500,
  },
  {
    id: 'solana-meme-basket',
    name: 'Solana Meme Basket',
    description: 'High-volatility meme exposure on Solana — planned chain, demo weights only.',
    tag: 'Meme',
    chain: 'solana',
    chainLabel: 'Solana',
    chainStatus: 'planned',
    allocations: alloc(['SOL', 'PEPE', 'DOGE'], [40, 35, 25]),
    totalValueUsd: 2500,
  },
  {
    id: 'stable-yield',
    name: 'Stable Yield Basket',
    description: 'Stablecoin-heavy basket for lower volatility.',
    tag: 'Yield',
    chain: 'ethereum',
    chainLabel: 'Ethereum',
    chainStatus: 'active',
    allocations: alloc(['USDC', 'USDT', 'DAI', 'ETH'], [40, 30, 20, 10]),
    totalValueUsd: 15000,
  },
  {
    id: 'avalanche-defi',
    name: 'Avalanche DeFi Basket',
    description: 'C-Chain DeFi mix — JOE and GMX weights for future Avalanche routing.',
    tag: 'DeFi',
    chain: 'avalanche',
    chainLabel: 'Avalanche',
    chainStatus: 'planned',
    allocations: alloc(['ETH', 'USDC', 'LINK', 'UNI'], [30, 30, 20, 20]),
    totalValueUsd: 4000,
  },
]

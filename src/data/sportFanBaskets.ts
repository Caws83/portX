import type { Basket } from '@/types/basket'
import { DEMO_TOKENS } from './tokens'

function alloc(symbols: string[], weights: number[]) {
  return symbols.map((symbol, i) => {
    const token = DEMO_TOKENS.find((t) => t.symbol === symbol)!
    return { token, weightPercent: weights[i] }
  })
}

const SPORT_FAN_COMING_SOON =
  'Coming soon — Sport & Fan Token routing is planned.'

/** Preview/template baskets — not routeable on Sepolia today */
export const SPORT_FAN_BASKETS: Basket[] = [
  {
    id: 'sport-football-fan-tokens',
    name: 'Football Fan Tokens',
    description:
      'Weighted exposure to major football club fan tokens. Template only — fan token routing is not live yet.',
    tag: 'SportFi',
    category: 'sport-fan',
    tags: ['SportFi', 'Fan Tokens', 'Football'],
    templateOnly: true,
    chain: 'ethereum',
    chainLabel: 'Chiliz Chain (planned)',
    chainStatus: 'planned',
    allocations: alloc(['ETH', 'USDC', 'LINK'], [40, 30, 30]),
    totalValueUsd: 2500,
  },
  {
    id: 'sport-motorsport-basket',
    name: 'Formula 1 / Motorsport Basket',
    description:
      'Motorsport and racing fan token themes. Preview weights only until SportFi routing ships.',
    tag: 'Motorsport',
    category: 'sport-fan',
    tags: ['SportFi', 'Motorsport', 'Fan Tokens'],
    templateOnly: true,
    chain: 'ethereum',
    chainLabel: 'Multi-chain (planned)',
    chainStatus: 'planned',
    allocations: alloc(['ETH', 'USDC', 'UNI'], [35, 35, 30]),
    totalValueUsd: 3000,
  },
  {
    id: 'sport-esports-gaming',
    name: 'Esports & Gaming Fans',
    description:
      'Esports org and gaming community token basket template. No live execution on testnet.',
    tag: 'Esports',
    category: 'sport-fan',
    tags: ['Esports', 'Gaming', 'Fan Tokens'],
    templateOnly: true,
    chain: 'base',
    chainLabel: 'Base (planned)',
    chainStatus: 'planned',
    allocations: alloc(['ETH', 'LINK', 'UNI'], [40, 30, 30]),
    totalValueUsd: 2000,
  },
  {
    id: 'sport-club-treasury',
    name: 'Sports Club Treasury Basket',
    description:
      'Institutional-style sports club treasury allocation template. Routing planned for a future release.',
    tag: 'SportFi',
    category: 'sport-fan',
    tags: ['SportFi', 'Football', 'Institutional'],
    templateOnly: true,
    chain: 'ethereum',
    chainLabel: 'Ethereum (planned)',
    chainStatus: 'planned',
    allocations: alloc(['USDC', 'ETH', 'LINK'], [50, 30, 20]),
    totalValueUsd: 5000,
  },
  {
    id: 'sport-chiliz-fan-tokens',
    name: 'Chiliz / Fan Token Basket',
    description:
      'Chiliz ecosystem fan token basket template. Fan token swaps are not routeable on Sepolia yet.',
    tag: 'Fan Tokens',
    category: 'sport-fan',
    tags: ['Fan Tokens', 'SportFi', 'Chiliz'],
    templateOnly: true,
    chain: 'bsc',
    chainLabel: 'BSC / Chiliz (planned)',
    chainStatus: 'planned',
    allocations: alloc(['ETH', 'USDC', 'AAVE'], [30, 40, 30]),
    totalValueUsd: 3500,
  },
]

export const SPORT_FAN_ROUTING_MESSAGE = SPORT_FAN_COMING_SOON

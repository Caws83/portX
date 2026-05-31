export type PortfolioSourceType =
  | 'public_wallet'
  | 'company_holdings'
  | 'demo_strategy'
  | 'whale_watch'

export type RiskLevel = 'low' | 'medium' | 'high' | 'degen'

export interface NotablePortfolio {
  id: string
  name: string
  category: string
  description: string
  sourceType: PortfolioSourceType
  estimatedValueUsd: number
  change24h: number
  riskLevel: RiskLevel
  tokens: { symbol: string; name: string; allocationPercent: number; chain: string }[]
  tags: string[]
  isCopyable: boolean
  disclaimer: string
}

const demoDisclaimer =
  'Demo/model portfolio — not verified on-chain ownership. For discovery only.'

/**
 * DEMO DATA — future: Arkham / Nansen / DeBank, company treasury filings
 */
export const NOTABLE_PORTFOLIOS: NotablePortfolio[] = [
  {
    id: 'microstrategy-btc',
    name: 'MicroStrategy Bitcoin Holdings',
    category: 'Corporate Treasury',
    description: 'Demo model of BTC-heavy corporate treasury allocation.',
    sourceType: 'company_holdings',
    estimatedValueUsd: 45_000_000_000,
    change24h: 1.8,
    riskLevel: 'medium',
    tokens: [{ symbol: 'BTC', name: 'Bitcoin', allocationPercent: 100, chain: 'Bitcoin' }],
    tags: ['Corporate', 'BTC'],
    isCopyable: true,
    disclaimer: demoDisclaimer,
  },
  {
    id: 'tesla-btc',
    name: 'Tesla Bitcoin Holdings',
    category: 'Corporate Treasury',
    description: 'Demo single-asset corporate BTC exposure model.',
    sourceType: 'company_holdings',
    estimatedValueUsd: 1_200_000_000,
    change24h: 1.6,
    riskLevel: 'medium',
    tokens: [{ symbol: 'BTC', name: 'Bitcoin', allocationPercent: 100, chain: 'Bitcoin' }],
    tags: ['Corporate', 'BTC'],
    isCopyable: true,
    disclaimer: demoDisclaimer,
  },
  {
    id: 'blackrock-crypto',
    name: 'BlackRock Crypto Exposure',
    category: 'Institutional',
    description: 'Demo balanced BTC/ETH institutional model.',
    sourceType: 'demo_strategy',
    estimatedValueUsd: 8_500_000_000,
    change24h: 1.2,
    riskLevel: 'low',
    tokens: [
      { symbol: 'BTC', name: 'Bitcoin', allocationPercent: 70, chain: 'Bitcoin' },
      { symbol: 'ETH', name: 'Ethereum', allocationPercent: 30, chain: 'Ethereum' },
    ],
    tags: ['Institutional'],
    isCopyable: true,
    disclaimer: demoDisclaimer,
  },
  {
    id: 'trump-wallet-watchlist',
    name: 'Trump Wallet Watchlist',
    category: 'Public Figure (Demo)',
    description: 'Demo watchlist — not a verified wallet.',
    sourceType: 'demo_strategy',
    estimatedValueUsd: 42_000_000,
    change24h: 4.5,
    riskLevel: 'high',
    tokens: [
      { symbol: 'ETH', name: 'Ethereum', allocationPercent: 40, chain: 'Ethereum' },
      { symbol: 'WBTC', name: 'Wrapped Bitcoin', allocationPercent: 25, chain: 'Ethereum' },
      { symbol: 'LINK', name: 'Chainlink', allocationPercent: 15, chain: 'Ethereum' },
      { symbol: 'UNI', name: 'Uniswap', allocationPercent: 10, chain: 'Ethereum' },
      { symbol: 'AAVE', name: 'Aave', allocationPercent: 10, chain: 'Ethereum' },
    ],
    tags: ['Demo'],
    isCopyable: true,
    disclaimer: 'Demo watchlist — ownership not verified.',
  },
  {
    id: 'elon-meme-basket',
    name: 'Elon Meme Basket',
    category: 'Public Figure (Demo)',
    description: 'Demo meme-heavy strategy — not linked to any verified wallet.',
    sourceType: 'demo_strategy',
    estimatedValueUsd: 28_000_000,
    change24h: 9.2,
    riskLevel: 'degen',
    tokens: [
      { symbol: 'DOGE', name: 'Dogecoin', allocationPercent: 50, chain: 'Multi' },
      { symbol: 'BTC', name: 'Bitcoin', allocationPercent: 25, chain: 'Bitcoin' },
      { symbol: 'ETH', name: 'Ethereum', allocationPercent: 25, chain: 'Ethereum' },
    ],
    tags: ['Demo', 'Meme'],
    isCopyable: true,
    disclaimer: 'Demo strategy — not verified as owned by any public figure.',
  },
  {
    id: 'top-defi-whale',
    name: 'Top DeFi Whale',
    category: 'Whale Watch',
    description: 'Demo DeFi-heavy whale allocation.',
    sourceType: 'whale_watch',
    estimatedValueUsd: 156_000_000,
    change24h: 2.8,
    riskLevel: 'medium',
    tokens: [
      { symbol: 'ETH', name: 'Ethereum', allocationPercent: 35, chain: 'Ethereum' },
      { symbol: 'AAVE', name: 'Aave', allocationPercent: 20, chain: 'Ethereum' },
      { symbol: 'UNI', name: 'Uniswap', allocationPercent: 20, chain: 'Ethereum' },
      { symbol: 'LINK', name: 'Chainlink', allocationPercent: 15, chain: 'Ethereum' },
      { symbol: 'USDC', name: 'USD Coin', allocationPercent: 10, chain: 'Ethereum' },
    ],
    tags: ['Whale', 'DeFi'],
    isCopyable: true,
    disclaimer: demoDisclaimer,
  },
  {
    id: 'ai-token-whale',
    name: 'AI Token Whale',
    category: 'Whale Watch',
    description: 'Demo AI narrative whale portfolio.',
    sourceType: 'whale_watch',
    estimatedValueUsd: 89_000_000,
    change24h: 7.4,
    riskLevel: 'high',
    tokens: [
      { symbol: 'FET', name: 'Fetch.ai', allocationPercent: 30, chain: 'Ethereum' },
      { symbol: 'RNDR', name: 'Render', allocationPercent: 25, chain: 'Ethereum' },
      { symbol: 'TAO', name: 'Bittensor', allocationPercent: 25, chain: 'Multi' },
      { symbol: 'NEAR', name: 'NEAR Protocol', allocationPercent: 20, chain: 'NEAR' },
    ],
    tags: ['Whale', 'AI'],
    isCopyable: true,
    disclaimer: demoDisclaimer,
  },
]

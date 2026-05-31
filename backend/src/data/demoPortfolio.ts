import type { DemoPortfolio } from '../types/portfolio.js'
import { DEMO_TOKENS } from './tokens.js'
import { normalizeAddress } from '../utils/format.js'

const DEFAULT_PORTFOLIO: Omit<DemoPortfolio, 'walletAddress'> = {
  totalValueUsd: 8274,
  costBasisUsd: 7200,
  change24hPercent: 14.9,
  heldTokens: [
    { token: DEMO_TOKENS[1], balance: 1.2, valueUsd: 4140 },
    { token: DEMO_TOKENS[4], balance: 15, valueUsd: 2670 },
    { token: DEMO_TOKENS[6], balance: 120, valueUsd: 1464 },
  ],
  activeBasketIds: ['top-5-crypto'],
}

/** In-memory demo portfolios keyed by wallet (no database v1) */
const portfolioCache = new Map<string, DemoPortfolio>()

export function getDemoPortfolio(walletAddress: string): DemoPortfolio {
  const key = normalizeAddress(walletAddress)
  if (!portfolioCache.has(key)) {
    portfolioCache.set(key, {
      walletAddress: key,
      ...DEFAULT_PORTFOLIO,
    })
  }
  return portfolioCache.get(key)!
}

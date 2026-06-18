import type { HeldToken } from '@/types/portfolio'
import type { TokenAllocation } from '@/types/token'

export type DriftStatusLevel =
  | 'in_sync'
  | 'minor_drift'
  | 'rebalance_recommended'
  | 'out_of_sync'

export const DRIFT_STATUS_LABELS: Record<DriftStatusLevel, string> = {
  in_sync: 'In Sync',
  minor_drift: 'Minor Drift',
  rebalance_recommended: 'Rebalance Recommended',
  out_of_sync: 'Out of Sync',
}

/** Minimum |difference| % to count an asset as drift-affected. */
const AFFECTED_ASSET_THRESHOLD = 1

export interface PortfolioDriftLeg {
  symbol: string
  targetPercent: number
  currentPercent: number
  /** Signed: current − target */
  differencePercent: number
  absDifferencePercent: number
}

export interface PortfolioDriftResult {
  legs: PortfolioDriftLeg[]
  totalDriftScore: number
  status: DriftStatusLevel
  statusLabel: string
  affectedAssetCount: number
}

/**
 * Total drift = half the sum of absolute allocation gaps (L1 distance / 2).
 * 0% = perfect match; 100% = fully diverged weights.
 */
export function computeTotalDriftScore(legs: PortfolioDriftLeg[]): number {
  if (legs.length === 0) return 0
  const sumAbsDiff = legs.reduce((sum, leg) => sum + leg.absDifferencePercent, 0)
  return roundPercent(sumAbsDiff / 2)
}

export function getDriftStatus(totalDriftScore: number): DriftStatusLevel {
  if (totalDriftScore < 5) return 'in_sync'
  if (totalDriftScore < 15) return 'minor_drift'
  if (totalDriftScore < 30) return 'rebalance_recommended'
  return 'out_of_sync'
}

export function getDriftStatusLabel(status: DriftStatusLevel): string {
  return DRIFT_STATUS_LABELS[status]
}

/**
 * Compare target basket weights to current wallet allocation among basket tokens.
 * Current % is normalized across basket symbols present in holdings only.
 */
export function computePortfolioDrift(
  targetAllocations: TokenAllocation[],
  heldTokens: HeldToken[]
): PortfolioDriftResult {
  const valueBySymbol = new Map<string, number>()
  for (const holding of heldTokens) {
    valueBySymbol.set(holding.token.symbol, holding.valueUsd)
  }

  const basketValues = targetAllocations.map(({ token, weightPercent }) => ({
    symbol: token.symbol,
    targetPercent: weightPercent,
    valueUsd: valueBySymbol.get(token.symbol) ?? 0,
  }))

  const totalBasketValueUsd = basketValues.reduce((sum, row) => sum + row.valueUsd, 0)

  const legs: PortfolioDriftLeg[] = basketValues.map(({ symbol, targetPercent, valueUsd }) => {
    const currentPercent =
      totalBasketValueUsd > 0 ? roundPercent((valueUsd / totalBasketValueUsd) * 100) : 0
    const differencePercent = roundPercent(currentPercent - targetPercent)
    return {
      symbol,
      targetPercent,
      currentPercent,
      differencePercent,
      absDifferencePercent: Math.abs(differencePercent),
    }
  })

  const totalDriftScore = computeTotalDriftScore(legs)
  const status = getDriftStatus(totalDriftScore)

  return {
    legs,
    totalDriftScore,
    status,
    statusLabel: getDriftStatusLabel(status),
    affectedAssetCount: legs.filter(
      (leg) => leg.absDifferencePercent >= AFFECTED_ASSET_THRESHOLD
    ).length,
  }
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10
}

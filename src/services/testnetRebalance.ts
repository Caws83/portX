import type { Basket } from '@/types/basket'
import type { TokenAllocation } from '@/types/token'
import {
  isTestnetMultiTokenBasket,
  isTestnetMultiTokenBasketAllocations,
  TESTNET_MULTI_TOKEN_BASKET,
  TESTNET_MULTI_TOKEN_BASKET_ID,
} from '@/data/testnetMultiTokenBasket'
import type { TestnetValuedPortfolioAsset } from '@/services/testnetPortfolioPricing'
import type { TestnetPortfolioPosition } from '@/services/testnetPortfolio'

export const TESTNET_REBALANCE_PREVIEW_NOTE =
  'Preview only — no transactions will be executed.' as const

export const TESTNET_REBALANCE_BALANCE_THRESHOLD_PERCENT = 0.5

export const TESTNET_DEFAULT_REBALANCE_TARGETS: Record<string, number> = {
  USDC: 50,
  WETH: 50,
}

export type TestnetRebalanceSymbol = string

export type TestnetRebalanceAction = 'increase' | 'decrease' | 'balanced'

export interface TestnetRebalanceLeg {
  symbol: TestnetRebalanceSymbol
  currentPercent: number
  targetPercent: number
  differencePercent: number
  action: TestnetRebalanceAction
  actionLabel: string
}

export interface TestnetRebalancePreviewResult {
  targetBasketName: string
  targetBasketId: string | null
  usesDefaultTarget: boolean
  legs: TestnetRebalanceLeg[]
  assetsToIncrease: TestnetRebalanceSymbol[]
  assetsToDecrease: TestnetRebalanceSymbol[]
  largestAdjustment: {
    symbol: TestnetRebalanceSymbol
    differencePercent: number
    actionLabel: string
  } | null
}

const STABLECOIN_SYMBOLS = new Set(['USDC', 'USDT', 'DAI'])
const WETH_BUCKET_SYMBOLS = new Set(['ETH', 'WETH'])

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100
}

function formatPercent(value: number): string {
  return `${roundPercent(value)}%`
}

export function isMultiTokenRebalanceBasket(basket: Basket): boolean {
  return (
    isTestnetMultiTokenBasket(basket.id) ||
    isTestnetMultiTokenBasketAllocations(basket.allocations)
  )
}

function mapTokenSymbolToStableBucket(symbol: string): 'USDC' | 'WETH' | null {
  const normalized = symbol.toUpperCase()
  if (normalized === 'USDC' || STABLECOIN_SYMBOLS.has(normalized)) return 'USDC'
  if (WETH_BUCKET_SYMBOLS.has(normalized)) return 'WETH'
  return null
}

/** Per-token target weights from basket allocations (multi-token) or USDC/WETH buckets (legacy) */
export function mapBasketAllocationsToRebalanceTargets(
  allocations: TokenAllocation[],
  basket?: Basket | null,
): Record<string, number> {
  if (basket && isMultiTokenRebalanceBasket(basket)) {
    const targets: Record<string, number> = {}
    for (const allocation of allocations) {
      const symbol = allocation.token.symbol.toUpperCase()
      targets[symbol] = (targets[symbol] ?? 0) + allocation.weightPercent
    }
    return normalizeTargetPercents(targets)
  }

  const bucketTargets: Record<string, number> = { USDC: 0, WETH: 0 }
  for (const allocation of allocations) {
    const bucket = mapTokenSymbolToStableBucket(allocation.token.symbol)
    if (!bucket) continue
    bucketTargets[bucket] += allocation.weightPercent
  }

  const total = bucketTargets.USDC + bucketTargets.WETH
  if (total <= 0) {
    return { ...TESTNET_DEFAULT_REBALANCE_TARGETS }
  }

  if (Math.abs(total - 100) > 0.01) {
    bucketTargets.USDC = roundPercent((bucketTargets.USDC / total) * 100)
    bucketTargets.WETH = roundPercent(100 - bucketTargets.USDC)
  }

  return bucketTargets
}

/** @deprecated alias — prefer mapBasketAllocationsToRebalanceTargets */
export function mapBasketAllocationsToTestnetTargets(
  allocations: TokenAllocation[],
): Record<string, number> {
  return mapBasketAllocationsToRebalanceTargets(allocations)
}

function normalizeTargetPercents(targets: Record<string, number>): Record<string, number> {
  const total = Object.values(targets).reduce((sum, weight) => sum + weight, 0)
  if (total <= 0) return targets
  if (Math.abs(total - 100) <= 0.01) return targets

  const normalized: Record<string, number> = {}
  const symbols = Object.keys(targets)
  let allocated = 0
  for (let index = 0; index < symbols.length; index++) {
    const symbol = symbols[index]
    if (index === symbols.length - 1) {
      normalized[symbol] = roundPercent(100 - allocated)
      continue
    }
    const share = roundPercent((targets[symbol] / total) * 100)
    normalized[symbol] = share
    allocated += share
  }
  return normalized
}

function getRebalanceLegSymbols(basket: Basket): string[] {
  if (isMultiTokenRebalanceBasket(basket)) {
    return basket.allocations.map((allocation) => allocation.token.symbol.toUpperCase())
  }
  return ['USDC', 'WETH']
}

function getRebalanceAction(differencePercent: number): {
  action: TestnetRebalanceAction
  actionLabel: string
} {
  const rounded = roundPercent(differencePercent)

  if (Math.abs(rounded) < TESTNET_REBALANCE_BALANCE_THRESHOLD_PERCENT) {
    return { action: 'balanced', actionLabel: 'Already Balanced' }
  }

  if (rounded > 0) {
    return { action: 'increase', actionLabel: `Increase ${formatPercent(rounded)}` }
  }

  return { action: 'decrease', actionLabel: `Decrease ${formatPercent(Math.abs(rounded))}` }
}

function getCurrentAllocationPercents(
  valuedAssets: TestnetValuedPortfolioAsset[],
  legSymbols: string[],
): Record<string, number> {
  const symbolSet = new Set(legSymbols.map((symbol) => symbol.toUpperCase()))
  let totalValue = 0

  for (const asset of valuedAssets) {
    if (symbolSet.has(asset.symbol.toUpperCase())) {
      totalValue += asset.estimatedValueUsd
    }
  }

  const totals: Record<string, number> = {}
  for (const symbol of legSymbols) {
    if (totalValue <= 0) {
      totals[symbol] = 0
      continue
    }
    const asset = valuedAssets.find((entry) => entry.symbol.toUpperCase() === symbol.toUpperCase())
    totals[symbol] = roundPercent(((asset?.estimatedValueUsd ?? 0) / totalValue) * 100)
  }

  return totals
}

function resolveRebalanceTargetBasketFromHistory(
  latestPosition: TestnetPortfolioPosition,
  baskets: Basket[],
): Basket | null {
  const portfolioPrefixMatch = latestPosition.portfolioId.match(/^(.+)-0x[a-fA-F0-9]{10}$/)
  const portfolioKey = portfolioPrefixMatch?.[1]

  if (portfolioKey) {
    const byId = baskets.find((basket) => basket.id === portfolioKey)
    if (byId) return byId
  }

  return baskets.find((basket) => basket.name === latestPosition.basketLabel) ?? null
}

export function resolveRebalanceTargetBasket(
  latestPosition: TestnetPortfolioPosition | null,
  baskets: Basket[],
): Basket | null {
  if (!latestPosition) return null
  return resolveRebalanceTargetBasketFromHistory(latestPosition, baskets)
}

/** Default Sepolia Multi-Token Beta; falls back to history match when available */
export function resolveTestnetRebalanceTargetBasket(
  latestPosition: TestnetPortfolioPosition | null,
  baskets: Basket[],
): Basket {
  const defaultBasket =
    baskets.find((basket) => basket.id === TESTNET_MULTI_TOKEN_BASKET_ID) ??
    TESTNET_MULTI_TOKEN_BASKET

  if (!latestPosition) return defaultBasket

  return resolveRebalanceTargetBasketFromHistory(latestPosition, baskets) ?? defaultBasket
}

export function computeTestnetRebalancePreview(params: {
  valuedAssets: TestnetValuedPortfolioAsset[]
  targetBasket?: Basket | null
}): TestnetRebalancePreviewResult {
  const explicitTarget = params.targetBasket ?? null
  const targetBasket = explicitTarget ?? TESTNET_MULTI_TOKEN_BASKET

  const legSymbols = getRebalanceLegSymbols(targetBasket)
  const targetPercents = mapBasketAllocationsToRebalanceTargets(
    targetBasket.allocations,
    targetBasket,
  )
  const currentPercents = getCurrentAllocationPercents(params.valuedAssets, legSymbols)

  const legs: TestnetRebalanceLeg[] = legSymbols.map((symbol) => {
    const currentPercent = currentPercents[symbol] ?? 0
    const targetPercent = targetPercents[symbol] ?? 0
    const differencePercent = roundPercent(targetPercent - currentPercent)
    const { action, actionLabel } = getRebalanceAction(differencePercent)

    return {
      symbol,
      currentPercent,
      targetPercent,
      differencePercent,
      action,
      actionLabel,
    }
  })

  const assetsToIncrease = legs
    .filter((leg) => leg.action === 'increase')
    .map((leg) => leg.symbol)
  const assetsToDecrease = legs
    .filter((leg) => leg.action === 'decrease')
    .map((leg) => leg.symbol)

  const largestAdjustment = legs.reduce<TestnetRebalancePreviewResult['largestAdjustment']>(
    (current, leg) => {
      const magnitude = Math.abs(leg.differencePercent)
      if (leg.action === 'balanced') return current
      if (!current || magnitude > Math.abs(current.differencePercent)) {
        return {
          symbol: leg.symbol,
          differencePercent: leg.differencePercent,
          actionLabel: leg.actionLabel,
        }
      }
      return current
    },
    null,
  )

  return {
    targetBasketName: targetBasket.name,
    targetBasketId: targetBasket.id,
    usesDefaultTarget: explicitTarget === null,
    legs,
    assetsToIncrease,
    assetsToDecrease,
    largestAdjustment,
  }
}

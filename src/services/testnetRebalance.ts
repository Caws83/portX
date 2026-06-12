import type { Basket } from '@/types/basket'
import type { TokenAllocation } from '@/types/token'
import type { TestnetValuedPortfolioAsset } from '@/services/testnetPortfolioPricing'
import type { TestnetPortfolioPosition } from '@/services/testnetPortfolio'

export const TESTNET_REBALANCE_PREVIEW_NOTE =
  'Preview only — no transactions will be executed.' as const

export const TESTNET_REBALANCE_BALANCE_THRESHOLD_PERCENT = 0.5

export const TESTNET_DEFAULT_REBALANCE_TARGETS: Record<TestnetRebalanceSymbol, number> = {
  USDC: 50,
  WETH: 50,
}

export type TestnetRebalanceSymbol = 'USDC' | 'WETH'

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

const TESTNET_REBALANCE_SYMBOLS: TestnetRebalanceSymbol[] = ['USDC', 'WETH']

const STABLECOIN_SYMBOLS = new Set(['USDC', 'USDT', 'DAI'])
const WETH_BUCKET_SYMBOLS = new Set(['ETH', 'WETH'])

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100
}

function formatPercent(value: number): string {
  return `${roundPercent(value)}%`
}

function mapTokenSymbolToRebalanceBucket(symbol: string): TestnetRebalanceSymbol | null {
  if (symbol === 'USDC' || STABLECOIN_SYMBOLS.has(symbol)) return 'USDC'
  if (WETH_BUCKET_SYMBOLS.has(symbol)) return 'WETH'
  return null
}

export function mapBasketAllocationsToTestnetTargets(
  allocations: TokenAllocation[],
): Record<TestnetRebalanceSymbol, number> {
  const targets: Record<TestnetRebalanceSymbol, number> = { USDC: 0, WETH: 0 }

  for (const allocation of allocations) {
    const bucket = mapTokenSymbolToRebalanceBucket(allocation.token.symbol)
    if (!bucket) continue
    targets[bucket] += allocation.weightPercent
  }

  const total = targets.USDC + targets.WETH
  if (total <= 0) {
    return { ...TESTNET_DEFAULT_REBALANCE_TARGETS }
  }

  if (Math.abs(total - 100) > 0.01) {
    targets.USDC = roundPercent((targets.USDC / total) * 100)
    targets.WETH = roundPercent(100 - targets.USDC)
  }

  return targets
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
): Record<TestnetRebalanceSymbol, number> {
  const totals: Record<TestnetRebalanceSymbol, number> = { USDC: 0, WETH: 0 }
  const totalValue = valuedAssets.reduce((sum, asset) => sum + asset.estimatedValueUsd, 0)

  if (totalValue <= 0) {
    return totals
  }

  for (const asset of valuedAssets) {
    if (asset.symbol === 'USDC' || asset.symbol === 'WETH') {
      totals[asset.symbol] = roundPercent((asset.estimatedValueUsd / totalValue) * 100)
    }
  }

  return totals
}

export function resolveRebalanceTargetBasket(
  latestPosition: TestnetPortfolioPosition | null,
  baskets: Basket[],
): Basket | null {
  if (!latestPosition) return null

  const portfolioPrefixMatch = latestPosition.portfolioId.match(/^(.+)-0x[a-fA-F0-9]{10}$/)
  const portfolioKey = portfolioPrefixMatch?.[1]

  if (portfolioKey) {
    const byId = baskets.find((basket) => basket.id === portfolioKey)
    if (byId) return byId
  }

  return baskets.find((basket) => basket.name === latestPosition.basketLabel) ?? null
}

export function computeTestnetRebalancePreview(params: {
  valuedAssets: TestnetValuedPortfolioAsset[]
  targetBasket?: Basket | null
}): TestnetRebalancePreviewResult {
  const targetBasket = params.targetBasket ?? null
  const targetPercents = targetBasket
    ? mapBasketAllocationsToTestnetTargets(targetBasket.allocations)
    : TESTNET_DEFAULT_REBALANCE_TARGETS

  const currentPercents = getCurrentAllocationPercents(params.valuedAssets)

  const legs: TestnetRebalanceLeg[] = TESTNET_REBALANCE_SYMBOLS.map((symbol) => {
    const currentPercent = currentPercents[symbol]
    const targetPercent = targetPercents[symbol]
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
    targetBasketName: targetBasket?.name ?? 'Default testnet target (50/50 USDC/WETH)',
    targetBasketId: targetBasket?.id ?? null,
    usesDefaultTarget: !targetBasket,
    legs,
    assetsToIncrease,
    assetsToDecrease,
    largestAdjustment,
  }
}

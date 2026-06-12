import { formatUsd } from '@/utils/format'

/** Fixed testnet placeholder prices — no external APIs */
export const TESTNET_USDC_PRICE_USD = 1
export const TESTNET_WETH_PRICE_USD = 2500

export const TESTNET_PORTFOLIO_PRICING_LABEL = 'Estimated Testnet Value' as const

export type TestnetPricedSymbol = 'USDC' | 'WETH'

const TESTNET_TOKEN_PRICES_USD: Record<TestnetPricedSymbol, number> = {
  USDC: TESTNET_USDC_PRICE_USD,
  WETH: TESTNET_WETH_PRICE_USD,
}

export interface TestnetPortfolioAssetPricingInput {
  symbol: string
  balanceNumeric: number
  balanceDisplay: string
  tokenAddress: string
  decimals: number
  source: string
}

export interface TestnetValuedPortfolioAsset extends TestnetPortfolioAssetPricingInput {
  estimatedPriceUsd: number
  estimatedPriceDisplay: string
  estimatedValueUsd: number
  estimatedValueDisplay: string
}

export interface TestnetPortfolioValuation {
  label: typeof TESTNET_PORTFOLIO_PRICING_LABEL
  totalEstimatedValueUsd: number
  totalEstimatedValueDisplay: string
  largestAssetSymbol: string | null
  largestAssetValueUsd: number
  largestAssetValueDisplay: string | null
  assetCount: number
  valuedAssets: TestnetValuedPortfolioAsset[]
}

function isPricedSymbol(symbol: string): symbol is TestnetPricedSymbol {
  return symbol === 'USDC' || symbol === 'WETH'
}

export function getTestnetTokenPriceUsd(symbol: string): number {
  if (!isPricedSymbol(symbol)) return 0
  return TESTNET_TOKEN_PRICES_USD[symbol]
}

export function formatTestnetEstimatedPrice(usd: number): string {
  if (usd >= 100) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(usd)
  }

  return formatUsd(usd)
}

export function estimateTestnetAssetValueUsd(balance: number, symbol: string): number {
  return balance * getTestnetTokenPriceUsd(symbol)
}

export function valueTestnetPortfolioAsset(
  asset: TestnetPortfolioAssetPricingInput,
): TestnetValuedPortfolioAsset {
  const estimatedPriceUsd = getTestnetTokenPriceUsd(asset.symbol)
  const estimatedValueUsd = estimateTestnetAssetValueUsd(asset.balanceNumeric, asset.symbol)

  return {
    ...asset,
    estimatedPriceUsd,
    estimatedPriceDisplay: formatTestnetEstimatedPrice(estimatedPriceUsd),
    estimatedValueUsd,
    estimatedValueDisplay: formatUsd(estimatedValueUsd),
  }
}

export function computeTestnetPortfolioValuation(
  assets: TestnetPortfolioAssetPricingInput[],
): TestnetPortfolioValuation {
  const valuedAssets = assets.map(valueTestnetPortfolioAsset)
  const totalEstimatedValueUsd = valuedAssets.reduce(
    (sum, asset) => sum + asset.estimatedValueUsd,
    0,
  )

  const largest = valuedAssets.reduce<TestnetValuedPortfolioAsset | null>((current, asset) => {
    if (!current || asset.estimatedValueUsd > current.estimatedValueUsd) {
      return asset
    }
    return current
  }, null)

  return {
    label: TESTNET_PORTFOLIO_PRICING_LABEL,
    totalEstimatedValueUsd,
    totalEstimatedValueDisplay: formatUsd(totalEstimatedValueUsd),
    largestAssetSymbol: largest?.symbol ?? null,
    largestAssetValueUsd: largest?.estimatedValueUsd ?? 0,
    largestAssetValueDisplay: largest ? largest.estimatedValueDisplay : null,
    assetCount: valuedAssets.length,
    valuedAssets,
  }
}

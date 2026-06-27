import { TESTNET_BASKET_TOKENS } from '@/config/testnetBasketTokens'
import { formatUsd } from '@/utils/format'

/** Fixed testnet placeholder prices — no external APIs */
export const TESTNET_USDC_PRICE_USD = TESTNET_BASKET_TOKENS.USDC.priceUsd
export const TESTNET_WETH_PRICE_USD = TESTNET_BASKET_TOKENS.WETH.priceUsd

export const TESTNET_PORTFOLIO_PRICING_LABEL = 'Estimated Testnet Value' as const

const TESTNET_TOKEN_PRICES_USD: Record<string, number> = Object.fromEntries(
  Object.values(TESTNET_BASKET_TOKENS).map((token) => [token.symbol.toUpperCase(), token.priceUsd]),
)

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

export function getTestnetTokenPriceUsd(symbol: string): number {
  const normalized = symbol.toUpperCase()
  if (normalized === 'ETH') {
    return TESTNET_BASKET_TOKENS.WETH.priceUsd
  }
  return TESTNET_TOKEN_PRICES_USD[normalized] ?? 0
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
  const nonZeroAssets = valuedAssets.filter((asset) => asset.balanceNumeric > 0)

  const totalEstimatedValueUsd = valuedAssets.reduce(
    (sum, asset) => sum + asset.estimatedValueUsd,
    0,
  )

  const largest = nonZeroAssets.reduce<TestnetValuedPortfolioAsset | null>((current, asset) => {
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
    assetCount: nonZeroAssets.length,
    valuedAssets,
  }
}

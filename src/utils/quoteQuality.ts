import type { ExecutionPlan } from '@/types/execution'
import type { BasketQuotePreview, LegQuote } from '@/types/quote'

export type QuoteSourceKind = 'api' | 'fallback' | 'testnet' | null

export type QuoteQualityKind =
  | 'live_0x'
  | 'partial_live'
  | 'api_demo'
  | 'local_fallback'
  | 'testnet'

export interface UnsupportedLegInfo {
  symbol: string
  inputAmountUsd: number
  warnings: string[]
}

export interface QuoteQualityAssessment {
  kind: QuoteQualityKind
  badgeLabel: string
  badgeVariant: 'live-quote' | 'fallback-quote' | 'demo' | 'unsupported'
  unsupportedLegs: UnsupportedLegInfo[]
  unsupportedLegCount: number
  liveLegCount: number
  excludedProceedsUsd: number
  proceedsExcludeUnsupported: boolean
  qualityWarnings: string[]
  bannerMessage: string
}

function isMissingRouteData(calldata: string, routerAddress: string): boolean {
  const noCalldata =
    !calldata || calldata === '0x0' || calldata === '0x' || calldata.length <= 2
  const noRouter =
    !routerAddress ||
    routerAddress === '0x0' ||
    routerAddress === '0x0000000000000000000000000000000000000000'
  return noCalldata && noRouter
}

function isZeroOutput(outputAmount: string, outputAmountUsd: number): boolean {
  if (outputAmountUsd <= 0) return true
  const parsed = parseFloat(outputAmount)
  return Number.isFinite(parsed) && parsed <= 0
}

/** Detect legs that cannot be routed on Ethereum mainnet. */
export function isLegUnsupported(leg: LegQuote): boolean {
  const q = leg.bestQuote
  if (q.provider === 'unsupported') return true
  if (isZeroOutput(q.outputAmount, q.outputAmountUsd)) {
    return isMissingRouteData(q.calldata, q.routerAddress)
  }
  return false
}

function unsupportedLegInfo(leg: LegQuote): UnsupportedLegInfo {
  const symbol = leg.allocation.token.symbol
  const warnings = leg.bestQuote.warnings ?? []
  return {
    symbol,
    inputAmountUsd: leg.allocation.inputAmountUsd,
    warnings,
  }
}

function unsupportedLegWarning(symbol: string): string {
  return `${symbol} cannot be routed on Ethereum. This leg is excluded from proceeds.`
}

export function assessQuoteQuality(
  preview: BasketQuotePreview,
  quoteSource: QuoteSourceKind
): QuoteQualityAssessment {
  const unsupportedLegs = preview.legs.filter(isLegUnsupported).map(unsupportedLegInfo)
  const unsupportedLegCount = unsupportedLegs.length
  const liveLegCount = preview.legs.filter((l) => l.bestQuote.provider === '0x').length
  const excludedProceedsUsd = unsupportedLegs.reduce((sum, l) => sum + l.inputAmountUsd, 0)
  const isSell = preview.type === 'sell_basket' || preview.type === 'sell_all'
  const proceedsExcludeUnsupported = isSell && unsupportedLegCount > 0

  const qualityWarnings: string[] = []
  for (const leg of unsupportedLegs) {
    qualityWarnings.push(unsupportedLegWarning(leg.symbol))
  }

  if (proceedsExcludeUnsupported) {
    qualityWarnings.push(
      `Estimated proceeds reflect ${liveLegCount} routable leg(s) only — unsupported legs are excluded.`
    )
  }

  if (quoteSource === 'testnet') {
    return {
      kind: 'testnet',
      badgeLabel: 'Sepolia testnet quote',
      badgeVariant: 'fallback-quote',
      unsupportedLegs,
      unsupportedLegCount,
      liveLegCount,
      excludedProceedsUsd,
      proceedsExcludeUnsupported,
      qualityWarnings,
      bannerMessage: 'Sepolia testnet quote — not PortX mainnet API.',
    }
  }

  if (quoteSource === 'fallback') {
    return {
      kind: 'local_fallback',
      badgeLabel: 'Local fallback quote',
      badgeVariant: 'fallback-quote',
      unsupportedLegs,
      unsupportedLegCount,
      liveLegCount,
      excludedProceedsUsd,
      proceedsExcludeUnsupported,
      qualityWarnings,
      bannerMessage: 'Using local fallback quote — PortX API was unavailable.',
    }
  }

  if (quoteSource === 'api' && !preview.isDemo && liveLegCount > 0) {
    if (unsupportedLegCount > 0) {
      return {
        kind: 'partial_live',
        badgeLabel: 'Partial live quote',
        badgeVariant: 'unsupported',
        unsupportedLegs,
        unsupportedLegCount,
        liveLegCount,
        excludedProceedsUsd,
        proceedsExcludeUnsupported,
        qualityWarnings,
        bannerMessage: `Partial live 0x quote — ${unsupportedLegCount} leg(s) unsupported on Ethereum.`,
      }
    }

    return {
      kind: 'live_0x',
      badgeLabel: 'Live 0x quote',
      badgeVariant: 'live-quote',
      unsupportedLegs,
      unsupportedLegCount,
      liveLegCount,
      excludedProceedsUsd,
      proceedsExcludeUnsupported,
      qualityWarnings,
      bannerMessage: 'Live 0x quote loaded from PortX API.',
    }
  }

  if (quoteSource === 'api' && preview.isDemo) {
    return {
      kind: 'api_demo',
      badgeLabel: 'API demo quote',
      badgeVariant: 'demo',
      unsupportedLegs,
      unsupportedLegCount,
      liveLegCount,
      excludedProceedsUsd,
      proceedsExcludeUnsupported,
      qualityWarnings,
      bannerMessage: 'API demo quote — 0x not used for all legs.',
    }
  }

  return {
    kind: preview.isDemo ? 'api_demo' : 'local_fallback',
    badgeLabel: preview.isDemo ? 'API demo quote' : 'Local fallback quote',
    badgeVariant: preview.isDemo ? 'demo' : 'fallback-quote',
    unsupportedLegs,
    unsupportedLegCount,
    liveLegCount,
    excludedProceedsUsd,
    proceedsExcludeUnsupported,
    qualityWarnings,
    bannerMessage: preview.isDemo ? 'Demo quote preview.' : 'Local fallback quote.',
  }
}

export function assessQuoteQualityFromPlan(
  plan: ExecutionPlan,
  quoteSource: QuoteSourceKind
): QuoteQualityAssessment {
  const preview: BasketQuotePreview = {
    type: plan.type,
    basketId: plan.basketId,
    basketName: plan.basketName,
    totalInputUsd: plan.totalInputUsd,
    totalOutputUsd: plan.totalOutputUsd,
    totalGasUsd: plan.totalGasUsd,
    slippageBps: plan.slippageBps,
    chainId: plan.chainId,
    legs: plan.legs.map((leg) => ({
      allocation: {
        token: leg.quote.inputToken,
        weightPercent: 0,
        inputAmountUsd: leg.quote.inputAmountUsd,
        inputAmount: leg.quote.inputAmount,
      },
      bestQuote: leg.quote,
      allQuotes: [leg.quote],
    })),
    warnings: plan.warnings,
    isDemo: plan.isDemo,
    createdAt: Date.now(),
  }
  return assessQuoteQuality(preview, quoteSource)
}

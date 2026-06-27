import { useMemo } from 'react'
import { formatEther, formatUnits } from 'viem'
import type { BasketQuotePreview } from '@/types/quote'
import { BUTTON_LABELS } from '@/config/uiCopy'
import { TESTNET_DEFAULT_SWAP_AMOUNT_WEI, TESTNET_SEPOLIA_CHAIN_ID } from '@/config/testnetExecution'
import { SEPOLIA_PORTFOLIO_TRADE } from '@/config/testnetUxCopy'
import { useBundleExecutorFeeConfig } from '@/hooks/useBundleExecutorFeeConfig'
import { TestnetProtocolFeeSummary } from '@/components/TestnetProtocolFeeSummary'
import {
  estimateBuyProtocolFee,
  estimateSellProtocolFee,
  isFeeCollectionActive,
} from '@/services/protocolFee'
import { formatUsd } from '@/utils/format'
import { formatSlippage, isHighSlippage } from '@/utils/slippage'
import { buildLiveExecutionSummaryFromPreview } from '@/services/transactionBuilder'
import { isTestnetSepoliaUniswapPreview } from '@/utils/testnetPreview'
import { assessQuoteQuality } from '@/utils/quoteQuality'
import { AllocationBreakdown } from './AllocationBreakdown'
import { ExecutionWarning } from './ExecutionWarning'
import { RouteProviderBadge } from './RouteProviderBadge'
import { QuoteQualityBadge, QuoteQualityPanel } from './QuoteQualityPanel'

interface QuotePreviewCardProps {
  preview: BasketQuotePreview
  quoteSource?: 'api' | 'fallback' | 'testnet' | null
  onReview?: () => void
  reviewLabel?: string
  loading?: boolean
}

const TYPE_LABELS = {
  buy: 'Buy Basket Quote',
  sell_basket: 'Sell Basket Quote',
  sell_all: 'Sell All Portfolio Quote',
}

const TESTNET_TYPE_LABELS = {
  buy: `${SEPOLIA_PORTFOLIO_TRADE} — Buy`,
  sell_basket: `${SEPOLIA_PORTFOLIO_TRADE} — Sell`,
  sell_all: 'Sepolia Sell All Preview',
}

function formatTestnetSellTokenInputs(preview: BasketQuotePreview): string {
  return preview.legs
    .map((leg) => {
      const quote = leg.bestQuote
      if (quote.testnetDisplayRoute) {
        return `${quote.testnetDisplayRoute.inputAmountDisplay} ${quote.testnetDisplayRoute.inputSymbol}`
      }
      return `${formatUnits(BigInt(quote.inputAmount), quote.inputToken.decimals)} ${quote.inputToken.symbol}`
    })
    .join(' · ')
}

function formatTestnetSellUsdcOutput(preview: BasketQuotePreview): string {
  const totalUsdc = preview.legs.reduce(
    (sum, leg) => sum + BigInt(leg.bestQuote.outputAmount),
    0n,
  )
  const decimals = preview.legs[0]?.bestQuote.outputToken.decimals ?? 6
  const value = Number.parseFloat(formatUnits(totalUsdc, decimals))
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 6 })} USDC`
}

export function QuotePreviewCard({
  preview,
  quoteSource,
  onReview,
  reviewLabel = BUTTON_LABELS.reviewExecute,
  loading,
}: QuotePreviewCardProps) {
  const direction = preview.type === 'buy' ? 'buy' : 'sell'
  const highSlippage = isHighSlippage(preview.slippageBps)
  const execution = buildLiveExecutionSummaryFromPreview(preview)
  const quality = useMemo(
    () => assessQuoteQuality(preview, quoteSource ?? null),
    [preview, quoteSource]
  )
  const isTestnetPreview = isTestnetSepoliaUniswapPreview(preview)
  const isTestnetSell = isTestnetPreview && quoteSource === 'testnet' && preview.type === 'sell_basket'
  const feeConfigState = useBundleExecutorFeeConfig()
  const estimatedProtocolFee = useMemo(() => {
    if (!isTestnetPreview || !feeConfigState.config || !isFeeCollectionActive(feeConfigState.config)) {
      return null
    }
    if (isTestnetSell) {
      const totalUsdc = preview.legs.reduce(
        (sum, leg) => sum + BigInt(leg.bestQuote.outputAmount),
        0n,
      )
      const fee = estimateSellProtocolFee(totalUsdc, feeConfigState.config)
      if (fee <= 0n) return null
      const decimals = preview.legs[0]?.bestQuote.outputToken.decimals ?? 6
      return {
        amount: fee,
        symbol: 'USDC',
        decimals,
        isBuy: false,
        rateLabel: `${(feeConfigState.config.sellFeeBps / 100).toFixed(2)}%`,
      }
    }
    const fee = estimateBuyProtocolFee(TESTNET_DEFAULT_SWAP_AMOUNT_WEI, feeConfigState.config)
    if (fee <= 0n) return null
    return {
      amount: fee,
      symbol: 'ETH',
      decimals: 18,
      isBuy: true,
      rateLabel: `${(feeConfigState.config.buyFeeBps / 100).toFixed(2)}%`,
    }
  }, [isTestnetPreview, isTestnetSell, preview.legs, feeConfigState.config])
  const netUsdcAfterFee = useMemo(() => {
    if (!isTestnetSell || !estimatedProtocolFee || estimatedProtocolFee.isBuy) return undefined
    const totalUsdc = preview.legs.reduce(
      (sum, leg) => sum + BigInt(leg.bestQuote.outputAmount),
      0n,
    )
    return totalUsdc - estimatedProtocolFee.amount
  }, [isTestnetSell, estimatedProtocolFee, preview.legs])
  const isSell = preview.type === 'sell_basket' || preview.type === 'sell_all'
  const showLivePrep =
    quality.kind === 'live_0x' &&
    execution.hasZeroExRoute &&
    !isTestnetPreview
  const statusTone =
    execution.status === 'ready_for_wallet'
      ? 'border-portx-green/40 bg-portx-green/10 text-portx-green'
      : 'border-portx-warning/40 bg-portx-warning/10 text-portx-warning'

  const soldAssetSymbols =
    preview.type !== 'buy'
      ? preview.legs.map((l) => l.allocation.token.symbol).join(', ')
      : null

  const testnetSellRoutes = isTestnetSell
    ? preview.legs.map((leg) => `${leg.bestQuote.inputToken.symbol} → USDC`).join(' · ')
    : null

  return (
    <div className="card-glow space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold">
            {isTestnetPreview ? TESTNET_TYPE_LABELS[preview.type] : TYPE_LABELS[preview.type]}
          </h3>
          {preview.basketName && (
            <p className="text-sm text-portx-muted truncate">{preview.basketName}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          <QuoteQualityBadge quality={quality} />
          {[...new Set(preview.legs.map((l) => l.bestQuote.provider))].map((p) => (
            <RouteProviderBadge key={p} provider={p} size="md" />
          ))}
        </div>
      </div>

      <QuoteQualityPanel
        quality={quality}
        showLegCounts
        showProceedsDetail={isSell && !isTestnetSell}
        totalOutputUsd={preview.totalOutputUsd}
        compact
        hideBadge
      />

      {showLivePrep && (
        <div className={`rounded-xl border p-4 space-y-3 ${statusTone}`}>
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold opacity-80 mb-1">
              Wallet execution prep
            </p>
            <p className="font-bold">{execution.statusLabel}</p>
          </div>
          <p className="text-xs opacity-90">
            Live execution coming soon — review 0x router and calldata before signing (disabled in v1).
          </p>
          <div className="space-y-2">
            {execution.legs
              .filter((leg) => leg.provider === '0x')
              .slice(0, 3)
              .map((leg) => (
                <div
                  key={leg.index}
                  className="text-xs font-mono bg-black/20 rounded-lg px-3 py-2 space-y-1"
                >
                  <p>
                    {leg.inputSymbol} → {leg.outputSymbol}: router {leg.routerDisplay}
                  </p>
                  <p>
                    Calldata:{' '}
                    {leg.calldataStatus === 'available'
                      ? `${leg.calldataDisplay} · ready`
                      : leg.calldataStatus === 'demo'
                        ? 'demo placeholder'
                        : leg.calldataStatus === 'unsupported'
                          ? 'unsupported'
                          : 'missing'}
                  </p>
                </div>
              ))}
            {execution.legs.filter((l) => l.provider === '0x').length > 3 && (
              <p className="text-xs opacity-75">
                +{execution.legs.filter((l) => l.provider === '0x').length - 3} more 0x leg(s) in
                review modal
              </p>
            )}
          </div>
        </div>
      )}

      {isTestnetPreview && !isTestnetSell && (
        <div className="p-3 rounded-xl bg-portx-surface border border-portx-border text-sm space-y-1">
          <p>
            <span className="text-portx-muted">Chain: </span>
            <span className="font-mono font-semibold">Sepolia ({TESTNET_SEPOLIA_CHAIN_ID})</span>
          </p>
          <p>
            <span className="text-portx-muted">Route: </span>
            <span className="font-semibold">Uniswap V3 Sepolia ETH → basket tokens</span>
          </p>
        </div>
      )}

      {isTestnetSell && (
        <div className="p-3 rounded-xl bg-portx-surface border border-portx-border text-sm space-y-2">
          <p>
            <span className="text-portx-muted">Chain: </span>
            <span className="font-mono font-semibold">Sepolia ({TESTNET_SEPOLIA_CHAIN_ID})</span>
          </p>
          <p>
            <span className="text-portx-muted">Routes: </span>
            <span className="font-mono font-semibold">{testnetSellRoutes}</span>
          </p>
          <p>
            <span className="text-portx-muted">Tokens sold: </span>
            <span className="font-mono font-semibold">{formatTestnetSellTokenInputs(preview)}</span>
          </p>
          <p>
            <span className="text-portx-muted">Est. USDC received: </span>
            <span className="font-mono font-semibold text-portx-green">
              {formatTestnetSellUsdcOutput(preview)}
            </span>
          </p>
          {netUsdcAfterFee !== undefined ? (
            <p>
              <span className="text-portx-muted">Est. net after fee: </span>
              <span className="font-mono font-semibold text-portx-green">
                {Number.parseFloat(
                  formatUnits(netUsdcAfterFee, preview.legs[0]?.bestQuote.outputToken.decimals ?? 6),
                ).toLocaleString('en-US', { maximumFractionDigits: 6 })}{' '}
                USDC
              </span>
            </p>
          ) : null}
        </div>
      )}

      {isTestnetPreview && feeConfigState.isAvailable ? (
        <TestnetProtocolFeeSummary
          feeConfig={feeConfigState.config}
          isAvailable={feeConfigState.isAvailable}
          isLoading={feeConfigState.isLoading}
          estimatedFee={estimatedProtocolFee}
          netOutputWei={netUsdcAfterFee}
          compact
        />
      ) : null}

      {preview.type === 'buy' && (
        <div className="p-3 rounded-xl bg-portx-surface border border-portx-border text-sm">
          <span className="text-portx-muted">Input: </span>
          <span className="font-mono font-semibold text-portx-green">
            {isTestnetPreview
              ? `${formatEther(TESTNET_DEFAULT_SWAP_AMOUNT_WEI)} ETH`
              : `${formatUsd(preview.totalInputUsd)} USDC`}
          </span>
        </div>
      )}

      {(preview.type === 'sell_basket' || preview.type === 'sell_all') && !isTestnetSell && (
        <div className="p-3 rounded-xl bg-portx-surface border border-portx-border text-sm space-y-2">
          <p>
            <span className="text-portx-muted">Assets sold: </span>
            <span className="font-mono font-semibold">{soldAssetSymbols}</span>
          </p>
          <p>
            <span className="text-portx-muted">Est. proceeds: </span>
            <span className="font-mono font-semibold text-portx-green">
              {formatUsd(preview.totalOutputUsd)} USDC
            </span>
          </p>
          <p>
            <span className="text-portx-muted">Position value: </span>
            <span className="font-mono font-semibold">{formatUsd(preview.totalInputUsd)}</span>
          </p>
        </div>
      )}

      {!isTestnetSell ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Total In" value={formatUsd(preview.totalInputUsd)} />
          <Stat label="Est. Out" value={formatUsd(preview.totalOutputUsd)} highlight />
          <Stat label="Est. Gas" value={formatUsd(preview.totalGasUsd)} />
          <Stat label="Slippage" value={formatSlippage(preview.slippageBps)} warn={highSlippage} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Slippage" value={formatSlippage(preview.slippageBps)} warn={highSlippage} />
          <Stat label="Legs" value={String(preview.legs.length)} />
        </div>
      )}

      {highSlippage && (
        <ExecutionWarning
          variant="slippage"
          warnings={['High slippage tolerance — you may receive less than quoted.']}
        />
      )}

      <AllocationBreakdown legs={preview.legs} direction={direction} />

      <ExecutionWarning warnings={preview.warnings} />

      {onReview && (
        <button
          type="button"
          onClick={onReview}
          disabled={loading}
          aria-busy={loading}
          aria-disabled={loading}
          className="btn-primary w-full py-3 disabled:opacity-50"
        >
          {loading ? BUTTON_LABELS.buildingReview : reviewLabel}
        </button>
      )}

      {showLivePrep && (
        <button
          type="button"
          disabled
          title="Live wallet execution is not enabled in v1 preview"
          className="btn-secondary w-full py-3 opacity-50 cursor-not-allowed"
        >
          Execute disabled in v1 preview
        </button>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
  warn,
}: {
  label: string
  value: string
  highlight?: boolean
  warn?: boolean
}) {
  return (
    <div className="p-3 rounded-xl bg-portx-surface border border-portx-border">
      <p className="text-xs text-portx-muted mb-1">{label}</p>
      <p
        className={`font-mono font-semibold text-sm ${
          warn ? 'text-portx-warning' : highlight ? 'text-portx-green' : ''
        }`}
      >
        {value}
      </p>
    </div>
  )
}

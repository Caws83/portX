import { useCallback, useEffect, useState } from 'react'
import { TestnetPortfolioAssetTable } from '@/components/TestnetPortfolioAssetTable'
import { TestnetRebalancePreview } from '@/components/TestnetRebalancePreview'
import { AdvancedDisclosure } from '@/components/ui/AdvancedDisclosure'
import { useBasket } from '@/hooks/useBasket'
import {
  useTestnetDashboardPortfolio,
  type TestnetDashboardPortfolio,
} from '@/hooks/useTestnetDashboardPortfolio'
import { truncateAddress } from '@/utils/format'
import {
  getTestnetPortfolioAggregate,
  shouldShowTestnetPortfolio,
  TESTNET_PORTFOLIO_UPDATED_EVENT,
  type TestnetPortfolioAggregate,
  type TestnetPortfolioPosition,
} from '@/services/testnetPortfolio'
import { TESTNET_PORTFOLIO_PRICING_LABEL } from '@/services/testnetPortfolioPricing'
import { TESTNET_DASHBOARD } from '@/config/testnetUxCopy'

interface TestnetPortfolioSummaryProps {
  className?: string
  compact?: boolean
  /** When true, hides hero metrics already shown on Dashboard */
  embeddedInDashboard?: boolean
  /** Optional shared dashboard portfolio state from parent */
  portfolio?: TestnetDashboardPortfolio
}

function formatEthTotal(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 8 })
}

function formatUsdcTotal(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 6 })
}

function formatUsdcDifference(value: number): string {
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toLocaleString('en-US', { maximumFractionDigits: 6 })}`
}

function formatPositionDirection(position: TestnetPortfolioPosition): 'Buy' | 'Sell' {
  return position.planType === 'sell_basket' ? 'Sell' : 'Buy'
}

function formatPositionSummary(position: TestnetPortfolioPosition): string {
  if (position.planType === 'sell_basket') {
    const sold =
      position.soldAssets?.map((asset) => `${formatUsdcTotal(parseFloat(asset.amount))} ${asset.symbol}`).join(' · ') ??
      position.inputAmountEth
    const usdc = formatUsdcTotal(parseFloat(position.outputAmountUsdc))
    return `Sold ${sold} → ${usdc} USDC`
  }

  if (position.acquiredAssets.length > 1) {
    return position.acquiredAssets
      .map((asset) => `${formatUsdcTotal(parseFloat(asset.amount))} ${asset.symbol}`)
      .join(' · ')
  }

  return `${formatUsdcTotal(parseFloat(position.outputAmountUsdc))} USDC`
}

export function TestnetPortfolioSummary({
  className = '',
  compact = false,
  embeddedInDashboard = false,
  portfolio: portfolioProp,
}: TestnetPortfolioSummaryProps) {
  const internalPortfolio = useTestnetDashboardPortfolio()
  const portfolio = portfolioProp ?? internalPortfolio
  const { allBaskets } = useBasket()
  const [aggregate, setAggregate] = useState<TestnetPortfolioAggregate>(() =>
    portfolio.aggregate ?? getTestnetPortfolioAggregate(),
  )

  const onChainBalances = portfolio.balances
  const latest = portfolio.latestExecution ?? aggregate.latestPosition

  const refreshAggregate = useCallback(() => {
    setAggregate(getTestnetPortfolioAggregate())
  }, [])

  useEffect(() => {
    setAggregate(portfolio.aggregate)
  }, [portfolio.aggregate])

  useEffect(() => {
    refreshAggregate()
    const handleUpdate = () => refreshAggregate()
    window.addEventListener(TESTNET_PORTFOLIO_UPDATED_EVENT, handleUpdate)
    return () => window.removeEventListener(TESTNET_PORTFOLIO_UPDATED_EVENT, handleUpdate)
  }, [refreshAggregate])

  if (!shouldShowTestnetPortfolio()) {
    return null
  }

  return (
    <div className={`card space-y-4 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">{TESTNET_DASHBOARD.portfolioSectionTitle}</h2>
          <p className="text-xs text-portx-muted mt-1">
            {TESTNET_DASHBOARD.portfolioSectionDescription}
          </p>
        </div>
        <button
          type="button"
          onClick={portfolio.refresh}
          disabled={onChainBalances.isFetching}
          className="btn-secondary text-sm py-2 px-3"
        >
          {onChainBalances.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <p className="text-xs text-portx-muted">
        Wallet:{' '}
        <span className="font-mono">
          {onChainBalances.walletAddress
            ? truncateAddress(onChainBalances.walletAddress, 6)
            : 'Connect wallet'}
        </span>
      </p>

      {!onChainBalances.walletAddress ? (
        <p className="text-sm text-portx-muted">Connect your Sepolia wallet to view on-chain assets.</p>
      ) : onChainBalances.isLoading ? (
        <p className="text-sm text-portx-muted">Loading on-chain wallet assets…</p>
      ) : onChainBalances.error ? (
        <p className="text-sm text-red-400">
          Failed to load on-chain balances: {onChainBalances.error.message}
        </p>
      ) : null}

      {!embeddedInDashboard && !onChainBalances.isLoading && !onChainBalances.error && onChainBalances.walletAddress ? (
        <>
          <div className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-b from-zinc-800/40 via-zinc-900/50 to-zinc-950/60 p-4 sm:p-6 shadow-[0_0_50px_-12px_rgba(16,185,129,0.18)]">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl"
            />
            <p className="relative text-xs font-medium text-zinc-400">{TESTNET_DASHBOARD.totalValueLabel}</p>
            <p className="relative text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums text-portx-green mt-2">
              {portfolio.totalValueDisplay}
            </p>
            <p className="relative text-xs text-zinc-500 mt-2">
              {TESTNET_PORTFOLIO_PRICING_LABEL} · {TESTNET_DASHBOARD.testnetEstimateNote}
            </p>
          </div>

          <div
            className={`grid gap-3 ${
              compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
            }`}
          >
            <Stat
              label="Total testnet estimate"
              value={portfolio.totalValueDisplay}
              highlight
            />
            <Stat
              label="Largest asset"
              value={
                portfolio.largestAssetSymbol
                  ? `${portfolio.largestAssetSymbol} (${portfolio.largestAssetValueDisplay ?? '—'})`
                  : '—'
              }
            />
            <Stat label="On-chain positions" value={String(portfolio.assetCount)} />
            <Stat
              label="Last refreshed"
              value={
                onChainBalances.lastRefreshedAt
                  ? new Date(onChainBalances.lastRefreshedAt).toLocaleString()
                  : '—'
              }
            />
          </div>
        </>
      ) : null}

      {latest ? (
        <div className="rounded-xl border border-portx-border bg-portx-surface p-3 text-sm space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">
            Latest execution
          </p>
          <p>
            <span className="text-portx-muted">Direction: </span>
            <span
              className={`font-semibold ${
                latest.planType === 'sell_basket' ? 'text-portx-warning' : 'text-portx-green'
              }`}
            >
              {formatPositionDirection(latest)}
            </span>
          </p>
          <p>
            <span className="text-portx-muted">Basket: </span>
            <span className="font-medium">{latest.basketLabel}</span>
          </p>
          {latest.planType === 'sell_basket' && latest.soldAssets?.length ? (
            <p>
              <span className="text-portx-muted">Sold: </span>
              <span className="font-mono">
                {latest.soldAssets
                  .map((asset) => `${formatUsdcTotal(parseFloat(asset.amount))} ${asset.symbol}`)
                  .join(' · ')}
              </span>
            </p>
          ) : null}
          <p>
            <span className="text-portx-muted">
              {latest.planType === 'sell_basket' ? 'USDC received: ' : 'Acquired: '}
            </span>
            <span className="font-mono text-portx-green">
              {latest.planType === 'sell_basket'
                ? `${formatUsdcTotal(parseFloat(latest.outputAmountUsdc))} USDC`
                : latest.acquiredAssets
                    .map((asset) => `${formatUsdcTotal(parseFloat(asset.amount))} ${asset.symbol}`)
                    .join(' · ')}
            </span>
            {latest.planType !== 'sell_basket' ? (
              <>
                <span className="text-portx-muted"> · </span>
                <span className="font-mono">{formatEthTotal(parseFloat(latest.inputAmountEth))} ETH in</span>
              </>
            ) : null}
          </p>
          <p className="text-xs text-portx-muted">
            {latest.legsCount} leg(s) · {latest.provider} ·{' '}
            {new Date(latest.timestamp).toLocaleString()}
          </p>
          <a
            href={latest.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-portx-green underline text-sm"
          >
            View latest on Sepolia Etherscan
          </a>
        </div>
      ) : (
        <p className="text-sm text-portx-muted">
          No Sepolia trades recorded yet. Completed trades from Review Trade will appear here.
        </p>
      )}

      {!onChainBalances.isLoading && !onChainBalances.error && onChainBalances.walletAddress ? (
        <>
          <TestnetPortfolioAssetTable balances={onChainBalances} />

          <TestnetRebalancePreview
            balances={onChainBalances}
            latestPosition={latest}
            baskets={allBaskets}
            compact={compact}
          />
        </>
      ) : null}

      <AdvancedDisclosure title="Advanced · local tracking & sync">
        <div
          className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}
        >
          <Stat
            label="Total USDC received (local)"
            value={`${formatUsdcTotal(aggregate.totalUsdcReceived)} USDC`}
          />
          <Stat label="Total ETH spent (local)" value={`${formatEthTotal(aggregate.totalEthSpent)} ETH`} />
          <Stat label="Executed baskets (local)" value={String(aggregate.executedBaskets)} />
          <Stat
            label="Latest tx"
            value={latest ? truncateAddress(latest.txHash, 6) : '—'}
          />
        </div>

        {!onChainBalances.isLoading && !onChainBalances.error && onChainBalances.walletAddress ? (
          <div className="rounded-xl border border-portx-border bg-portx-surface p-3 text-sm space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">
              Local tracked vs on-chain USDC
            </p>
            <p>
              <span className="text-portx-muted">Tracked (local): </span>
              <span className="font-mono">{formatUsdcTotal(onChainBalances.localTrackedUsdc)} USDC</span>
            </p>
            <p>
              <span className="text-portx-muted">On-chain: </span>
              <span className="font-mono text-portx-green">
                {onChainBalances.usdcBalanceFormatted} USDC
              </span>
            </p>
            <p>
              <span className="text-portx-muted">Difference (tracked − on-chain): </span>
              <span
                className={`font-mono ${
                  onChainBalances.usdcDifference === 0
                    ? ''
                    : onChainBalances.usdcDifference > 0
                      ? 'text-amber-400'
                      : 'text-portx-green'
                }`}
              >
                {formatUsdcDifference(onChainBalances.usdcDifference)} USDC
              </span>
            </p>
            <p className="text-xs text-portx-muted">
              Local totals reflect browser history from completed testnet trades. Multi-token buys
              record acquired tokens, not USDC — tracked USDC mainly reflects sells.
            </p>
          </div>
        ) : null}

        {aggregate.positions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">
              Execution history ({Math.min(aggregate.positions.length, 5)})
            </p>
            <ul className="space-y-2">
              {aggregate.positions.slice(0, 5).map((position) => (
                <li
                  key={position.portfolioId}
                  className="rounded-lg border border-portx-border bg-black/20 px-3 py-2 text-xs space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium truncate">{position.basketLabel}</span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wide ${
                        position.planType === 'sell_basket' ? 'text-portx-warning' : 'text-portx-green'
                      }`}
                    >
                      {formatPositionDirection(position)}
                    </span>
                  </div>
                  <p className="font-mono text-portx-green">{formatPositionSummary(position)}</p>
                  <p className="text-portx-muted">
                    {new Date(position.timestamp).toLocaleString()} ·{' '}
                    {truncateAddress(position.txHash, 6)}
                  </p>
                  <a
                    href={position.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-portx-green underline"
                  >
                    View tx
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </AdvancedDisclosure>
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p
        className={`font-semibold text-sm tracking-tight tabular-nums ${
          highlight ? 'text-portx-green' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

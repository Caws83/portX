import { useCallback, useEffect, useState } from 'react'
import { TestnetPortfolioAssetTable } from '@/components/TestnetPortfolioAssetTable'
import { useTestnetPortfolioBalances } from '@/hooks/useTestnetPortfolioBalances'
import { truncateAddress } from '@/utils/format'
import {
  getTestnetPortfolioAggregate,
  shouldShowTestnetPortfolio,
  TESTNET_PORTFOLIO_UPDATED_EVENT,
  type TestnetPortfolioAggregate,
} from '@/services/testnetPortfolio'
import { TESTNET_PORTFOLIO_PRICING_LABEL } from '@/services/testnetPortfolioPricing'

interface TestnetPortfolioSummaryProps {
  className?: string
  compact?: boolean
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

export function TestnetPortfolioSummary({
  className = '',
  compact = false,
}: TestnetPortfolioSummaryProps) {
  const [aggregate, setAggregate] = useState<TestnetPortfolioAggregate>(() =>
    getTestnetPortfolioAggregate(),
  )
  const onChainBalances = useTestnetPortfolioBalances()

  const refresh = useCallback(() => {
    setAggregate(getTestnetPortfolioAggregate())
  }, [])

  useEffect(() => {
    refresh()
    const handleUpdate = () => refresh()
    window.addEventListener(TESTNET_PORTFOLIO_UPDATED_EVENT, handleUpdate)
    return () => window.removeEventListener(TESTNET_PORTFOLIO_UPDATED_EVENT, handleUpdate)
  }, [refresh])

  if (!shouldShowTestnetPortfolio()) {
    return null
  }

  const latest = aggregate.latestPosition

  return (
    <div className={`card space-y-4 ${className}`}>
      <div>
        <h2 className="font-bold">Testnet Portfolio</h2>
        <p className="text-xs text-portx-muted mt-1">
          Local browser tracking only — not real wallet balances or production portfolio data.
        </p>
      </div>

      <div
        className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}
      >
        <Stat
          label="Total USDC received"
          value={`${formatUsdcTotal(aggregate.totalUsdcReceived)} USDC`}
          highlight
        />
        <Stat label="Total ETH spent" value={`${formatEthTotal(aggregate.totalEthSpent)} ETH`} />
        <Stat label="Executed baskets" value={String(aggregate.executedBaskets)} />
        {!compact ? (
          <Stat
            label="Latest tx"
            value={latest ? truncateAddress(latest.txHash, 6) : '—'}
          />
        ) : null}
      </div>

      {latest ? (
        <div className="rounded-xl border border-portx-border bg-portx-surface p-3 text-sm space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">
            Latest execution
          </p>
          <p>
            <span className="text-portx-muted">Basket: </span>
            <span className="font-medium">{latest.basketLabel}</span>
          </p>
          <p>
            <span className="text-portx-muted">Received: </span>
            <span className="font-mono text-portx-green">
              {formatUsdcTotal(parseFloat(latest.outputAmountUsdc))} USDC
            </span>
            <span className="text-portx-muted"> · </span>
            <span className="font-mono">{formatEthTotal(parseFloat(latest.inputAmountEth))} ETH in</span>
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
          No testnet basket executions recorded yet. Successful Sepolia swaps from Review &amp;
          Execute will appear here.
        </p>
      )}

      {!compact && aggregate.positions.length > 1 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">
            Recent positions ({Math.min(aggregate.positions.length, 5)})
          </p>
          <ul className="space-y-2">
            {aggregate.positions.slice(0, 5).map((position) => (
              <li
                key={position.portfolioId}
                className="rounded-lg border border-portx-border bg-black/20 px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2"
              >
                <span className="font-medium truncate">{position.basketLabel}</span>
                <span className="font-mono text-portx-green">
                  {formatUsdcTotal(parseFloat(position.outputAmountUsdc))} USDC
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="border-t border-portx-border pt-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold">On-Chain Testnet Assets</h3>
            <p className="text-xs text-portx-muted mt-1">
              Read-only Sepolia ERC-20 balances held by BundleExecutor.
            </p>
          </div>
          <button
            type="button"
            onClick={onChainBalances.refresh}
            disabled={onChainBalances.isFetching}
            className="btn-secondary text-sm py-2 px-3"
          >
            {onChainBalances.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <p className="text-xs text-portx-muted">
          BundleExecutor:{' '}
          <span className="font-mono">
            {truncateAddress(onChainBalances.bundleExecutorAddress, 6)}
          </span>
        </p>

        {onChainBalances.isLoading ? (
          <p className="text-sm text-portx-muted">Loading on-chain balances…</p>
        ) : onChainBalances.error ? (
          <p className="text-sm text-red-400">
            Failed to load on-chain balances: {onChainBalances.error.message}
          </p>
        ) : (
          <div
            className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}
          >
            <Stat
              label="On-chain USDC"
              value={`${onChainBalances.usdcBalanceFormatted} USDC`}
              highlight
            />
            <Stat
              label="On-chain WETH"
              value={`${onChainBalances.wethBalanceFormatted} WETH`}
            />
            {!compact ? (
              <Stat
                label="USDC difference"
                value={`${formatUsdcDifference(onChainBalances.usdcDifference)} USDC`}
              />
            ) : null}
          </div>
        )}

        {!onChainBalances.isLoading && !onChainBalances.error ? (
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
          </div>
        ) : null}

        {!onChainBalances.isLoading && !onChainBalances.error ? (
          <>
            <div className="rounded-2xl border border-portx-green/30 bg-gradient-to-br from-portx-green/10 to-portx-blue/5 p-4 sm:p-6">
              <p className="text-sm font-bold">Estimated Portfolio Value</p>
              <p className="text-3xl sm:text-4xl font-bold font-mono text-portx-green mt-2">
                {onChainBalances.valuation.totalEstimatedValueDisplay}
              </p>
              <p className="text-xs text-portx-muted mt-2">
                {TESTNET_PORTFOLIO_PRICING_LABEL} · Testnet estimate only
              </p>
            </div>

            <div
              className={`grid gap-3 ${
                compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
              }`}
            >
              <Stat
                label="Total estimated value"
                value={onChainBalances.valuation.totalEstimatedValueDisplay}
                highlight
              />
              <Stat
                label="Largest asset"
                value={
                  onChainBalances.valuation.largestAssetSymbol
                    ? `${onChainBalances.valuation.largestAssetSymbol} (${onChainBalances.valuation.largestAssetValueDisplay})`
                    : '—'
                }
              />
              <Stat
                label="Asset count"
                value={String(onChainBalances.valuation.assetCount)}
              />
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

        <TestnetPortfolioAssetTable balances={onChainBalances} />
      </div>
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
    <div className="rounded-xl border border-portx-border bg-portx-surface p-3">
      <p className="text-xs text-portx-muted mb-1">{label}</p>
      <p
        className={`font-mono font-semibold text-sm ${
          highlight ? 'text-portx-green' : ''
        }`}
      >
        {value}
      </p>
    </div>
  )
}

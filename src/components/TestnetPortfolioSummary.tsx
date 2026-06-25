import { useCallback, useEffect, useState } from 'react'
import { TestnetPortfolioAssetTable } from '@/components/TestnetPortfolioAssetTable'
import { TestnetRebalancePreview } from '@/components/TestnetRebalancePreview'
import { useBasket } from '@/hooks/useBasket'
import { useTestnetPortfolioBalances } from '@/hooks/useTestnetPortfolioBalances'
import { truncateAddress } from '@/utils/format'
import {
  getTestnetPortfolioAggregate,
  shouldShowTestnetPortfolio,
  TESTNET_PORTFOLIO_UPDATED_EVENT,
  type TestnetPortfolioAggregate,
  type TestnetPortfolioPosition,
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
}: TestnetPortfolioSummaryProps) {
  const [aggregate, setAggregate] = useState<TestnetPortfolioAggregate>(() =>
    getTestnetPortfolioAggregate(),
  )
  const onChainBalances = useTestnetPortfolioBalances()
  const { allBaskets } = useBasket()

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
              {latest.planType === 'sell_basket' ? 'USDC received: ' : 'Received: '}
            </span>
            <span className="font-mono text-portx-green">
              {formatUsdcTotal(parseFloat(latest.outputAmountUsdc))} USDC
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
          No testnet basket executions recorded yet. Successful Sepolia swaps from Review &amp;
          Execute will appear here.
        </p>
      )}

      {!compact && aggregate.positions.length > 0 ? (
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

      <div className="border-t border-portx-border pt-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold">Wallet Testnet Assets</h3>
            <p className="text-xs text-portx-muted mt-1">
              Read-only Sepolia ERC-20 balances in your connected wallet.
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
          Wallet:{' '}
          <span className="font-mono">
            {onChainBalances.walletAddress
              ? truncateAddress(onChainBalances.walletAddress, 6)
              : 'Connect wallet'}
          </span>
        </p>

        {!onChainBalances.walletAddress ? (
          <p className="text-sm text-portx-muted">Connect your Sepolia wallet to view on-chain balances.</p>
        ) : onChainBalances.isLoading ? (
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
            <div className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-b from-zinc-800/40 via-zinc-900/50 to-zinc-950/60 p-4 sm:p-6 shadow-[0_0_50px_-12px_rgba(16,185,129,0.18)]">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl"
              />
              <p className="relative text-xs font-medium text-zinc-400">Estimated Portfolio Value</p>
              <p className="relative text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums text-portx-green mt-2">
                {onChainBalances.valuation.totalEstimatedValueDisplay}
              </p>
              <p className="relative text-xs text-zinc-500 mt-2">
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

        <TestnetRebalancePreview
          balances={onChainBalances}
          latestPosition={latest}
          baskets={allBaskets}
          compact={compact}
        />
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

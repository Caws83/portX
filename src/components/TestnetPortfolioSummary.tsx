import { useCallback, useEffect, useState } from 'react'
import { truncateAddress } from '@/utils/format'
import {
  getTestnetPortfolioAggregate,
  shouldShowTestnetPortfolio,
  TESTNET_PORTFOLIO_UPDATED_EVENT,
  type TestnetPortfolioAggregate,
} from '@/services/testnetPortfolio'

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

export function TestnetPortfolioSummary({
  className = '',
  compact = false,
}: TestnetPortfolioSummaryProps) {
  const [aggregate, setAggregate] = useState<TestnetPortfolioAggregate>(() =>
    getTestnetPortfolioAggregate(),
  )

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
